package expo.modules.sentenceaudio

import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * WAV(PCM) 끝에 무음을 붙여 새 파일로 쓴다. 문장 사이 간격을 파일에 넣는 이유는 docs/PLAYER_SYSTEM.md §3.
 * WAV 가 아니거나 해석할 수 없으면 원본을 그대로 복사한다(간격 0).
 */
object WavPadder {
  fun pad(src: File, dst: File, gapMs: Int) {
    val bytes = src.readBytes()
    val parsed = parse(bytes)
    if (parsed == null || gapMs <= 0) {
      if (src.absolutePath != dst.absolutePath) src.copyTo(dst, overwrite = true)
      return
    }
    val (channels, sampleRate, bitsPerSample, dataOffset, dataSize) = parsed
    val blockAlign = channels * (bitsPerSample / 8)
    val silenceFrames = (sampleRate.toLong() * gapMs / 1000L).toInt()
    val silence = silenceFrames * blockAlign
    val totalData = dataSize + silence

    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray())
    header.putInt(36 + totalData)
    header.put("WAVE".toByteArray())
    header.put("fmt ".toByteArray())
    header.putInt(16)
    header.putShort(1) // PCM
    header.putShort(channels.toShort())
    header.putInt(sampleRate)
    header.putInt(sampleRate * blockAlign)
    header.putShort(blockAlign.toShort())
    header.putShort(bitsPerSample.toShort())
    header.put("data".toByteArray())
    header.putInt(totalData)

    val tmp = File(dst.absolutePath + ".tmp")
    RandomAccessFile(tmp, "rw").use { out ->
      out.setLength(0)
      out.write(header.array())
      out.write(bytes, dataOffset, dataSize)
      out.write(ByteArray(silence))
    }
    if (!tmp.renameTo(dst)) {
      tmp.copyTo(dst, overwrite = true)
      tmp.delete()
    }
  }

  private data class Info(
    val channels: Int,
    val sampleRate: Int,
    val bitsPerSample: Int,
    val dataOffset: Int,
    val dataSize: Int
  )

  private fun parse(bytes: ByteArray): Info? {
    if (bytes.size < 12) return null
    if (String(bytes, 0, 4) != "RIFF" || String(bytes, 8, 4) != "WAVE") return null
    val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    var pos = 12
    var channels = 0
    var sampleRate = 0
    var bits = 0
    var format = 0
    while (pos + 8 <= bytes.size) {
      val id = String(bytes, pos, 4)
      val size = buf.getInt(pos + 4)
      val body = pos + 8
      if (id == "fmt " && body + 16 <= bytes.size) {
        format = buf.getShort(body).toInt()
        channels = buf.getShort(body + 2).toInt()
        sampleRate = buf.getInt(body + 4)
        bits = buf.getShort(body + 14).toInt()
      } else if (id == "data") {
        if (format != 1 || channels <= 0 || sampleRate <= 0 || bits <= 0) return null
        val remaining = bytes.size - body
        // 스트리밍으로 쓴 파일은 크기 칸이 0 이거나 틀릴 수 있다 → 남은 바이트를 믿는다
        val dataSize = if (size <= 0 || size > remaining) remaining else size
        return Info(channels, sampleRate, bits, body, dataSize)
      }
      if (size < 0) return null
      pos = body + size + (size and 1)
    }
    return null
  }
}
