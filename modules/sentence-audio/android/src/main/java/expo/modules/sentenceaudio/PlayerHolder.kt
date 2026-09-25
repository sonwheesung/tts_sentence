package expo.modules.sentenceaudio

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ShuffleOrder
import kotlin.random.Random

data class QueueItem(val id: String, val uri: String, val title: String, val subtitle: String)

/**
 * 앱 프로세스에 하나뿐인 플레이어와 대기열 규칙(반복 횟수 · 셔플 · 슬립 타이머).
 * 모든 메서드는 메인 스레드에서 부른다. 규칙의 정본은 docs/PLAYER_SYSTEM.md.
 */
object PlayerHolder {
  private var exo: ExoPlayer? = null
  private val main = Handler(Looper.getMainLooper())

  /** 0 = 무한 */
  var repeat = 1
    private set
  var shuffle = false
    private set
  var speed = 1f
    private set

  /** 끝난 바퀴 수 */
  var loop = 0
    private set

  /** 점진 합성이 끝나 대기열이 다 찼는가 (PLAYER_SYSTEM.md §4) */
  var complete = true
    private set
  var ended = false
    private set

  /** 사용자가 재생을 원하는 상태(점진 합성 중 끝에 닿았을 때 이어 붙이면 계속 재생한다) */
  private var wantPlay = false

  var sleepAt = 0L
    private set
  var sleepEndOfLoop = false
    private set
  private val sleepRunnable = Runnable {
    sleepAt = 0L
    exo?.pause()
    wantPlay = false
    notifyState()
  }

  var onState: (() -> Unit)? = null

  fun player(context: Context): ExoPlayer {
    exo?.let { return it }
    val attrs = AudioAttributes.Builder()
      .setUsage(C.USAGE_MEDIA)
      .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
      .build()
    val p = ExoPlayer.Builder(context.applicationContext)
      .setAudioAttributes(attrs, true)
      .setHandleAudioBecomingNoisy(true)
      .setWakeMode(C.WAKE_MODE_LOCAL)
      .build()
    p.addListener(listener)
    exo = p
    return p
  }

  fun existing(): ExoPlayer? = exo

