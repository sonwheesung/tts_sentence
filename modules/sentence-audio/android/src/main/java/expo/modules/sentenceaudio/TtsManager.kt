package expo.modules.sentenceaudio

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import java.io.File
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * 기기 내장 TTS 엔진 관리. 엔진마다 TextToSpeech 인스턴스를 하나씩 두고 재사용한다 (docs/TTS_SYSTEM.md §2·§3).
 * 인스턴스 생성·초기화 콜백은 메인 스레드에서 다룬다.
 */
class TtsManager(private val context: Context) {
  private class Holder {
    var tts: TextToSpeech? = null
    var ready = false
    var failed = false
    val waiters = mutableListOf<(TextToSpeech?) -> Unit>()
  }

  private val main = Handler(Looper.getMainLooper())
  private val holders = HashMap<String, Holder>()
  private val pending = ConcurrentHashMap<String, (String?) -> Unit>()

  private val progressListener = object : UtteranceProgressListener() {
    override fun onStart(utteranceId: String?) {}

    override fun onDone(utteranceId: String?) {
      utteranceId?.let { pending.remove(it)?.invoke(null) }
    }

    @Deprecated("Deprecated in Java")
    override fun onError(utteranceId: String?) {
      utteranceId?.let { pending.remove(it)?.invoke("synthesis failed") }
    }

    override fun onError(utteranceId: String?, errorCode: Int) {
      utteranceId?.let { pending.remove(it)?.invoke("synthesis failed ($errorCode)") }
    }
  }

  /** engine 이 null 이면 기기 기본 엔진. 초기화가 끝나면 cb 를 메인 스레드에서 부른다(실패 시 null). */
  fun withTts(engine: String?, cb: (TextToSpeech?) -> Unit) {
    main.post {
      val key = engine ?: ""
      val holder = holders.getOrPut(key) { Holder() }
      when {
        holder.ready -> cb(holder.tts)
        holder.failed -> cb(null)
        else -> {
          holder.waiters.add(cb)
          if (holder.tts == null) {
            val listener = TextToSpeech.OnInitListener { status ->
              main.post {
                if (status == TextToSpeech.SUCCESS) {
                  holder.ready = true
                  holder.tts?.setOnUtteranceProgressListener(progressListener)
                } else {
                  holder.failed = true
                  holders.remove(key)
                }
                val result = if (holder.ready) holder.tts else null
                holder.waiters.toList().forEach { it(result) }
                holder.waiters.clear()
              }
            }
            holder.tts = if (engine == null) {
              TextToSpeech(context, listener)
            } else {
              TextToSpeech(context, listener, engine)
            }
          }
        }
      }
    }
  }

  fun engines(cb: (List<Map<String, Any?>>, String?) -> Unit) {
    withTts(null) { tts ->
      if (tts == null) {
        cb(emptyList(), null)
        return@withTts
      }
      val list = tts.engines.map { mapOf("name" to it.name, "label" to it.label) }
      cb(list, tts.defaultEngine)
    }
  }

  fun voices(engine: String?, cb: (List<Map<String, Any?>>?) -> Unit) {
    withTts(engine) { tts ->
      if (tts == null) {
        cb(null)
        return@withTts
      }
      val voices = try {
        tts.voices ?: emptySet()
      } catch (e: Exception) {
        emptySet<Voice>()
      }
      val usable = voices.filter { v ->
        !v.isNetworkConnectionRequired &&
          !v.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
      }
      val sorted = usable.sortedWith(
        compareBy<Voice>({ if (it.locale.language == "ko") 0 else 1 }, { it.locale.toLanguageTag() }, { it.name })
      )
      val defaultName = try {
        tts.defaultVoice?.name
      } catch (e: Exception) {
        null
      }
      cb(
        sorted.map {
          mapOf(
            "name" to it.name,
            "locale" to it.locale.toLanguageTag(),
            "language" to it.locale.language,
            "quality" to it.quality,
            "isDefault" to (it.name == defaultName)
          )
        }
      )
    }
  }

  /** outFile 에 WAV 로 합성한다. 끝나면 cb(null), 실패하면 cb(메시지). */
  fun synthesize(
    text: String,
    engine: String?,
    voice: String?,
    rate: Float,
    pitch: Float,
    outFile: File,
    cb: (String?) -> Unit
  ) {
    withTts(engine) { tts ->
      if (tts == null) {
        cb("tts engine unavailable")
        return@withTts
      }
      val chosen = voice?.let { name ->
        try {
          tts.voices?.firstOrNull { it.name == name }
        } catch (e: Exception) {
          null
        }
      }
      // 인스턴스를 여러 프리셋이 나눠 쓰므로 매번 목소리를 다시 지정한다.
      // 이 기기에 없는 목소리면 엔진 기본 목소리로 읽는다 (CLAUDE.md §8)
      val target = chosen ?: try {
        tts.defaultVoice
      } catch (e: Exception) {
        null
      }
      if (target != null) tts.voice = target
      tts.setSpeechRate(rate)
      tts.setPitch(pitch)

      outFile.parentFile?.mkdirs()
      val id = UUID.randomUUID().toString()
      pending[id] = cb
      val result = tts.synthesizeToFile(text, Bundle(), outFile, id)
      if (result != TextToSpeech.SUCCESS) {
        pending.remove(id)?.invoke("synthesizeToFile rejected")
      }
    }
  }

  fun release() {
    main.post {
      holders.values.forEach { it.tts?.shutdown() }
      holders.clear()
    }
  }
}
