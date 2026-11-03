package com.pillsaathi.bridge

import android.app.Application
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], application = Application::class)
class SettingsLauncherTest {
  private class Phone(private val fail: (Intent) -> Unit = {}) :
    ContextWrapper(RuntimeEnvironment.getApplication()) {
    val attempts = mutableListOf<Intent>()

    override fun getApplicationContext(): Context = this

    override fun startActivity(intent: Intent) {
      attempts += intent
      fail(intent)
    }
  }

  @Test fun batteryFixAsksForThisAppsExemption() {
    val phone = Phone()
    assertTrue(SettingsLauncher(phone).open("batteryOptimization"))
    val prompt = phone.attempts.single()
    assertEquals(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, prompt.action)
    assertEquals("package:${phone.packageName}", prompt.data.toString())
    assertTrue(prompt.flags and Intent.FLAG_ACTIVITY_NEW_TASK != 0)
  }

  @Test fun unavailablePromptFallsBackToBatteryList() {
    val phone = Phone {
      if (it.action == Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) {
        throw ActivityNotFoundException()
      }
    }
    assertTrue(SettingsLauncher(phone).open("batteryOptimization"))
    assertEquals(
      listOf(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
      phone.attempts.map { it.action },
    )
  }

  @Test fun blockedPromptFallsBackToBatteryList() {
    val phone = Phone {
      if (it.action == Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS) {
        throw SecurityException("OEM blocks this page")
      }
    }
    assertTrue(SettingsLauncher(phone).open("batteryOptimization"))
    assertEquals(2, phone.attempts.size)
    assertEquals(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS, phone.attempts.last().action)
  }

  @Test fun missingBatteryPagesFallBackToAppInfo() {
    val phone = Phone {
      if (it.action != Settings.ACTION_APPLICATION_DETAILS_SETTINGS) {
        throw ActivityNotFoundException()
      }
    }
    assertFalse(SettingsLauncher(phone).open("batteryOptimization"))
    assertEquals(3, phone.attempts.size)
    assertEquals(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, phone.attempts.last().action)
    assertEquals("package:${phone.packageName}", phone.attempts.last().data.toString())
  }

  @Test fun appDeclaresPermissionRequiredByBatteryPrompt() {
    val app = RuntimeEnvironment.getApplication()
    val permissions = app.packageManager.getPackageInfo(app.packageName, PackageManager.GET_PERMISSIONS)
      .requestedPermissions.orEmpty().toList()
    assertTrue(permissions.contains(android.Manifest.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS))
  }
}
