package com.pillsaathi.family

import android.app.Activity
import android.content.Context
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

/** Google sign-in through Credential Manager: a Google account on the phone to a Google ID token. */
object GoogleSignIn {
  /**
   * The web client id Firebase made for Google sign-in, from `google-services.json`. Looked up by
   * name so the app builds without the file; null when this build has none.
   */
  fun webClientId(context: Context): String? {
    val id = context.resources.getIdentifier("default_web_client_id", "string", context.packageName)
    return if (id == 0) null else context.getString(id)
  }

  /**
   * Shows Google's account picker on [activity] and calls [done] on the main thread with the ID
   * token, null when the person cancelled, or a [FamilyException]. A lost connection to Play
   * services is tried once more first, half a second on, so the person never sees it.
   */
  fun idToken(activity: Activity, webClientId: String, retries: Int = 1, done: (Result<String?>) -> Unit) {
    val request = GetCredentialRequest.Builder()
      .addCredentialOption(GetSignInWithGoogleOption.Builder(webClientId).build())
      .build()
    CredentialManager.create(activity).getCredentialAsync(
      activity,
      request,
      CancellationSignal(),
      ContextCompat.getMainExecutor(activity),
      object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
        override fun onResult(result: GetCredentialResponse) {
          val credential = result.credential
          if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            done(Result.success(GoogleIdTokenCredential.createFrom(credential.data).idToken))
          } else {
            done(Result.failure(FamilyException(FamilyCloud.GOOGLE_FAILED, "Google sign-in gave no ID token")))
          }
        }

        override fun onError(e: GetCredentialException) {
          if (retries > 0 && worthRetrying(e) && !activity.isFinishing && !activity.isDestroyed) {
            Handler(Looper.getMainLooper()).postDelayed({ idToken(activity, webClientId, retries - 1, done) }, RETRY_MS)
            return
          }
          done(failureOf(e)?.let { Result.failure(it) } ?: Result.success(null))
        }
      },
    )
  }

  /**
   * What a failed Google sign-in means: null when nothing happened (the picker was closed, or
   * there is no account to pick), else GOOGLE_FAILED. Not OFFLINE: Google turns a phone down for
   * its own reasons (on an emulator with no account, "Caller could not be verified"), and "No
   * internet" on a phone that's online sends the person looking for the wrong fault.
   */
  internal fun failureOf(e: GetCredentialException): FamilyException? =
    when (e) {
      is GetCredentialCancellationException, is NoCredentialException -> null
      else -> FamilyException(FamilyCloud.GOOGLE_FAILED, e.message ?: "Google sign-in failed", e)
    }

  private const val RETRY_MS = 500L

  /** Play services' codes for a connection that dropped mid-call: 20, and 21 and 22 on reconnecting. */
  private val LOST_CONNECTION = Regex("""^\[(20|21|22)]""")

  /**
   * Whether a failed sign-in is worth one more try: the connection to Play services dropped, or
   * the request was interrupted. Seen on the Redmi's first sign-in after a fresh install ("[20]
   * The connection to Google Play services was lost…"), where the next tap worked.
   */
  internal fun worthRetrying(e: GetCredentialException): Boolean =
    e is GetCredentialInterruptedException || LOST_CONNECTION.containsMatchIn(e.message.orEmpty())
}
