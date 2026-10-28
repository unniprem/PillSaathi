package com.pillsaathi.bridge

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** The app's own TurboModules. Registered in the main process only; `:ringing` has no JS. */
class PillSaathiPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
    when (name) {
      NativeAlarmsModule.NAME -> NativeAlarmsModule(reactContext)
      NativeSoundsModule.NAME -> NativeSoundsModule(reactContext)
      NativeFamilyModule.NAME -> NativeFamilyModule(reactContext)
      else -> null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
      NativeAlarmsModule.NAME to
        turboModule(NativeAlarmsModule.NAME, NativeAlarmsModule::class.java),
      NativeSoundsModule.NAME to
        turboModule(NativeSoundsModule.NAME, NativeSoundsModule::class.java),
      NativeFamilyModule.NAME to
        turboModule(NativeFamilyModule.NAME, NativeFamilyModule::class.java),
    )
  }

  private fun turboModule(name: String, type: Class<*>) =
    ReactModuleInfo(
      name = name,
      className = type.name,
      canOverrideExistingModule = false,
      needsEagerInit = false,
      isCxxModule = false,
      isTurboModule = true,
    )
}
