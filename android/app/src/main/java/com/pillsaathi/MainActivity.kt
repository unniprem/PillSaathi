package com.pillsaathi

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.pillsaathi.alarm.AlarmEngine
import com.pillsaathi.alarm.AlarmRules
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.RingingActivity
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "PillSaathi"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // The process may have started before the first unlock, without React Native.
    (application as MainApplication).ensureReactNativeLoaded()
    // react-native-screens: restores its fragments after process death.
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }

  override fun onResume() {
    super.onResume()
    // Notifications may be denied or swiped away; never leave a ring without Stop/Snooze.
    if (isRinging()) {
      startActivity(Intent(this, RingingActivity::class.java))
    }
  }

  /**
   * Whether the `:ringing` process is ringing, from the marker it keeps in the store. A marker
   * older than any ring can last was left by a process that died mid-ring, and is ignored.
   */
  private fun isRinging(): Boolean =
    try {
      val marker = AlarmEngine.get(this).store.loadRingingMarker()
      marker != null &&
        System.currentTimeMillis() - marker.startedAt <
          AlarmRules.AUTO_SILENCE_MS + AlarmRules.MISSED_GRACE_MS
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the ringing marker", e)
      false
    }
}
