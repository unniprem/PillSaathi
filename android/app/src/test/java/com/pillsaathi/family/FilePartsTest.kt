package com.pillsaathi.family

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FilePartsTest {
  @Test fun `split and join round-trip at the part size`() {
    val file = ByteArray(1_500_000) { (it % 251).toByte() }
    val parts = FileParts.split(file)
    assertEquals(listOf(716_800, 716_800, 66_400), parts.map { it.size })
    assertArrayEquals(file, FileParts.join(parts.withIndex().associate { it.index to it.value }, 3))
  }

  @Test fun `join is null with a part missing`() {
    val parts = FileParts.split(ByteArray(1_500_000))
    assertNull(FileParts.join(mapOf(0 to parts[0], 2 to parts[2]), 3))
  }

  @Test fun `split of an empty file is no parts`() {
    assertTrue(FileParts.split(ByteArray(0)).isEmpty())
  }

  @Test fun `a part is named after its change and index`() {
    assertEquals("c1_2", FileParts.partId("c1", 2))
  }
}