  private val listener = object : Player.Listener {
    override fun onPositionDiscontinuity(
      oldPosition: Player.PositionInfo,
      newPosition: Player.PositionInfo,
      reason: Int
    ) {
      val p = exo ?: return
      if (reason != Player.DISCONTINUITY_REASON_AUTO_TRANSITION) return
      val tl = p.currentTimeline
      if (tl.isEmpty) return
      val first = tl.getFirstWindowIndex(p.shuffleModeEnabled)
      val last = tl.getLastWindowIndex(p.shuffleModeEnabled)
      // 마지막 → 첫 항목 자동 전환 = 한 바퀴 끝. 사용자의 [다음] 은 SEEK 라서 여기 안 온다
      if (oldPosition.mediaItemIndex == last && newPosition.mediaItemIndex == first) {
        loop += 1
        if (p.shuffleModeEnabled && p.mediaItemCount > 1) {
          p.setShuffleOrder(ShuffleOrder.DefaultShuffleOrder(p.mediaItemCount, Random.nextLong()))
        }
        applyRepeatMode()
      }
      notifyState()
    }

    override fun onPlaybackStateChanged(playbackState: Int) {
      val p = exo ?: return
      if (playbackState == Player.STATE_ENDED) {
        if (complete) {
          // 정해진 횟수를 다 돌았거나 "이번 바퀴 끝나면" 타이머 → 처음으로 되돌리고 멈춘다
          if (sleepEndOfLoop) clearSleep()
          ended = true
          wantPlay = false
          p.playWhenReady = false
          val tl = p.currentTimeline
          if (!tl.isEmpty) p.seekTo(tl.getFirstWindowIndex(p.shuffleModeEnabled), 0)
        }
      }
      notifyState()
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) = notifyState()

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) = notifyState()
  }

  private fun toMediaItem(item: QueueItem): MediaItem =
    MediaItem.Builder()
      .setMediaId(item.id)
      .setUri(Uri.parse(item.uri))
      .setMediaMetadata(
        MediaMetadata.Builder()
          .setTitle(item.title)
          .setArtist(item.subtitle)
          .setMediaType(MediaMetadata.MEDIA_TYPE_MUSIC)
          .build()
      )
      .build()

  fun setQueue(
    context: Context,
    items: List<QueueItem>,
    startIndex: Int,
    isComplete: Boolean,
    repeatCount: Int,
    shuffleOn: Boolean,
    playbackSpeed: Float
  ) {
    val p = player(context)
    repeat = repeatCount.coerceIn(0, 99)
    shuffle = shuffleOn
    speed = playbackSpeed
    loop = 0
    ended = false
    complete = isComplete
    wantPlay = true
    p.setMediaItems(items.map(::toMediaItem), startIndex.coerceIn(0, maxOf(0, items.size - 1)), 0)
    p.playbackParameters = PlaybackParameters(speed)
    applyShuffle()
    applyRepeatMode()
    p.prepare()
    p.play()
    notifyState()
  }

  fun append(items: List<QueueItem>) {
    val p = exo ?: return
    val wasEndedWaiting = p.playbackState == Player.STATE_ENDED && wantPlay && !complete
    val before = p.mediaItemCount
    p.addMediaItems(items.map(::toMediaItem))
    if (wasEndedWaiting) {
      // 합성이 재생을 못 따라와 끝에 닿아 있었다 → 새로 붙은 첫 항목부터 이어 간다
      p.seekTo(before, 0)
      p.play()
    }
    notifyState()
  }

  /** 현재 항목보다 앞에 들어갈 항목(누른 문장 앞의 문장들). 지금 재생 위치는 그대로다 */
  fun insert(index: Int, items: List<QueueItem>) {
    val p = exo ?: return
    p.addMediaItems(index.coerceIn(0, p.mediaItemCount), items.map(::toMediaItem))
    notifyState()
  }

  fun markComplete() {
    complete = true
    applyShuffle()
    val p = exo
    if (p != null && p.playbackState == Player.STATE_ENDED && wantPlay) {
      // 합성이 다 붙기 전에 끝에 닿아 멈춰 있었다 = 첫 바퀴가 끝난 것이다
      loop += 1
      if (!sleepEndOfLoop && (repeat == 0 || loop < repeat)) {
        applyRepeatMode()
        val tl = p.currentTimeline
        if (!tl.isEmpty) p.seekTo(tl.getFirstWindowIndex(p.shuffleModeEnabled), 0)
        p.play()
      } else {
        if (sleepEndOfLoop) clearSleep()
        ended = true
        wantPlay = false
        p.playWhenReady = false
        val tl = p.currentTimeline
        if (!tl.isEmpty) p.seekTo(tl.getFirstWindowIndex(p.shuffleModeEnabled), 0)
      }
    }
    applyRepeatMode()
    notifyState()
  }

  private fun applyShuffle() {
    val p = exo ?: return
    // 대기열이 다 차기 전에 섞으면 뒤에 붙는 항목이 섞이지 않는다 (PLAYER_SYSTEM.md §4)
    val on = shuffle && complete
    if (on && p.mediaItemCount > 1) {
      p.setShuffleOrder(ShuffleOrder.DefaultShuffleOrder(p.mediaItemCount, Random.nextLong()))
    }
    p.shuffleModeEnabled = on
  }

  private fun applyRepeatMode() {
    val p = exo ?: return
    p.repeatMode = when {
      !complete -> Player.REPEAT_MODE_OFF
      sleepEndOfLoop -> Player.REPEAT_MODE_OFF
      repeat == 0 -> Player.REPEAT_MODE_ALL
      loop >= repeat - 1 -> Player.REPEAT_MODE_OFF // 마지막 바퀴: 끝나면 자연히 멈춘다
      else -> Player.REPEAT_MODE_ALL
    }
  }

  fun play() {
    val p = exo ?: return
    if (ended || p.playbackState == Player.STATE_ENDED) {
      loop = 0
      ended = false
      applyRepeatMode()
      if (p.playbackState == Player.STATE_ENDED) {
        val tl = p.currentTimeline
        if (!tl.isEmpty) p.seekTo(tl.getFirstWindowIndex(p.shuffleModeEnabled), 0)
      }
    }
    if (p.playbackState == Player.STATE_IDLE) p.prepare()
    wantPlay = true
    p.play()
    notifyState()
  }

  fun pause() {
    wantPlay = false
    exo?.pause()
    notifyState()
  }

  fun next() {
    val p = exo ?: return
    if (p.hasNextMediaItem()) {
      p.seekToNextMediaItem()
    } else if (p.mediaItemCount > 0) {
      // 마지막에서 [다음] = 처음으로(음악 앱 관례). 반복 횟수에는 세지 않는다
      p.seekTo(p.currentTimeline.getFirstWindowIndex(p.shuffleModeEnabled), 0)
    }
    ended = false
    notifyState()
  }

  fun previous() {
    val p = exo ?: return
    // 3초 넘게 들었으면 문장 처음으로, 아니면 이전 문장 (seekToPrevious 규칙)
    p.seekToPrevious()
    ended = false
    notifyState()
  }

  fun seekToIndex(index: Int) {
    val p = exo ?: return
    if (index < 0 || index >= p.mediaItemCount) return
    p.seekTo(index, 0)
    ended = false
    if (!p.isPlaying) play() else notifyState()
  }

  fun seekToItem(id: String) {
    val p = exo ?: return
    for (i in 0 until p.mediaItemCount) {
      if (p.getMediaItemAt(i).mediaId == id) {
        seekToIndex(i)
        return
      }
    }
  }

  fun stop() {
    clearSleep()
    wantPlay = false
    exo?.let {
      it.stop()
      it.clearMediaItems()
    }
    ended = false
    loop = 0
    notifyState()
  }

  fun setRepeat(n: Int) {
    repeat = n.coerceIn(0, 99)
    applyRepeatMode()
    notifyState()
  }

  fun setShuffle(on: Boolean) {
    shuffle = on
    applyShuffle()
    applyRepeatMode()
    notifyState()
  }

  fun setSpeed(x: Float) {
    speed = x
    exo?.playbackParameters = PlaybackParameters(x)
    notifyState()
  }

  /** ms > 0: 그 시간 뒤 일시정지 · endOfLoop: 이번 바퀴가 끝나면 · 둘 다 아니면 끈다 */
  fun setSleepTimer(ms: Long, endOfLoop: Boolean) {
    clearSleep()
    if (endOfLoop) {
      sleepEndOfLoop = true
    } else if (ms > 0) {
      sleepAt = System.currentTimeMillis() + ms
      main.postDelayed(sleepRunnable, ms)
    }
    applyRepeatMode()
    notifyState()
  }

  private fun clearSleep() {
    main.removeCallbacks(sleepRunnable)
    sleepAt = 0L
    sleepEndOfLoop = false
  }

  fun state(): Map<String, Any?> {
    val p = exo
    val index = p?.currentMediaItemIndex ?: -1
    return mapOf(
      "isPlaying" to (p?.isPlaying ?: false),
      "index" to if ((p?.mediaItemCount ?: 0) > 0) index else -1,
      "itemId" to p?.currentMediaItem?.mediaId,
      "loop" to loop,
      "repeat" to repeat,
      "shuffle" to shuffle,
      "speed" to speed.toDouble(),
      "sleepAt" to sleepAt.toDouble(),
      "sleepEndOfLoop" to sleepEndOfLoop,
      "ended" to ended,
      "queueLength" to (p?.mediaItemCount ?: 0),
      "complete" to complete
    )
  }

  private fun notifyState() {
    onState?.invoke()
  }
}
