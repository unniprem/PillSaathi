package com.pillsaathi.alarm

/**
 * A pill without a photo is drawn in a colour picked from its name: the same palette and
 * sum as the app's `src/ui/pillLook.ts`, so it looks the same on Today and when it rings.
 * Built from hex rather than `android.graphics.Color` so JVM unit tests can run it.
 */
object PillLook {
  val PALETTE: IntArray =
    listOf("9B3D2E", "F0845F", "5B8DEF", "E9C46A", "7FB685", "B48CDB", "F4F1EA", "E07A9B")
      .map { (0xFF000000 or it.toLong(16)).toInt() }
      .toIntArray()

  /** The sum of the name's UTF-16 code units, ignoring case and outer spaces, mod [n]. */
  fun nameIndex(name: String, n: Int): Int = name.trim().lowercase().sumOf { it.code } % n

  fun colorFor(name: String): Int = PALETTE[nameIndex(name, PALETTE.size)]
}
