package com.pillsaathi.family

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.File

/**
 * The copies of a pill photo that go online: by default the small one her upload sends (longest
 * side 256 px, JPEG quality 70); a relative sends a bigger one (1024 px, 80) for her ring screen.
 */
object Thumbnails {
  private const val QUALITY = 70
  private const val MAX_PX = 256

  /** [file]'s copy, or null when it can't be read. Photos are stored already upright. */
  fun jpeg(file: File, maxPx: Int = MAX_PX, quality: Int = QUALITY): ByteArray? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      Log.w(FAMILY_TAG, "Photo ${file.name} can't be read; not uploading it")
      return null
    }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxPx) sample *= 2
    val decoded = BitmapFactory.decodeFile(file.path, BitmapFactory.Options().apply { inSampleSize = sample })
      ?: return null
    val (w, h) = FamilyRules.thumbSize(decoded.width, decoded.height, maxPx)
    val small = if (w == decoded.width && h == decoded.height) decoded else Bitmap.createScaledBitmap(decoded, w, h, true)
    return ByteArrayOutputStream().use { out ->
      small.compress(Bitmap.CompressFormat.JPEG, quality, out)
      if (small !== decoded) small.recycle()
      decoded.recycle()
      out.toByteArray()
    }
  }
}
