package com.pillsaathi

import android.app.Application
import androidx.core.os.UserManagerCompat
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.pillsaathi.alarm.Notifications

class MainApplication : Application(), ReactApplication {

  private var reactNativeLoaded = false

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    Notifications.ensureChannels(this)
    // Before the first unlock only the alarm engine runs (direct boot); React Native waits.
    if (UserManagerCompat.isUserUnlocked(this)) ensureReactNativeLoaded()
  }

  fun ensureReactNativeLoaded() {
    if (reactNativeLoaded) return
    reactNativeLoaded = true
    loadReactNative(this)
  }
}
