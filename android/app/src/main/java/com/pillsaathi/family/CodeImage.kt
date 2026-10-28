package com.pillsaathi.family

import android.graphics.Bitmap
import android.graphics.Color
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import java.io.File
import java.io.FileOutputStream

/** The scan code a relative's phone reads: [FamilyRules.qrText] drawn as a QR code PNG. */
object CodeImage {
  private const val SIZE = 512

  /** Draws [text] into [file] and returns it. */
  fun png(text: String, file: File): File {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, SIZE, SIZE, mapOf(EncodeHintType.MARGIN to 1))
    val pixels = IntArray(SIZE * SIZE) { i -> if (matrix[i % SIZE, i / SIZE]) Color.BLACK else Color.WHITE }
    val bitmap = Bitmap.createBitmap(pixels, SIZE, SIZE, Bitmap.Config.ARGB_8888)
    file.parentFile?.mkdirs()
    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
    return file
  }
}
