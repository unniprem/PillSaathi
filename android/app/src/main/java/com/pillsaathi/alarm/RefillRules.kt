package com.pillsaathi.alarm

/** How close a counted pill is to running out. [OUT] outranks [LOW] by ordinal. */
enum class RefillLevel(val json: String) {
  LOW("low"),
  OUT("out");

  companion object {
    fun fromJson(s: String): RefillLevel? = values().firstOrNull { it.json == s }
  }
}

/**
 * Pure rules for counting tablets and capsules. A count never touches the alarm: it is updated
 * after the dose is recorded, best effort, and a pill at 0 still rings.
 */
object RefillRules {
  /** Only tablets and capsules are counted; syrup and drops aren't. */
  fun isCountable(form: PillForm): Boolean = form == PillForm.TABLET || form == PillForm.CAPSULE

  /**
   * The count and the last warning to save for [draft], given the pill as stored ([existing], null
   * for a new pill). The draft's count wins for a new pill or when it was changed; otherwise the
   * stored one stays, since a Taken may have lowered it while the page was open. A higher count
   * (more tablets bought, or counting turned on) clears the warning so it can be posted again.
   */
  fun savedCount(existing: Pill?, draft: PillDraft): Pair<Double?, RefillLevel?> {
    if (!isCountable(draft.form)) return null to null
    if (existing == null) return draft.remaining to null
    val count = if (draft.remainingChanged) draft.remaining else existing.remaining
    val stored = existing.remaining
    val raised = stored == null || (count != null && count > stored)
    return count to if (count == null || raised) null else existing.refillNotified
  }
}
