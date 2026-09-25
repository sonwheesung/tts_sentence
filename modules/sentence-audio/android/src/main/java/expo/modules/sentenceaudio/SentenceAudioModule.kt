package expo.modules.sentenceaudio

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File

class QueueItemRecord : Record {
  @Field var id: String = ""
  @Field var uri: String = ""
  @Field var title: String = ""
  @Field var subtitle: String = ""
}

class QueueOptionsRecord : Record {
  @Field var repeat: Int = 1
  @Field var shuffle: Boolean = false
  @Field var speed: Double = 1.0
  @Field var complete: Boolean = true
}

class SentenceAudioModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var tts: TtsManager? = null
  private var controllerFuture: ListenableFuture<MediaController>? = null

  private fun ttsManager(): TtsManager = tts ?: TtsManager(context.applicationContext).also { tts = it }

  private fun fileOf(uri: String): File {
    val path = if (uri.startsWith("file:")) Uri.parse(uri).path else uri
    return File(path ?: uri)
  }

  /** 세션 서비스에 컨트롤러를 붙여 서비스를 띄운다. 포그라운드 전환은 Media3 가 재생 시작 때 한다 */
  private fun ensureService() {
    if (controllerFuture != null) return
    val ctx = context.applicationContext
    val token = SessionToken(ctx, ComponentName(ctx, PlaybackService::class.java))
    controllerFuture = MediaController.Builder(ctx, token).buildAsync()
  }

  private fun toItems(records: List<QueueItemRecord>) =
    records.map { QueueItem(it.id, it.uri, it.title, it.subtitle) }

  override fun definition() = ModuleDefinition {
    Name("SentenceAudio")

    Events("onPlayerState")

    OnCreate {
      PlayerHolder.onState = { sendEvent("onPlayerState", PlayerHolder.state()) }
    }

    OnDestroy {
      PlayerHolder.onState = null
      controllerFuture?.let { MediaController.releaseFuture(it) }
      controllerFuture = null
      tts?.release()
      tts = null
    }

    // ── TTS (docs/TTS_SYSTEM.md) ──

    AsyncFunction("getEngines") { promise: Promise ->
      ttsManager().engines { list, defaultEngine ->
        promise.resolve(mapOf("engines" to list, "defaultEngine" to defaultEngine))
      }
    }

    AsyncFunction("getVoices") { engine: String?, promise: Promise ->
      ttsManager().voices(engine) { list ->
        if (list == null) {
          promise.reject("E_TTS_INIT", "TTS engine could not be initialized", null)
        } else {
          promise.resolve(list)
        }
      }
    }

    AsyncFunction("synthesize") {
        text: String, engine: String?, voice: String?, rate: Double, pitch: Double, outUri: String, promise: Promise ->
      val out = fileOf(outUri)
      ttsManager().synthesize(text, engine, voice, rate.toFloat(), pitch.toFloat(), out) { error ->
        if (error == null && out.exists() && out.length() > 44) {
          promise.resolve(null)
        } else {
          out.delete()
          promise.reject("E_TTS_SYNTH", error ?: "empty output", null)
        }
      }
    }

    AsyncFunction("padSilence") { srcUri: String, dstUri: String, gapMs: Int ->
      WavPadder.pad(fileOf(srcUri), fileOf(dstUri), gapMs)
    }

    // ── 재생 (docs/PLAYER_SYSTEM.md) ── ExoPlayer 는 메인 스레드에서만 만진다

    AsyncFunction("setQueue") { items: List<QueueItemRecord>, startIndex: Int, options: QueueOptionsRecord ->
      ensureService()
      PlayerHolder.setQueue(
        context,
        toItems(items),
        startIndex,
        options.complete,
        options.repeat,
        options.shuffle,
        options.speed.toFloat()
      )
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("appendItems") { items: List<QueueItemRecord> ->
      PlayerHolder.append(toItems(items))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("insertItems") { index: Int, items: List<QueueItemRecord> ->
      PlayerHolder.insert(index, toItems(items))
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("markQueueComplete") { PlayerHolder.markComplete() }.runOnQueue(Queues.MAIN)

    AsyncFunction("play") {
      ensureService()
      PlayerHolder.play()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("pause") { PlayerHolder.pause() }.runOnQueue(Queues.MAIN)
    AsyncFunction("next") { PlayerHolder.next() }.runOnQueue(Queues.MAIN)
    AsyncFunction("previous") { PlayerHolder.previous() }.runOnQueue(Queues.MAIN)
    AsyncFunction("seekToIndex") { index: Int -> PlayerHolder.seekToIndex(index) }.runOnQueue(Queues.MAIN)
    AsyncFunction("seekToItem") { id: String -> PlayerHolder.seekToItem(id) }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") { PlayerHolder.stop() }.runOnQueue(Queues.MAIN)
    AsyncFunction("setRepeat") { n: Int -> PlayerHolder.setRepeat(n) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setShuffle") { on: Boolean -> PlayerHolder.setShuffle(on) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setSpeed") { x: Double -> PlayerHolder.setSpeed(x.toFloat()) }.runOnQueue(Queues.MAIN)
    AsyncFunction("setSleepTimer") { ms: Double, endOfLoop: Boolean ->
      PlayerHolder.setSleepTimer(ms.toLong(), endOfLoop)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("getState") { PlayerHolder.state() }.runOnQueue(Queues.MAIN)
  }
}
