package com.pillsaathi.alarm

import java.util.UUID
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Pill photos: how big they are kept, which way up, what they're called and when an unused one
 * goes. A photo is a JPEG named `<uuid>.jpg` in device-protected `photos/`. Pure.
 */
object PhotoRules {
  const val MAX_SIDE = 1024
  const val JPEG_QUALITY = 85
  /** A photo no pill uses is deleted once it is this old, so a pick still being saved is safe. */
  const val ORPHAN_AGE_MS = 86_400_000L

  private val NAME = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$")

  /** [width] × [height] scaled so the long side is at most [MAX_SIDE]; never scaled up. */
  fun scaledSize(width: Int, height: Int): Pair<Int, Int> {
    val long = max(width, height)
    if (long <= MAX_SIDE) return width to height
    val scale = MAX_SIDE.toDouble() / long
    return (width * scale).roundToInt() to (height * scale).roundToInt()
  }

  /** The decode's `inSampleSize`: the largest power of 2 that keeps the long side ≥ [MAX_SIDE]. */
  fun sampleSize(width: Int, height: Int): Int {
    val long = max(width, height)
    var sample = 1
    while (long / (sample * 2) >= MAX_SIDE) sample *= 2
    return sample
  }

  /** Degrees to turn a photo by its EXIF orientation so it shows upright. Mirroring is ignored. */
  fun rotationFor(exifOrientation: Int): Int =
    when (exifOrientation) {
      3, 4 -> 180
      5, 6 -> 90
      7, 8 -> 270
      else -> 0
    }

  /** Whether [name] is a photo's file name, so never a path. */
  fun isPhotoName(name: String): Boolean = NAME.matches(name)

  fun newName(): String = "${UUID.randomUUID()}.jpg"

  /**
   * The files to delete: those in [files] (name and last-modified time) that no pill uses and that
   * are older than [ORPHAN_AGE_MS], such as a photo picked for a pill page that was then cancelled.
   */
  fun orphans(files: List<Pair<String, Long>>, referenced: Set<String>, now: Long): List<String> =
    files.filter { (name, modified) -> name !in referenced && now - modified > ORPHAN_AGE_MS }.map { it.first }
}
