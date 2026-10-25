package com.pillsaathi

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.pillsaathi.alarm.RingingActivity
import com.pillsaathi.alarm.RingingState

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
    super.onCreate(savedInstanceState)
  }

  override fun onResume() {
    super.onResume()
    // Notifications may be denied or swiped away; never leave a ring without Stop/Snooze.
    if (RingingState.current != null) {
      startActivity(Intent(this, RingingActivity::class.java))
    }
  }
}
