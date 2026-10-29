package com.pillsaathi

import android.app.ActivityManager
import android.app.Application
import android.os.Build
import android.os.Process
import android.util.Log
import androidx.core.os.UserManagerCompat
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.pillsaathi.alarm.LOG_TAG
import com.pillsaathi.alarm.Notifications
import com.pillsaathi.bridge.PillSaathiPackage
import com.pillsaathi.family.FamilyNotifications
import java.io.File

class MainApplication : Application(), ReactApplication {

  private var reactNativeLoaded = false

  /** The alarm engine's own process: ringing must never wait for, or die with, React Native. */
  private val isRingingProcess: Boolean by lazy { processName().endsWith(RINGING_PROCESS_SUFFIX) }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // The app's own TurboModules; autolinking only finds libraries.
          add(PillSaathiPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    try {
      Notifications.ensureChannels(this)
      // Family pings come from the main process only.
      if (!isRingingProcess) FamilyNotifications.ensureChannels(this)
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not create the notification channels", e)
    }
    // Before the first unlock only the alarm engine runs (direct boot); React Native waits.
    if (UserManagerCompat.isUserUnlocked(this)) ensureReactNativeLoaded()
  }

  /** Loads React Native once, and never in the `:ringing` process. */
  fun ensureReactNativeLoaded() {
    if (reactNativeLoaded || isRingingProcess) return
    reactNativeLoaded = true
    loadReactNative(this)
  }

  private fun processName(): String =
    if (Build.VERSION.SDK_INT >= 28) {
      Application.getProcessName()
    } else {
      try {
        File("/proc/self/cmdline").readText().substringBefore('\u0000').trim()
      } catch (e: Exception) {
        Log.e(LOG_TAG, "Could not read /proc/self/cmdline; asking ActivityManager", e)
        processNameFromActivityManager()
      }
    }

  private fun processNameFromActivityManager(): String =
    try {
      getSystemService(ActivityManager::class.java)
        ?.runningAppProcesses
        ?.firstOrNull { it.pid == Process.myPid() }
        ?.processName
        .orEmpty()
    } catch (e: Exception) {
      Log.e(LOG_TAG, "Could not read the process name", e)
      ""
    }

  private companion object {
    const val RINGING_PROCESS_SUFFIX = ":ringing"
  }
}
