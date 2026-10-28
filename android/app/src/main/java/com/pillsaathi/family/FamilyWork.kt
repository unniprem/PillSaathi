package com.pillsaathi.family

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/** Family's background work, in the main process only. `:ringing` never calls WorkManager. */
object FamilyWork {
  private const val UPLOAD = "family-upload"
  private const val HEARTBEAT = "family-heartbeat"
  private const val CHECK = "family-check"
  private const val HEARTBEAT_HOURS = 6L

  private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

  /** Uploads the elder's changes once there is internet, after any upload already queued. */
  fun requestUpload(context: Context) {
    val work = OneTimeWorkRequestBuilder<UploadWorker>()
      .setConstraints(online)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(UPLOAD, ExistingWorkPolicy.APPEND_OR_REPLACE, work)
  }

  /** Uploads every 6 hours, so relatives know her phone is alive even on a day nothing changes. */
  fun ensureHeartbeat(context: Context) {
    val work = PeriodicWorkRequestBuilder<UploadWorker>(HEARTBEAT_HOURS, TimeUnit.HOURS).setConstraints(online).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(HEARTBEAT, ExistingPeriodicWorkPolicy.KEEP, work)
  }

  fun cancelHeartbeat(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(HEARTBEAT)
  }

  /** Runs the due checks now, or once there is internet; one at a time, and one queued at most. */
  fun requestCheck(context: Context) {
    val work = OneTimeWorkRequestBuilder<CheckWorker>()
      .setConstraints(online)
      .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(CHECK, ExistingWorkPolicy.KEEP, work)
  }
}

/** Runs [ElderSync]; no internet (or Firestore unreachable) retries with backoff. */
class UploadWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result =
    try {
      ElderSync.run(applicationContext)
      Result.success()
    } catch (e: FamilyException) {
      Log.w(FAMILY_TAG, "Upload failed (${e.code})", e)
      if (e.code == FamilyCloud.OFFLINE) Result.retry() else Result.failure()
    } catch (e: Exception) {
      Log.e(FAMILY_TAG, "Upload failed", e)
      Result.failure()
    }
}

/** Runs [FamilyChecks]; Firestore out of reach retries, and the checks' 3-hour window drops what is too late. */
class CheckWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result =
    try {
      if (FamilyChecks.run(applicationContext, System.currentTimeMillis())) Result.success() else Result.retry()
    } catch (e: Exception) {
      Log.e(FAMILY_TAG, "Family check failed", e)
      Result.retry()
    }

  // Android 11 and older run expedited work in the foreground, behind a quiet notification.
  override fun getForegroundInfo(): ForegroundInfo =
    ForegroundInfo(CHECKING_ID, FamilyNotifications.checking(applicationContext))

  private companion object {
    const val CHECKING_ID = 2001
  }
}
