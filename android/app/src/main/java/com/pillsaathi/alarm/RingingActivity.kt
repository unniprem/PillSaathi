package com.pillsaathi.alarm

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.text.format.DateFormat
import android.util.Log
import android.view.WindowManager
import android.window.OnBackInvokedDispatcher
import android.widget.TextView
import com.pillsaathi.R
import java.util.Date

/** The full-screen ringing UI. Native only, so it works with no React Native runtime. */
class RingingActivity : Activity() {
  private val listener: (RingingState.Ring?) -> Unit = { render(it) }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= 33) {
      // Predictive back (target 36) no longer calls onBackPressed; swallow the gesture here.
      onBackInvokedDispatcher.registerOnBackInvokedCallback(
        OnBackInvokedDispatcher.PRIORITY_DEFAULT
      ) {}
    }
    setContentView(R.layout.activity_ringing)
    findViewById<TextView>(R.id.ringing_snooze).setOnClickListener {
      RingingService.snooze(applicationContext)
    }
    findViewById<TextView>(R.id.ringing_stop).setOnClickListener {
      RingingService.stop(applicationContext)
    }
  }

  override fun onStart() {
    super.onStart()
    RingingState.addListener(listener)
    val ring = RingingState.current
    if (ring == null) clearStaleMarker()
    render(ring)
  }

  override fun onStop() {
    RingingState.removeListener(listener)
    super.onStop()
  }

  // Back must not dismiss the alarm (API 24-32; 33+ uses the callback in onCreate).
  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {}

  /**
   * Nothing rings in this process, which is the one that rings, so a marker saying otherwise was
   * left by a `:ringing` process that died mid-ring. Without this, MainActivity would redirect here
   * again every time this screen finished, until the marker aged out.
   */
  private fun clearStaleMarker() {
    try {
      AlarmEngine.get(this).store.saveRingingMarker(null)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not clear a stale ringing marker", e)
    }
  }

  private fun render(ring: RingingState.Ring?) {
    if (ring == null) {
      finish()
      return
    }
    findViewById<TextView>(R.id.ringing_time).text =
      DateFormat.getTimeFormat(this).format(Date(ring.startedAt))
    findViewById<TextView>(R.id.ringing_name).text = ring.name
    findViewById<TextView>(R.id.ringing_sound).text =
      getString(R.string.ringing_sound, ring.soundName)
  }
}
