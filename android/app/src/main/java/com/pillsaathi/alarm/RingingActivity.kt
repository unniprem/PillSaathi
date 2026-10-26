package com.pillsaathi.alarm

import android.app.Activity
import android.content.Context
import android.graphics.Paint
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.text.format.DateFormat
import android.util.Log
import android.graphics.Color
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import com.pillsaathi.R
import java.util.Date

/** The full-screen ringing UI. Native only, so it works with no React Native runtime. */
class RingingActivity : Activity() {
  private val listener: (RingingState.Ring?) -> Unit = { render(it) }
  private val handler = Handler(Looper.getMainLooper())
  private val enableButtons = Runnable { setButtonsEnabled(true) }
  private lateinit var buttons: List<View>

  /** The ring on screen; Taken, Skip and Snooze are sent for it, never for one that replaced it. */
  private var rendered: RingingState.Ring? = null

  /** The screen's words in the app's language, not the phone's; the phone's if that fails. */
  override fun attachBaseContext(newBase: Context) {
    val base =
      try {
        newBase.localized(AlarmEngine.get(newBase).language())
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not localise the ringing screen; using the phone's language", e)
        newBase
      }
    super.attachBaseContext(base)
  }

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
    val taken = findViewById<TextView>(R.id.ringing_taken)
    val snooze = findViewById<TextView>(R.id.ringing_snooze)
    val skip = findViewById<TextView>(R.id.ringing_skip)
    skip.paintFlags = skip.paintFlags or Paint.UNDERLINE_TEXT_FLAG
    buttons = listOf(taken, snooze, skip)
    taken.setOnClickListener {
      rendered?.let { RingingService.taken(applicationContext, it.alarmId) }
    }
    snooze.setOnClickListener {
      rendered?.let { RingingService.snooze(applicationContext, it.alarmId) }
    }
    skip.setOnClickListener {
      rendered?.let { RingingService.skip(applicationContext, it.alarmId) }
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

  override fun onDestroy() {
    handler.removeCallbacks(enableButtons)
    super.onDestroy()
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
    if (ring != rendered && RingCommands.inGuard(ring, SystemClock.elapsedRealtime())) {
      // This ring has just replaced the one on screen: a second tap meant for that one must not
      // end it unseen.
      Log.i(LOG_TAG, "Ring buttons paused ${RingCommands.GUARD_MS} ms: new ring ${ring.alarmId}")
      setButtonsEnabled(false)
      handler.removeCallbacks(enableButtons)
      handler.postDelayed(enableButtons, RingCommands.GUARD_MS)
    }
    rendered = ring
    // In the phone's format, not the app language's, so a time looks the same in every language.
    findViewById<TextView>(R.id.ringing_time).text =
      DateFormat.getTimeFormat(applicationContext).format(Date(ring.startedAt))
    renderPills(ring)
    findViewById<TextView>(R.id.ringing_sound).text =
      getString(R.string.ringing_sound, ring.soundName)
  }

  /** One row per due pill, its name and amount; the card's name alone if there are none. */
  private fun renderPills(ring: RingingState.Ring) {
    val list = findViewById<LinearLayout>(R.id.ringing_pills)
    list.removeAllViews()
    val rows = ring.pills.ifEmpty { listOf(RingPill(ring.name, "")) }
    rows.forEach { pill ->
      val row = LinearLayout(this)
      row.orientation = LinearLayout.HORIZONTAL
      row.gravity = Gravity.CENTER_VERTICAL
      val pad = dp(8)
      row.setPadding(0, pad, 0, pad)
      val name = text(pill.name, 24f, Color.WHITE)
      row.addView(name, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
      if (pill.amount.isNotEmpty()) {
        val amount = text(pill.amount, 22f, MUTED)
        amount.setPadding(dp(16), 0, 0, 0)
        row.addView(amount)
      }
      list.addView(row)
    }
  }

  private fun text(value: String, sp: Float, color: Int) =
    TextView(this).apply {
      text = value
      setTextColor(color)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
    }

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun setButtonsEnabled(enabled: Boolean) {
    buttons.forEach {
      it.isEnabled = enabled
      it.alpha = if (enabled) 1f else DISABLED_ALPHA
    }
  }

  private companion object {
    const val DISABLED_ALPHA = 0.5f
    val MUTED = Color.parseColor("#B0B0B8")
  }
}
