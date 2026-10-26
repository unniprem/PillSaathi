package com.pillsaathi.alarm

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PhotoRulesTest {
  private val UUID_JPG = "3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg"
  private val HOUR = 3_600_000L

  @Test fun scaledSize_bigLandscape() {
    assertEquals(1024 to 768, PhotoRules.scaledSize(4000, 3000))
    assertEquals(800 to 600, PhotoRules.scaledSize(800, 600))
    assertEquals(768 to 1024, PhotoRules.scaledSize(3000, 4000))
  }

  @Test fun sampleSize_keepsAtLeastMaxSide() {
    assertEquals(2, PhotoRules.sampleSize(4000, 3000))
    assertEquals(1, PhotoRules.sampleSize(1000, 800))
    assertEquals(4, PhotoRules.sampleSize(3000, 4096))
  }

  // Most phone cameras save a portrait shot sideways with orientation 6.
  @Test fun rotationFor_exifOrientations() {
    assertEquals(90, PhotoRules.rotationFor(6))
    assertEquals(180, PhotoRules.rotationFor(3))
    assertEquals(270, PhotoRules.rotationFor(8))
    assertEquals(0, PhotoRules.rotationFor(1))
    assertEquals(0, PhotoRules.rotationFor(0))
  }

  @Test fun isPhotoName_rejectsPaths() {
    assertFalse(PhotoRules.isPhotoName("../x.jpg"))
    assertFalse(PhotoRules.isPhotoName("a.jpg"))
    assertFalse(PhotoRules.isPhotoName(UUID_JPG.replace(".jpg", ".png")))
    assertFalse(PhotoRules.isPhotoName("../$UUID_JPG"))
    assertFalse(PhotoRules.isPhotoName(UUID_JPG.uppercase().replace(".JPG", ".jpg")))
    assertTrue(PhotoRules.isPhotoName(UUID_JPG))
    assertTrue(PhotoRules.isPhotoName(PhotoRules.newName()))
  }

  // An abandoned pick goes after a day; a photo in use, or one picked just now, never does.
  @Test fun orphans_onlyOldUnreferenced() {
    val now = 100 * HOUR
    val files = listOf(
      "used.jpg" to now - 30 * HOUR,
      "fresh.jpg" to now - HOUR,
      "old.jpg" to now - 25 * HOUR,
    )
    assertEquals(listOf("old.jpg"), PhotoRules.orphans(files, setOf("used.jpg"), now))
  }
}
