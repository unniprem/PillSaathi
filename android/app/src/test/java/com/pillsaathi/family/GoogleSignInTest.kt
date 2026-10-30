package com.pillsaathi.family

import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialUnknownException
import androidx.credentials.exceptions.NoCredentialException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
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
}
