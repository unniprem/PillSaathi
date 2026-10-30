package com.pillsaathi.family

import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialInterruptedException
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.exceptions.NoCredentialException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class GoogleSignInTest {
  @Test
  fun closingThePickerOrHavingNoAccountIsNotAFailure() {
    assertNull(GoogleSignIn.failureOf(GetCredentialCancellationException()))
    assertNull(GoogleSignIn.failureOf(NoCredentialException()))
  }

  @Test
  fun anyOtherRefusalIsGooglesNotTheInternets() {
    // What an emulator with no Google account gives: "[28477] Caller could not be verified."
    val failure = GoogleSignIn.failureOf(GetCredentialUnknownException("[28477] Caller could not be verified."))
    assertEquals(FamilyCloud.GOOGLE_FAILED, failure?.code)
    assertEquals("[28477] Caller could not be verified.", failure?.message)
  }

  @Test
  fun aLostConnectionToPlayServicesIsTriedAgain() {
    // The Redmi's first sign-in after a fresh install, 2026-10-30; the second tap worked.
    assertTrue(GoogleSignIn.worthRetrying(GetCredentialUnknownException("[20] The connection to Google Play services was lost due to service disconnection.")))
    assertTrue(GoogleSignIn.worthRetrying(GetCredentialUnknownException("[22] Reconnection timed out.")))
    assertTrue(GoogleSignIn.worthRetrying(GetCredentialInterruptedException()))
    // A refusal, a closed picker or no account would only come back the same.
    assertFalse(GoogleSignIn.worthRetrying(GetCredentialUnknownException("[28477] Caller could not be verified.")))
    assertFalse(GoogleSignIn.worthRetrying(GetCredentialUnknownException(null)))
    assertFalse(GoogleSignIn.worthRetrying(GetCredentialCancellationException()))
    assertFalse(GoogleSignIn.worthRetrying(NoCredentialException()))
  }
}
