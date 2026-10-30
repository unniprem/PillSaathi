package com.pillsaathi.alarm

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Rect
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.text.SpannableString
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.format.DateFormat
import android.text.style.RelativeSizeSpan
import android.text.style.ReplacementSpan
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.window.OnBackInvokedDispatcher
import androidx.core.content.res.ResourcesCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat.AccessibilityActionCompat
import com.pillsaathi.R
import java.util.Calendar
import java.util.Date
import kotlin.math.roundToInt

/** The full-screen ringing UI. Native only, so it works with no React Native runtime. */
class RingingActivity : Activity() {
  private val listener: (RingingState.Ring?) -> Unit = { render(it) }
  private val handler = Handler(Looper.getMainLooper())
  private val enableButtons = Runnable { setButtonsEnabled(true) }
  private lateinit var buttons: List<View>

  /** The ring on screen; Taken, Skip and Snooze are sent for it, never for one that replaced it. */
  private var rendered: RingingState.Ring? = null

  // The bundled Nunito weights; the phone's own bold font for any that can't be read.
  private lateinit var bold: Typeface
  private lateinit var extraBold: Typeface
  private lateinit var black: Typeface

  /** The icon font, or null if it can't be read: the words then show without their icons. */
  private var symbols: Typeface? = null

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
    drawBehindBars()
    loadFonts()
    val taken = findViewById<TextView>(R.id.ringing_taken)
    val snooze = findViewById<TextView>(R.id.ringing_snooze)
    val skip = findViewById<TextView>(R.id.ringing_skip)
    skip.paintFlags = skip.paintFlags or Paint.UNDERLINE_TEXT_FLAG
    styleWords(taken, snooze, skip)
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
    findViewById<ImageView>(R.id.ringing_photo_large).setOnClickListener { hideLargePhoto() }
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

