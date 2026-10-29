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
  private const val REFRESH = "family-refresh"
  private const val REFRESH_NOW = "family-refresh-now"
  private const val CHECK_IN = "family-check-in"
  private const val CHECK_IN_NOW = "family-check-in-now"
  private const val CHECK_IN_HOURS = 1L
  private const val HEARTBEAT_HOURS = 6L
  private const val REFRESH_HOURS = 6L

  private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

  /**
   * Uploads the elder's changes once there is internet. Each upload reads her latest data, so one
   * waiting is enough: this replaces a queued one rather than queueing behind it (ten changes made
   * offline were ten uploads back online). A running upload isn't interrupted, as WorkManager
   * doesn't stop a [Worker]'s thread; the new one waits on [ElderSync.lock] and sends what changed.
   */
  fun requestUpload(context: Context) {
    val work = OneTimeWorkRequestBuilder<UploadWorker>()
      .setConstraints(online)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(UPLOAD, ExistingWorkPolicy.REPLACE, work)
  }

  /**
   * Uploads every 6 hours, so relatives know her phone is alive even on a day nothing changes. It
   * queues an upload rather than running one, so uploads always run one after another.
   */
  fun ensureHeartbeat(context: Context) {
    val work = PeriodicWorkRequestBuilder<HeartbeatWorker>(HEARTBEAT_HOURS, TimeUnit.HOURS).setConstraints(online).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(HEARTBEAT, ExistingPeriodicWorkPolicy.KEEP, work)
  }

  /**
   * Reads the elders this phone follows every 6 hours, so a new dose time of hers gets checked and
   * a count running low pings, even when he doesn't open the app and no check is due.
   */
  fun ensureRefresh(context: Context) {
    val work = PeriodicWorkRequestBuilder<RefreshWorker>(REFRESH_HOURS, TimeUnit.HOURS).setConstraints(online).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(REFRESH, ExistingPeriodicWorkPolicy.KEEP, work)
  }

  /** Reads the elders once, as soon as there is internet: after a new follow, say. */
  fun requestRefresh(context: Context) {
    val work = OneTimeWorkRequestBuilder<RefreshWorker>()
      .setConstraints(online)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(REFRESH_NOW, ExistingWorkPolicy.KEEP, work)
  }

  /** Stops the background reads once this phone follows no one. */
  fun stopRefreshIfUnused(context: Context) {
    val store = com.pillsaathi.alarm.AlarmStore(context)
    if (store.locked { store.loadFamily() }.follows.isNotEmpty()) return
    WorkManager.getInstance(context).cancelUniqueWork(REFRESH)
    WorkManager.getInstance(context).cancelUniqueWork(REFRESH_NOW)
  }

  /**
   * Her phone checks in every hour for changes her family sent, while someone may change her pills.
   * It also checks in before every upload, on app open, and live while the app is open.
   */
  fun ensureCheckIn(context: Context) {
    val work = PeriodicWorkRequestBuilder<CheckInWorker>(CHECK_IN_HOURS, TimeUnit.HOURS).setConstraints(online).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(CHECK_IN, ExistingPeriodicWorkPolicy.KEEP, work)
  }

  /** Stops the hourly check-in once no one may change her pills. */
  fun cancelCheckIn(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(CHECK_IN)
  }

  /** Checks in once, as soon as there is internet. */
  fun requestCheckIn(context: Context) {
    val work = OneTimeWorkRequestBuilder<CheckInWorker>()
      .setConstraints(online)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
      .build()
    WorkManager.getInstance(context).enqueueUniqueWork(CHECK_IN_NOW, ExistingWorkPolicy.REPLACE, work)
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

/** Her check-in ([CheckIn]); Firestore out of reach retries with backoff. */
class CheckInWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result =
    try {
      synchronized(ElderSync.lock) { CheckIn.apply(applicationContext) }
      Result.success()
    } catch (e: FamilyException) {
      Log.w(FAMILY_TAG, "Check-in failed (${e.code})", e)
      if (e.code == FamilyCloud.OFFLINE) Result.retry() else Result.failure()
    } catch (e: Exception) {
      Log.e(FAMILY_TAG, "Check-in failed", e)
      Result.failure()
    }
}

/** The elder's heartbeat: queues an upload behind any already queued. */
class HeartbeatWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    FamilyWork.requestUpload(applicationContext)
    return Result.success()
  }
}

/** Reads the followed elders, then sets the next check and posts any refill ping. */
class RefreshWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result =
    try {
      if (!FamilyRefresh.run(applicationContext)) {
        Result.retry()
      } else {
        FamilyChecks.scheduleNext(applicationContext)
        FamilyChecks.pingRefills(applicationContext, System.currentTimeMillis())
        // A refused read may have dropped the last follow.
        FamilyWork.stopRefreshIfUnused(applicationContext)
        Result.success()
      }
    } catch (e: Exception) {
      Log.e(FAMILY_TAG, "Family refresh failed", e)
      Result.retry()
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
