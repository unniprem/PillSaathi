package com.pillsaathi.alarm

import kotlin.math.roundToInt

/** How the ringing screen draws a few things, apart from its views so JVM tests can run it. */
object RingingLook {
  /**
   * The parts of [time] drawn small beside its digits: everything but the digits and the
   * separators between them, so "9:00 PM" has a small " PM" and "21:00" has none.
   */
  fun smallParts(time: String): List<IntRange> {
    fun big(i: Int) =
      time[i].isDigit() ||
        (i in 1 until time.length - 1 && time[i - 1].isDigit() && time[i + 1].isDigit())
    val parts = mutableListOf<IntRange>()
    var i = 0
    while (i < time.length) {
      val start = i
      while (i < time.length && !big(i)) i++
      if (i > start) parts.add(start until i) else i++
    }
    return parts
  }

  /** What TalkBack reads for a pill's card, all at once: "Telma 40, 1 tablet", or its name alone. */
  fun cardLabel(name: String, amount: String): String =
    if (amount.isBlank()) name else "$name, $amount"

  /** [color] laid [amount] (0 to 1) thick over white: the soft box behind a pill's shape. */
  fun tint(color: Int, amount: Float): Int {
    fun channel(shift: Int): Int {
      val c = (color shr shift) and 0xFF
      return (255 + (c - 255) * amount).roundToInt() shl shift
    }
    return (0xFF shl 24) or channel(16) or channel(8) or channel(0)
  }
}
