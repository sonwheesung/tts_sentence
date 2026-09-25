package expo.modules.sentenceaudio

import android.app.PendingIntent
import android.content.Intent
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * 백그라운드 재생 서비스. 알림·잠금화면 컨트롤(이전/재생/다음)은 Media3 기본 알림이 만든다.
 * 플레이어 자체는 PlayerHolder 가 쥐고, 여기서는 세션으로 감싸기만 한다 (docs/PLAYER_SYSTEM.md §7).
 */
class PlaybackService : MediaSessionService() {
  private var session: MediaSession? = null

  override fun onCreate() {
    super.onCreate()
    val player = PlayerHolder.player(this)
    val builder = MediaSession.Builder(this, player)
    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      launch.flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
      builder.setSessionActivity(
        PendingIntent.getActivity(
          this,
          0,
          launch,
          PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
      )
    }
    session = builder.build()
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

  override fun onTaskRemoved(rootIntent: Intent?) {
    // 최근 앱에서 쓸어 지웠을 때: 재생 중이면 계속, 멈춰 있으면 서비스를 끝낸다
    val player = session?.player
    if (player == null || !player.playWhenReady || player.mediaItemCount == 0) {
      stopSelf()
    }
  }

  override fun onDestroy() {
    session?.release()
    session = null
    super.onDestroy()
  }
}
