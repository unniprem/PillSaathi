package com.pillsaathi.family

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.gms.common.moduleinstall.InstallStatusListener
import com.google.android.gms.common.moduleinstall.ModuleInstall
import com.google.android.gms.common.moduleinstall.ModuleInstallRequest
import com.google.android.gms.common.moduleinstall.ModuleInstallStatusUpdate
import com.google.android.gms.common.moduleinstall.ModuleInstallStatusUpdate.InstallState
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning

/**
 * Google's code scanner, which lives in a Play services module. The manifest asks for it at
 * install, but only Play Store installs honour that: a sideloaded APK gets it whenever Play
 * services gets round to it, and until then every scan fails. So a scan first asks for an urgent
 * download and waits up to [WAIT_MS] for it. Runs on the main thread.
 */
object CodeScanner {
  private const val TAG = "PillSaathiFamily"
  private const val WAIT_MS = 60_000L

  /** Calls [done] once with the 6 digits, null when cancelled, or a [FamilyException]. */
  fun scan(activity: Activity, done: (Result<String?>) -> Unit) {
    val options = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
    val scanner = GmsBarcodeScanning.getClient(activity, options)
    val installs = ModuleInstall.getClient(activity)
    val main = Handler(Looper.getMainLooper())
    var settled = false
    var opened = false
    lateinit var listener: InstallStatusListener

    // Stops the download wait: its timeout and its listener (the download itself carries on).
    fun stopWaiting() {
      main.removeCallbacksAndMessages(null)
      installs.unregisterListener(listener)
    }

    fun finish(result: Result<String?>) {
      if (settled) return
      settled = true
      stopWaiting()
      done(result)
    }

    fun noScanner(why: String, e: Throwable? = null) {
      Log.w(TAG, "No scanner: $why", e)
      finish(Result.failure(FamilyException(FamilyCloud.NO_SCANNER, why, e)))
    }

    fun open() {
      if (settled || opened) return
      opened = true
      stopWaiting()
      scanner.startScan()
        .addOnSuccessListener { barcode ->
          val digits = barcode.rawValue?.let(FamilyRules::parseCode)
          finish(
            if (digits != null) Result.success(digits)
            else Result.failure(FamilyException(FamilyCloud.BAD_CODE, "Not a PillSaathi code"))
          )
        }
        .addOnCanceledListener { finish(Result.success(null)) }
        .addOnFailureListener { noScanner("Scanning failed", it) }
    }

    listener = InstallStatusListener { update: ModuleInstallStatusUpdate ->
      when (update.installState) {
        InstallState.STATE_COMPLETED -> open()
        InstallState.STATE_FAILED, InstallState.STATE_CANCELED -> noScanner("Download ended in state ${update.installState}")
        else -> Unit
      }
    }

    installs.areModulesAvailable(scanner)
      .addOnSuccessListener { availability ->
        if (availability.areModulesAvailable()) {
          open()
          return@addOnSuccessListener
        }
        Log.i(TAG, "Scanner module missing; asking for an urgent download")
        main.postDelayed({ noScanner("Download took over ${WAIT_MS / 1000} s") }, WAIT_MS)
        installs.installModules(ModuleInstallRequest.newBuilder().addApi(scanner).setListener(listener).build())
          .addOnSuccessListener { if (it.areModulesAlreadyInstalled()) open() }
          .addOnFailureListener { noScanner("Download refused", it) }
      }
      .addOnFailureListener { noScanner("Could not check for the scanner", it) }
  }
}
