package com.pillsaathi.bridge

import android.util.Log
import androidx.core.text.util.LocalePreferences
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.pillsaathi.alarm.History
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.Pill
import com.pillsaathi.alarm.RefillWarning
import com.pillsaathi.alarm.Today
import com.pillsaathi.alarm.TodayCard
import com.pillsaathi.alarm.TodayPill
import java.util.Calendar

/**
 * Pills, Today and History as JS maps, for this phone's own screens and for an elder's on a
 * relative's phone. [photoUri] turns a photo's file name into a URI to show it, and [shift] moves
 * each instant: unchanged for this phone, onto the elder's wall clock for hers.
 */
internal class JsMaps(private val photoUri: (String) -> String?, private val shift: (Long) -> Long = { it }) {
  fun pill(pill: Pill): WritableMap =
    Arguments.createMap().apply {
      putString("id", pill.id)
      putString("name", pill.name)
      putString("form", pill.form.json)
      putDouble("amount", pill.amount)
      putArray(
        "times",
        Arguments.createArray().apply {
          pill.times.forEach {
            pushMap(
              Arguments.createMap().apply {
                putInt("hour", it.hour)
                putInt("minute", it.minute)
              },
            )
          }
        },
      )
      putString("startDate", pill.startDate.toString())
      pill.days?.let { putInt("days", it) } ?: putNull("days")
      putString("photo", pill.photo)
      putString("photoUri", pill.photo?.let(photoUri))
      pill.remaining?.let { putDouble("remaining", it) } ?: putNull("remaining")
    }

  fun today(today: Today): WritableMap =
    Arguments.createMap().apply {
      putString("date", today.date.toString())
      putArray("cards", Arguments.createArray().apply { today.cards.forEach { pushMap(card(it)) } })
      putArray("refills", Arguments.createArray().apply { today.refills.forEach { pushMap(refill(it)) } })
    }

  fun card(card: TodayCard): WritableMap =
    Arguments.createMap().apply {
      putString("alarmId", card.alarmId)
      putInt("hour", card.hour)
      putInt("minute", card.minute)
      putString("soundId", card.soundId)
      putString("status", card.status.json)
      card.statusAt?.let { putDouble("statusAt", shift(it).toDouble()) } ?: putNull("statusAt")
      putArray("pills", Arguments.createArray().apply { card.pills.forEach { pushMap(todayPill(it)) } })
    }

  fun refill(w: RefillWarning): WritableMap =
    Arguments.createMap().apply {
      putString("pillId", w.pillId)
      putString("name", w.name)
      putString("form", w.form.json)
      putDouble("remaining", w.remaining)
      putInt("daysLeft", w.daysLeft)
      putString("level", w.level.json)
    }

  /** [history] with each recorded pill's photo as it is now, and this phone's first day of the week. */
  fun history(history: History): WritableMap {
    val live = history.pills.associateBy { it.id }
    return Arguments.createMap().apply {
      putString("today", history.today.toString())
      putString("oldest", history.oldest?.toString())
      putInt("firstDayOfWeek", firstDayOfWeek())
      putArray(
        "doses",
        Arguments.createArray().apply {
          history.doses.forEach { d ->
            pushMap(
              Arguments.createMap().apply {
                putString("date", d.date.toString())
                putInt("hour", d.hour)
                putInt("minute", d.minute)
                putString("outcome", d.outcome.json)
                putDouble("at", shift(d.at).toDouble())
                putBoolean("marked", d.marked)
                putArray(
                  "pills",
                  Arguments.createArray().apply {
                    d.pills.forEach { p ->
                      val now = live[p.pillId]
                      pushMap(
                        Arguments.createMap().apply {
                          putString("pillId", p.pillId)
                          putString("name", p.name)
                          putString("form", p.form.json)
                          putDouble("amount", p.amount)
                          putBoolean("exists", now != null)
                          putString("photoUri", now?.photo?.let(photoUri))
                        },
                      )
                    }
                  },
                )
              },
            )
          }
        },
      )
    }
  }

  private fun todayPill(pill: TodayPill): WritableMap =
    Arguments.createMap().apply {
      putString("pillId", pill.pillId)
      putString("name", pill.name)
      putString("form", pill.form.json)
      putDouble("amount", pill.amount)
      putString("startDate", pill.startDate?.toString())
      pill.days?.let { putInt("days", it) } ?: putNull("days")
      putBoolean("exists", pill.exists)
      putBoolean("fromTomorrow", pill.fromTomorrow)
      putString("photoUri", pill.photo?.let(photoUri))
    }

  companion object {
    private val WEEKDAYS = listOf("sun", "mon", "tue", "wed", "thu", "fri", "sat")

    /** The phone's first day of the week, from 0 for Sunday, as JS's `Date.getDay()` counts. */
    fun firstDayOfWeek(): Int =
      try {
        WEEKDAYS.indexOf(LocalePreferences.getFirstDayOfWeek()).takeIf { it >= 0 }
          ?: (Calendar.getInstance().firstDayOfWeek - 1)
      } catch (e: Exception) {
        Log.w(LOG_TAG, "Could not read the first day of the week", e)
        Calendar.getInstance().firstDayOfWeek - 1
      }
  }
}
