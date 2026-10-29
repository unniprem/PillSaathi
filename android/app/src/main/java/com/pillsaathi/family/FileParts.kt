package com.pillsaathi.family

/**
 * A photo or sound sent with a change travels as parts, one Firestore document each: a document
 * holds at most 1 MiB and Spark has no Cloud Storage. [MAX_SEND_BYTES] is 8 parts.
 */
object FileParts {
  const val PART_BYTES = 700 * 1024
  const val MAX_SEND_BYTES = 5 * 1024 * 1024
  const val MAX_PARTS = 8

  /** [bytes] in parts of [PART_BYTES]; none for an empty file. */
  fun split(bytes: ByteArray): List<ByteArray> =
    (bytes.indices step PART_BYTES).map { bytes.copyOfRange(it, minOf(it + PART_BYTES, bytes.size)) }

  /** The file from parts 0 until [count], or null when one is missing. */
  fun join(parts: Map<Int, ByteArray>, count: Int): ByteArray? {
    val ordered = (0 until count).map { parts[it] ?: return null }
    val out = ByteArray(ordered.sumOf { it.size })
    var at = 0
    ordered.forEach {
      it.copyInto(out, at)
      at += it.size
    }
    return out
  }

  fun partId(changeId: String, index: Int): String = "${changeId}_$index"
}
