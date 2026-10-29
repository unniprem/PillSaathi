package com.pillsaathi.photo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import androidx.core.content.FileProvider
import com.pillsaathi.alarm.PhotoRules
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream

/**
 * Pill photos on disk, in [dir]: taking one in from the camera or the photo picker, and naming and
 * deleting them. A photo is kept upright, at most [PhotoRules.MAX_SIDE] on its long side, as a
 * JPEG. Blocking: call [importFrom] off the main thread.
 */
class PillPhotos(context: Context, private val dir: File) {
  private val context = context.applicationContext

  /** The file the camera app writes to, in this app's cache (the camera runs after unlock). */
  val captureFile: File
    get() = File(File(context.cacheDir, "camera").apply { mkdirs() }, "capture.jpg")

  /** A fresh content URI for [captureFile], to hand to the camera app with write access. */
  fun captureUri(): Uri {
    captureFile.delete()
    return FileProvider.getUriForFile(context, "${context.packageName}.photos", captureFile)
  }

  /**
   * Takes in the image at [uri] as a new photo and returns its name. Throws [IOException] if it
   * can't be read as an image or the photo can't be written.
   */
  fun importFrom(uri: Uri): String {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    open(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IOException("Not an image: $uri")
    val options = BitmapFactory.Options().apply {
      inSampleSize = PhotoRules.sampleSize(bounds.outWidth, bounds.outHeight)
    }
    val decoded = open(uri).use { BitmapFactory.decodeStream(it, null, options) }
      ?: throw IOException("Could not decode $uri")
    val upright = upright(scaled(decoded), orientationOf(uri))
    try {
      return write(upright)
    } finally {
      upright.recycle()
    }
  }

  /**
   * Takes in a photo sent from a relative's phone (a JPEG already upright) and returns its name.
   * Throws [IOException] if [bytes] aren't an image.
   */
  fun importBytes(bytes: ByteArray): String {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IOException("Not an image")
    val options = BitmapFactory.Options().apply {
      inSampleSize = PhotoRules.sampleSize(bounds.outWidth, bounds.outHeight)
    }
    val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options) ?: throw IOException("Could not decode the photo")
    val scaled = scaled(decoded)
    try {
      return write(scaled)
    } finally {
      scaled.recycle()
    }
  }

  fun delete(name: String) {
    if (PhotoRules.isPhotoName(name)) File(dir, name).delete()
  }

  /** The photo as a `file://` URI, for the JS screens. */
  fun fileUri(name: String): String = Uri.fromFile(File(dir, name)).toString()

  private fun open(uri: Uri): InputStream =
    context.contentResolver.openInputStream(uri) ?: throw IOException("Could not open $uri")

  /** The EXIF orientation, or normal when there is none or it can't be read. */
  private fun orientationOf(uri: Uri): Int =
    try {
      open(uri).use {
        ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      }
    } catch (e: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }

  private fun scaled(bitmap: Bitmap): Bitmap {
    val (width, height) = PhotoRules.scaledSize(bitmap.width, bitmap.height)
    if (width == bitmap.width && height == bitmap.height) return bitmap
    return Bitmap.createScaledBitmap(bitmap, width, height, true).also { if (it !== bitmap) bitmap.recycle() }
  }

  private fun upright(bitmap: Bitmap, orientation: Int): Bitmap {
    val degrees = PhotoRules.rotationFor(orientation)
    if (degrees == 0) return bitmap
    val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      .also { if (it !== bitmap) bitmap.recycle() }
  }

  /** Writes [bitmap] durably under a new name: a temporary file, synced, then renamed. */
  private fun write(bitmap: Bitmap): String {
    dir.mkdirs()
    val name = PhotoRules.newName()
    val tmp = File.createTempFile("$name.", ".tmp", dir)
    var done = false
    try {
      FileOutputStream(tmp).use { out ->
        if (!bitmap.compress(Bitmap.CompressFormat.JPEG, PhotoRules.JPEG_QUALITY, out)) {
          throw IOException("Could not encode the photo")
        }
        out.fd.sync()
      }
      done = tmp.renameTo(File(dir, name))
      if (!done) throw IOException("Could not save the photo as $name")
      return name
    } finally {
      if (!done) tmp.delete()
    }
  }
}
