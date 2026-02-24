package com.pillsaathi

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

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
    loadReactNative(this)
    createNotificationChannels()
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = getSystemService(NotificationManager::class.java)

      // Medication Reminders Channel (High Priority)
      val medicationChannel = NotificationChannel(
        "medication_reminders",
        "Medication Reminders",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Notifications for medication reminders and alerts"
        enableVibration(true)
        enableLights(true)
        setShowBadge(true)
      }

      // General Notifications Channel (Default Priority)
      val generalChannel = NotificationChannel(
        "general",
        "General Notifications",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "General app notifications and updates"
        enableVibration(true)
        setShowBadge(true)
      }

      // Urgent Alerts Channel (Urgent Priority)
      val alertsChannel = NotificationChannel(
        "alerts",
        "Urgent Alerts",
        NotificationManager.IMPORTANCE_HIGH
      ).apply {
        description = "Critical alerts and urgent notifications"
        enableVibration(true)
        enableLights(true)
        setShowBadge(true)
      }

      // Register channels with the system
      notificationManager.createNotificationChannel(medicationChannel)
      notificationManager.createNotificationChannel(generalChannel)
      notificationManager.createNotificationChannel(alertsChannel)
    }
  }
}
