package com.pillsaathi.alarm

/** The sky by the hour, the same hours as the app's `src/ui/sky.ts`. */
enum class Sky { DAWN, DAY, EVENING, NIGHT }

object SkyTime {
  fun of(hour: Int): Sky =
    when (hour) {
      in 5..7 -> Sky.DAWN
      in 8..16 -> Sky.DAY
      in 17..18 -> Sky.EVENING
      else -> Sky.NIGHT
    }
}