  /**
   * The sky fills the screen behind the status and navigation bars; the layout keeps everything
   * else inside them.
   */
  @Suppress("DEPRECATION") // The bar colours: Android 15 draws the bars clear by itself.
  private fun drawBehindBars() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = Color.TRANSPARENT
    // Before Android 8 the navigation bar's buttons are always white, so they get a navy bar
    // rather than the pale day sky behind them.
    window.navigationBarColor = if (Build.VERSION.SDK_INT >= 26) Color.TRANSPARENT else NAVY
  }

  private fun loadFonts() {
    val from = fontContext()
    bold = font(from, R.font.nunito_bold) ?: Typeface.DEFAULT_BOLD
    extraBold = font(from, R.font.nunito_extrabold) ?: Typeface.DEFAULT_BOLD
    black = font(from, R.font.nunito_black) ?: Typeface.DEFAULT_BOLD
    symbols = font(from, R.font.symbols_filled)
  }

  /**
   * Fonts are read through device-protected storage: Android 7 copies each one to the cache
   * folder first, and alarms ring before the first unlock after a reboot, when the usual cache
   * folder can't be written. Later versions read them in place, so this changes nothing there.
   */
  private fun fontContext(): Context =
    try {
      createDeviceProtectedStorageContext()
    } catch (e: Throwable) {
      Log.w(LOG_TAG, "No device-protected storage for the ringing screen's fonts", e)
      this
    }

  /** A bundled font, or null if it can't be read: nothing here ever stops the screen showing. */
  private fun font(from: Context, id: Int): Typeface? =
    try {
      ResourcesCompat.getFont(from, id)
    } catch (e: Throwable) {
      Log.w(LOG_TAG, "Could not load a font for the ringing screen; using the phone's", e)
      null
    }

  /** The fonts of the words that are always there, and the icons on the two big buttons. */
  private fun styleWords(taken: TextView, snooze: TextView, skip: TextView) {
    findViewById<TextView>(R.id.ringing_title).typeface = extraBold
    findViewById<TextView>(R.id.ringing_time).typeface = black
    findViewById<TextView>(R.id.ringing_sound).typeface = extraBold
    skip.typeface = extraBold
    taken.typeface = black
    snooze.typeface = black
    // TalkBack reads the words, not the icon.
    val tookIt = getString(R.string.action_taken)
    taken.text = withIcon(CHECK_CIRCLE, tookIt, 1.35f)
    taken.contentDescription = tookIt
    val remind = getString(R.string.action_snooze)
    snooze.text = withIcon(SNOOZE, remind, 1.3f)
    snooze.contentDescription = remind
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
    if (ring.alarmId != rendered?.alarmId) hideLargePhoto()
    rendered = ring
    val hour = Calendar.getInstance().apply { timeInMillis = ring.startedAt }.get(Calendar.HOUR_OF_DAY)
    renderSky(SkyTime.of(hour))
    // In the phone's format, not the app language's, so a time looks the same in every language.
    findViewById<TextView>(R.id.ringing_time).text =
      timeText(DateFormat.getTimeFormat(applicationContext).format(Date(ring.startedAt)))
    renderPills(ring)
    val sound = getString(R.string.ringing_sound, ring.soundName)
    findViewById<TextView>(R.id.ringing_sound).apply {
      text = withIcon(VOLUME_UP, sound, 1.25f)
      contentDescription = sound
    }
  }

  /**
   * The sky for the hour the ring started, the time on screen: the sun by day, the moon and stars
   * at night. Words on it are navy, or white at night, as in the app (`skyInk`).
   */
  private fun renderSky(sky: Sky) {
    val night = sky == Sky.NIGHT
    findViewById<View>(R.id.ringing_sky).setBackgroundResource(
      when (sky) {
        Sky.DAWN -> R.drawable.ringing_sky_dawn
        Sky.DAY -> R.drawable.ringing_sky_day
        Sky.EVENING -> R.drawable.ringing_sky_evening
        Sky.NIGHT -> R.drawable.ringing_sky_night
      }
    )
    findViewById<View>(R.id.ringing_sun).visibility = if (night) View.GONE else View.VISIBLE
    findViewById<View>(R.id.ringing_night).visibility = if (night) View.VISIBLE else View.GONE
    val ink = if (night) Color.WHITE else NAVY
    findViewById<TextView>(R.id.ringing_title).setTextColor(faded(ink, 0.85f))
    findViewById<TextView>(R.id.ringing_time).setTextColor(ink)
    findViewById<TextView>(R.id.ringing_sound).apply {
      setTextColor(ink)
      setBackgroundResource(if (night) R.drawable.ringing_chip else R.drawable.ringing_chip_light)
    }
    findViewById<TextView>(R.id.ringing_snooze).apply {
      setTextColor(ink)
      setBackgroundResource(
        if (night) R.drawable.ringing_snooze_bg else R.drawable.ringing_snooze_bg_light
      )
    }
    findViewById<TextView>(R.id.ringing_skip).setTextColor(faded(ink, 0.8f))
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = !night
      isAppearanceLightNavigationBars = !night
    }
  }

  /** [time] with its AM or PM drawn small beside the digits. */
  private fun timeText(time: String): CharSequence =
    SpannableString(time).apply {
      RingingLook.smallParts(time).forEach {
        setSpan(RelativeSizeSpan(SMALL_TIME), it.first, it.last + 1, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      }
    }

  /**
   * One white card per due pill: its photo (or its shape), then its name with the amount under
   * it, so a long name never pushes the amount off the card. The card's name alone if there are
   * none. TalkBack reads each card as one, its name and amount together.
   */
  private fun renderPills(ring: RingingState.Ring) {
    val list = findViewById<LinearLayout>(R.id.ringing_pills)
    list.removeAllViews()
    val rows = ring.pills.ifEmpty { listOf(RingPill(ring.name, "")) }
    rows.forEach { pill ->
      val card = LinearLayout(this)
      card.orientation = LinearLayout.HORIZONTAL
      card.gravity = Gravity.CENTER_VERTICAL
      card.setBackgroundResource(R.drawable.ringing_card)
      card.setPadding(dp(12), dp(10), dp(12), dp(10))
      card.isFocusable = true
      card.contentDescription = RingingLook.cardLabel(pill.name, pill.amount)
      if (ring.pills.isNotEmpty()) {
        val picture = pictureOf(pill)
        picture.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        if (picture.hasOnClickListeners()) {
          // The photo opens full width from the card too, for TalkBack, which reads only the card.
          ViewCompat.replaceAccessibilityAction(card, AccessibilityActionCompat.ACTION_CLICK, null) {
            _, _ -> picture.performClick()
          }
        }
        card.addView(
          picture,
          LinearLayout.LayoutParams(dp(PHOTO_DP), dp(PHOTO_DP)).apply { marginEnd = dp(12) },
        )
      }
      val words = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
      }
      words.addView(text(pill.name, 18f, NAVY, black))
      if (pill.amount.isNotEmpty()) words.addView(text(pill.amount, 15f, MUTED, bold))
      card.addView(words, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
      list.addView(
        card,
        LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply { bottomMargin = dp(10) },
      )
    }
  }

  /**
   * [pill]'s photo, rounded, opening full width when tapped; or its shape when it has none or the
   * photo can't be read, which never stops the screen from showing.
   */
  private fun pictureOf(pill: RingPill): View {
    val photo = pill.photoPath?.let { decode(it, dp(PHOTO_DP) * 2) } ?: return shapeOf(pill)
    return ImageView(this).apply {
      setImageBitmap(photo)
      scaleType = ImageView.ScaleType.CENTER_CROP
      val radius = dp(16).toFloat()
      outlineProvider =
        object : ViewOutlineProvider() {
          override fun getOutline(view: View, outline: Outline) =
            outline.setRoundRect(0, 0, view.width, view.height, radius)
        }
      clipToOutline = true
      setOnClickListener { showLargePhoto(pill) }
    }
  }

  /**
   * [pill] drawn by its type in its name's colour, as in the app (`PillPicture`), on a soft box of
   * that colour: a tablet with its score line, a two-tone capsule tilted, or the syrup or drops
   * icon. Without the icon font, syrup and drops are drawn as a tablet.
   */
  private fun shapeOf(pill: RingPill): View {
    val color = PillLook.colorFor(pill.name)
    val box = FrameLayout(this)
    box.background = rounded(RingingLook.tint(color, BOX_TINT), dp(16))
    box.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    val icon =
      when (pill.form) {
        PillForm.SYRUP -> MEDICATION_LIQUID
        PillForm.DROPS -> WATER_DROP
        else -> null
      }
    val font = symbols
    when {
      icon != null && font != null ->
        box.addView(
          View(this).apply { background = GlyphDrawable(icon, font, color, dp(34).toFloat(), dp(2).toFloat()) },
          centred(dp(40), dp(40)),
        )
      pill.form == PillForm.CAPSULE -> box.addView(capsule(color), centred(dp(38), dp(14)))
      else -> box.addView(tablet(color), centred(dp(33), dp(33)))
    }
    return box
  }

  /** A round tablet with its score line. */
  private fun tablet(color: Int): View =
    FrameLayout(this).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
      }
      elevation = dp(2).toFloat()
      addView(View(context).apply { setBackgroundColor(SHADE) }, centred(dp(18), dp(2)))
    }

  /** A capsule tilted as in the app: its coloured body with a white half over the left end. */
  private fun capsule(color: Int): View =
    FrameLayout(this).apply {
      background = rounded(color, dp(7))
      rotation = -45f
      elevation = dp(2).toFloat()
      val end = dp(7).toFloat()
      // LEFT, not START: a drawing, the same way round in every language.
      addView(
        View(context).apply {
          background = GradientDrawable().apply {
            setColor(Color.WHITE)
            cornerRadii = floatArrayOf(end, end, 0f, 0f, 0f, 0f, end, end)
          }
        },
        FrameLayout.LayoutParams(dp(19), FrameLayout.LayoutParams.MATCH_PARENT, Gravity.LEFT),
      )
    }

  private fun showLargePhoto(pill: RingPill) {
    val path = pill.photoPath ?: return
    val photo = decode(path, resources.displayMetrics.widthPixels) ?: return
    val large = findViewById<ImageView>(R.id.ringing_photo_large)
    large.setImageBitmap(photo)
    large.contentDescription = pill.name
    large.visibility = View.VISIBLE
  }

  private fun hideLargePhoto() {
    val large = findViewById<ImageView>(R.id.ringing_photo_large)
    large.visibility = View.GONE
    large.setImageDrawable(null)
  }

  /** The photo at [path], sampled down to no more than about [maxSide] px, or null if unreadable. */
  private fun decode(path: String, maxSide: Int): Bitmap? =
    try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(path, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        null
      } else {
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2
        BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
      }
    } catch (e: Exception) {
      Log.w(LOG_TAG, "Could not show the photo $path; showing its shape", e)
      null
    }

  /** [words] after the [icon], [scale] times their size; the words alone without the icon font. */
  private fun withIcon(icon: String, words: String, scale: Float): CharSequence {
    val font = symbols ?: return words
    return SpannableStringBuilder()
      .append(icon, IconSpan(font, scale), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      .append(words)
  }

  private fun text(value: String, sp: Float, color: Int, font: Typeface) =
    TextView(this).apply {
      text = value
      setTextColor(color)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
      typeface = font
    }

  private fun rounded(color: Int, radius: Int) =
    GradientDrawable().apply {
      setColor(color)
      cornerRadius = radius.toFloat()
    }

  private fun centred(width: Int, height: Int) = FrameLayout.LayoutParams(width, height, Gravity.CENTER)

  private fun dp(value: Int): Int =
    TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun setButtonsEnabled(enabled: Boolean) {
    buttons.forEach {
      it.isEnabled = enabled
      it.alpha = if (enabled) 1f else DISABLED_ALPHA
    }
  }

  /**
   * An icon beside words, [scale] times their size and centred on their capital letters whatever
   * the two fonts' metrics, with a gap after it. The line keeps the words' height.
   */
  private class IconSpan(private val font: Typeface, private val scale: Float) : ReplacementSpan() {
    private fun iconPaint(paint: Paint) =
      Paint(paint).apply {
        typeface = font
        textSize = paint.textSize * scale
      }

    override fun getSize(paint: Paint, text: CharSequence, start: Int, end: Int, fm: Paint.FontMetricsInt?): Int {
      fm?.let { paint.getFontMetricsInt(it) }
      return (iconPaint(paint).measureText(text, start, end) + paint.textSize * ICON_GAP).roundToInt()
    }

    override fun draw(
      canvas: Canvas,
      text: CharSequence,
      start: Int,
      end: Int,
      x: Float,
      top: Int,
      y: Int,
      bottom: Int,
      paint: Paint,
    ) {
      val icon = iconPaint(paint)
      val glyph = Rect().also { icon.getTextBounds(text.toString(), start, end, it) }
      val caps = Rect().also { paint.getTextBounds("H", 0, 1, it) }
      canvas.drawText(text, start, end, x, y + caps.exactCenterY() - glyph.exactCenterY(), icon)
    }
  }

  /**
   * One icon, [size] px, centred in its bounds, with a soft [edge] so the palest pill colours
   * still show on white (as `PillPicture`'s syrup and drops do).
   */
  private class GlyphDrawable(private val glyph: String, font: Typeface, color: Int, size: Float, edge: Float) :
    Drawable() {
    private val paint =
      Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = font
        textSize = size
        this.color = color
        setShadowLayer(edge, 0f, edge / 2, SHADE)
      }
    private val glyphBounds = Rect().also { paint.getTextBounds(glyph, 0, glyph.length, it) }

    override fun draw(canvas: Canvas) {
      canvas.drawText(
        glyph,
        bounds.exactCenterX() - glyphBounds.exactCenterX(),
        bounds.exactCenterY() - glyphBounds.exactCenterY(),
        paint,
      )
    }

    override fun setAlpha(alpha: Int) {
      paint.alpha = alpha
    }

    override fun setColorFilter(colorFilter: ColorFilter?) {
      paint.colorFilter = colorFilter
    }

    @Deprecated("Deprecated in Java")
    override fun getOpacity() = PixelFormat.TRANSLUCENT
  }

  private companion object {
    const val DISABLED_ALPHA = 0.5f
    const val PHOTO_DP = 50

    /** The AM or PM beside the time: 24 against the time's 58. */
    const val SMALL_TIME = 24f / 58f

    /** How thick a pill's colour lies on the box behind its shape. */
    const val BOX_TINT = 0.15f

    /** The gap after an icon beside words, against the words' size. */
    const val ICON_GAP = 0.45f

    // Material Symbols Rounded, as in src/ui/icons.ts.
    const val CHECK_CIRCLE = ""
    const val SNOOZE = ""
    const val VOLUME_UP = ""
    const val MEDICATION_LIQUID = ""
    const val WATER_DROP = ""

    // The app's colours (src/theme.ts): navy, muted, and `shade` (a tablet's score line).
    val NAVY = Color.parseColor("#15324A")
    val MUTED = Color.parseColor("#5B6E7E")
    val SHADE = Color.parseColor("#2E000000")

    /** [color] at [alpha] (0 to 1). */
    fun faded(color: Int, alpha: Float): Int = (color and 0xFFFFFF) or ((alpha * 255).roundToInt() shl 24)
  }
}
