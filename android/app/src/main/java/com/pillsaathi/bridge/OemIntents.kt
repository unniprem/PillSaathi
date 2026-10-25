package com.pillsaathi.bridge

import android.content.ComponentName
import android.content.Context
import android.content.Intent

/**
 * Maker-specific "autostart" and "battery" pages, from dontkillmyapp.com. These are
 * private activities that differ by phone model and ROM version, so each target has
 * an ordered candidate list; [SettingsLauncher] tries them in turn and falls back to
 * App info. Pairs not listed here have no candidates.
 */
object OemIntents {
  private val XIAOMI = setOf("xiaomi", "redmi", "poco")
  private val OPPO = setOf("oppo", "realme", "oneplus")
  private val VIVO = setOf("vivo", "iqoo")
  private val HUAWEI = setOf("huawei", "honor")

  private fun component(pkg: String, cls: String): Intent =
    Intent().setComponent(ComponentName(pkg, if (cls.startsWith(".")) pkg + cls else cls))

  /** Candidate intents for [target] (`oemAutostart` or `oemBattery`), best first. */
  fun candidates(context: Context, manufacturer: String, target: String): List<Intent> {
    val maker = manufacturer.trim().lowercase()
    return when (target) {
      "oemAutostart" ->
        when (maker) {
          in XIAOMI ->
            listOf(
              component(
                "com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity",
              ),
            )
          in OPPO ->
            listOf(
              component("com.coloros.safecenter", ".startupapp.StartupAppListActivity"),
              component("com.coloros.safecenter", ".permission.startup.StartupAppListActivity"),
              component("com.oppo.safe", ".permission.startup.StartupAppListActivity"),
              component(
                "com.oneplus.security",
                ".chainlaunch.view.ChainLaunchAppListActivity",
              ),
            )
          in VIVO ->
            listOf(
              component("com.vivo.permissionmanager", ".activity.BgStartUpManagerActivity"),
              component("com.iqoo.secure", ".ui.phoneoptimize.BgStartUpManager"),
              component("com.iqoo.secure", ".ui.phoneoptimize.AddWhiteListActivity"),
            )
          in HUAWEI ->
            listOf(
              component("com.huawei.systemmanager", ".startupmgr.ui.StartupNormalAppListActivity"),
              component("com.huawei.systemmanager", ".optimize.process.ProtectActivity"),
            )
          else -> emptyList()
        }
      "oemBattery" ->
        when (maker) {
          in XIAOMI ->
            listOf(
              component("com.miui.powerkeeper", ".ui.HiddenAppsConfigActivity")
                .putExtra("package_name", context.packageName)
                .putExtra("package_label", context.applicationInfo.loadLabel(context.packageManager)),
            )
          "samsung" ->
            listOf(
              component(
                "com.samsung.android.lool",
                "com.samsung.android.sm.battery.ui.BatteryActivity",
              ),
              component("com.samsung.android.sm", ".battery.ui.BatteryActivity"),
            )
          else -> emptyList()
        }
      else -> emptyList()
    }
  }
}
