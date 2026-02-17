/**
 * Cloud Functions for PillSathi
 *
 * This module contains all Firebase Cloud Functions for the PillSathi application.
 * Functions handle secure server-side operations that cannot be performed on the client.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * redeemInviteCode - Callable Cloud Function
 *
 * Redeems an invite code to create a relationship between a parent and caregiver.
 * This function validates the code, checks expiration, and creates a relationship document.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 7.5
 *
 * @param {Object} data - Request data
 * @param {string} data.code - Invite code to redeem (8-character alphanumeric)
 * @param {string} data.caregiverUid - Caregiver's Firebase Auth UID
 * @param {Object} context - Function context with authentication info
 * @returns {Promise<{success: boolean, relationshipId?: string, message?: string, error?: string}>}
 * @throws {functions.https.HttpsError} For authentication, validation, or permission errors
 *
 * @example
 * // Client-side usage:
 * const redeemInviteCode = firebase.functions().httpsCallable('redeemInviteCode');
 * const result = await redeemInviteCode({ code: 'ABC12345', caregiverUid: 'user123' });
 */
exports.redeemInviteCode = functions.https.onCall(async (data, context) => {
  // ============================================================================
  // SUBTASK 3.1: Validate authentication and input parameters
  // Requirements: 7.5 - Authentication requirement
  // ============================================================================

  // Verify authentication (reject if not authenticated)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to redeem invite codes',
    );
  }

  // Validate input parameters (code, caregiverUid)
  const { code, caregiverUid } = data;

  if (!code || typeof code !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Code is required and must be a string',
    );
  }

  if (!caregiverUid || typeof caregiverUid !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'caregiverUid is required and must be a string',
    );
  }

  // Validate requesting user matches caregiverUid
  // Users can only redeem codes for themselves
  if (context.auth.uid !== caregiverUid) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only redeem invite codes for yourself',
    );
  }

  // ============================================================================
  // SUBTASK 3.2: Implement invite code validation logic
  // Requirements: 3.1, 3.2, 3.3, 3.4 - Code validation and error handling
  // ============================================================================

  // Validate code format (8 characters, alphanumeric uppercase)
  const codeUppercase = code.toUpperCase();
  const codeFormatRegex = /^[A-Z0-9]{8}$/;

  if (!codeFormatRegex.test(codeUppercase)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid code format. Code must be 8 alphanumeric characters',
    );
  }

  try {
    // Query Firestore for the invite code
    const inviteCodesSnapshot = await admin
      .firestore()
      .collection('inviteCodes')
      .where('code', '==', codeUppercase)
      .limit(1)
      .get();

    // Check if code exists
    if (inviteCodesSnapshot.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Invalid invite code. Please check the code and try again',
      );
    }

    const inviteCodeDoc = inviteCodesSnapshot.docs[0];
    const inviteCodeData = inviteCodeDoc.data();

    // Check if code is expired
    const now = admin.firestore.Timestamp.now();
    if (inviteCodeData.expiresAt <= now) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This invite code has expired. Please request a new code from the parent',
      );
    }

    // ============================================================================
    // SUBTASK 3.4: Implement relationship creation logic
    // Requirements: 3.5, 3.6, 3.7 - Relationship creation and idempotence
    // ============================================================================

    const { parentUid } = inviteCodeData;

    // Check for existing relationship (idempotence)
    const existingRelationshipSnapshot = await admin
      .firestore()
      .collection('relationships')
      .where('parentUid', '==', parentUid)
      .where('caregiverUid', '==', caregiverUid)
      .limit(1)
      .get();

    // If relationship already exists, return success without creating duplicate
    if (!existingRelationshipSnapshot.empty) {
      const existingRelationship = existingRelationshipSnapshot.docs[0];
      return {
        success: true,
        relationshipId: existingRelationship.id,
        message: 'Relationship already exists',
      };
    }

    // Create new relationship document
    const relationshipRef = await admin
      .firestore()
      .collection('relationships')
      .add({
        parentUid,
        caregiverUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: caregiverUid,
      });

    // Optionally increment usedCount on the invite code
    await inviteCodeDoc.ref.update({
      usedCount: admin.firestore.FieldValue.increment(1),
    });

    return {
      success: true,
      relationshipId: relationshipRef.id,
      message: 'Relationship created successfully',
    };
  } catch (error) {
    // Re-throw HttpsError instances
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Log unexpected errors
    console.error('Error redeeming invite code:', error);

    // Throw generic error for unexpected issues
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while redeeming the invite code. Please try again',
    );
  }
});
