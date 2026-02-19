/**
 * Cloud Functions for PillSathi
 *
 * This module contains all Firebase Cloud Functions for the PillSathi application.
 * Functions handle secure server-side operations that cannot be performed on the client.
 */

const functions = require('firebase-functions');
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
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

    // Check if code has already been used
    if (inviteCodeData.used === true) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This invite code has already been used. Please request a new code from the parent',
      );
    }

    // ============================================================================
    // SUBTASK 3.4: Implement relationship creation logic
    // Requirements: 3.5, 3.6, 3.7 - Relationship creation and idempotence
    // ============================================================================

    const { parentUid } = inviteCodeData;

    // Check for existing relationship (prevent duplicate caregiver-parent pairs)
    const existingRelationshipSnapshot = await admin
      .firestore()
      .collection('relationships')
      .where('parentUid', '==', parentUid)
      .where('caregiverUid', '==', caregiverUid)
      .limit(1)
      .get();

    // If relationship already exists, return error (not idempotent anymore)
    if (!existingRelationshipSnapshot.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'You are already connected with this parent',
      );
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

    // Mark the invite code as used and increment usedCount
    await inviteCodeDoc.ref.update({
      used: true,
      usedCount: admin.firestore.FieldValue.increment(1),
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      usedBy: caregiverUid,
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

/**
 * removeRelationship - Callable Cloud Function
 *
 * Removes a relationship between a parent and caregiver.
 * This function validates authentication, verifies the requesting user is a caregiver,
 * and deletes the relationship document.
 *
 * Requirements: 6.2, 7.4 - Only caregivers can remove relationships
 *
 * @param {Object} data - Request data
 * @param {string} data.relationshipId - Relationship document ID to remove
 * @param {Object} context - Function context with authentication info
 * @returns {Promise<{success: boolean, message?: string}>}
 * @throws {functions.https.HttpsError} For authentication, validation, or permission errors
 *
 * @example
 * // Client-side usage:
 * const removeRelationship = firebase.functions().httpsCallable('removeRelationship');
 * const result = await removeRelationship({ relationshipId: 'rel123' });
 */
exports.removeRelationship = functions.https.onCall(async (data, context) => {
  // ============================================================================
  // SUBTASK 6.1: Validate authentication and input
  // Requirements: 7.4 - Authentication and authorization
  // ============================================================================

  // Validate authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to remove relationships',
    );
  }

  // Validate input (relationshipId)
  const { relationshipId } = data;

  if (!relationshipId || typeof relationshipId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'relationshipId is required and must be a string',
    );
  }

  try {
    // Fetch relationship document
    const relationshipDoc = await admin
      .firestore()
      .collection('relationships')
      .doc(relationshipId)
      .get();

    // Check if relationship exists
    if (!relationshipDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Relationship not found',
      );
    }

    const relationshipData = relationshipDoc.data();
    const { caregiverUid } = relationshipData;

    // Verify requesting user is the caregiver in the relationship
    // Requirement 6.2: Only caregivers can remove the relationship
    if (context.auth.uid !== caregiverUid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only caregivers can remove relationships',
      );
    }

    // Delete relationship document
    await relationshipDoc.ref.delete();

    return {
      success: true,
      message: 'Relationship removed successfully',
    };
  } catch (error) {
    // Re-throw HttpsError instances
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    // Log unexpected errors
    console.error('Error removing relationship:', error);

    // Throw generic error for unexpected issues
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while removing the relationship. Please try again',
    );
  }
});

/**
 * onScheduleCreate - Firestore Trigger
 *
 * Automatically generates doses when a new schedule is created.
 * This function is triggered by Firestore onCreate events on the schedules collection.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.4, 9.5
 *
 * @param {Object} event - Firestore event with document snapshot
 * @returns {Promise<void>}
 */
exports.onScheduleCreate = onDocumentCreated(
  'schedules/{scheduleId}',
  async event => {
    const {
      generateDosesForSchedule,
      writeDosesInBatches,
    } = require('./generateDoses');

    try {
      const scheduleId = event.params.scheduleId;
      const scheduleData = event.data.data();

      console.log(`Schedule created: ${scheduleId}, generating doses...`);

      // Fetch the associated medicine document
      const medicineDoc = await admin
        .firestore()
        .collection('medicines')
        .doc(scheduleData.medicineId)
        .get();

      if (!medicineDoc.exists) {
        console.error(
          `Medicine ${scheduleData.medicineId} not found for schedule ${scheduleId}`,
        );
        return;
      }

      const medicineData = medicineDoc.data();

      // Only generate doses if medicine is active (Requirement 7.2)
      if (medicineData.status !== 'active') {
        console.log(
          `Medicine ${scheduleData.medicineId} is inactive, skipping dose generation`,
        );
        return;
      }

      // Prepare schedule and medicine objects with IDs
      const schedule = {
        id: scheduleId,
        ...scheduleData,
      };

      const medicine = {
        id: medicineDoc.id,
        ...medicineData,
      };

      // Generate doses for the next 7 days (Requirements 8.1-8.5)
      const startDate = new Date();
      const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

      // Write doses to Firestore in batches (Requirements 9.1, 9.2, 9.4)
      const dosesWritten = await writeDosesInBatches(admin.firestore(), doses);

      // Requirement 9.5: Log dose creation count
      console.log(
        `Successfully generated ${dosesWritten} doses for schedule ${scheduleId}`,
      );
    } catch (error) {
      console.error(
        `Error generating doses for schedule ${event.params.scheduleId}:`,
        error,
      );
      // Don't throw - we don't want to retry indefinitely
    }
  },
);

/**
 * onScheduleUpdate - Firestore Trigger
 *
 * Regenerates doses when a schedule is updated.
 * This function deletes future doses and creates new ones based on the updated schedule.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.4, 9.5
 *
 * @param {Object} event - Firestore event with before and after snapshots
 * @returns {Promise<void>}
 */
exports.onScheduleUpdate = onDocumentUpdated(
  'schedules/{scheduleId}',
  async event => {
    const {
      generateDosesForSchedule,
      writeDosesInBatches,
    } = require('./generateDoses');

    try {
      const scheduleId = event.params.scheduleId;
      const scheduleData = event.data.after.data();

      console.log(`Schedule updated: ${scheduleId}, regenerating doses...`);

      // Fetch the associated medicine document
      const medicineDoc = await admin
        .firestore()
        .collection('medicines')
        .doc(scheduleData.medicineId)
        .get();

      if (!medicineDoc.exists) {
        console.error(
          `Medicine ${scheduleData.medicineId} not found for schedule ${scheduleId}`,
        );
        return;
      }

      const medicineData = medicineDoc.data();

      // Delete all future doses for this schedule
      const now = admin.firestore.Timestamp.now();
      const futureDosesSnapshot = await admin
        .firestore()
        .collection('doses')
        .where('scheduleId', '==', scheduleId)
        .where('scheduledTime', '>', now)
        .get();

      // Delete future doses in batches
      const deleteBatch = admin.firestore().batch();
      futureDosesSnapshot.docs.forEach(doc => {
        deleteBatch.delete(doc.ref);
      });
      await deleteBatch.commit();

      console.log(
        `Deleted ${futureDosesSnapshot.size} future doses for schedule ${scheduleId}`,
      );

      // Only generate new doses if medicine is active (Requirement 7.2)
      if (medicineData.status !== 'active') {
        console.log(
          `Medicine ${scheduleData.medicineId} is inactive, skipping dose generation`,
        );
        return;
      }

      // Prepare schedule and medicine objects with IDs
      const schedule = {
        id: scheduleId,
        ...scheduleData,
      };

      const medicine = {
        id: medicineDoc.id,
        ...medicineData,
      };

      // Generate new doses for the next 7 days (Requirements 8.1-8.5)
      const startDate = new Date();
      const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

      // Write doses to Firestore in batches (Requirements 9.1, 9.2, 9.4)
      const dosesWritten = await writeDosesInBatches(admin.firestore(), doses);

      // Requirement 9.5: Log dose creation count
      console.log(
        `Successfully regenerated ${dosesWritten} doses for schedule ${scheduleId}`,
      );
    } catch (error) {
      console.error(
        `Error regenerating doses for schedule ${event.params.scheduleId}:`,
        error,
      );
      // Don't throw - we don't want to retry indefinitely
    }
  },
);

/**
 * scheduledCleanupOldDoses - Scheduled Cloud Function
 *
 * Runs daily to clean up dose records older than 30 days.
 * This function is triggered by Cloud Scheduler and helps maintain database performance.
 *
 * Requirements: 6.5 - Delete old doses while preserving recent historical records
 *
 * @returns {Promise<void>}
 */
exports.scheduledCleanupOldDoses = onSchedule('0 2 * * *', async event => {
  const { cleanupOldDoses } = require('./cleanupOldDoses');

  try {
    console.log('Starting scheduled dose cleanup...');

    const deletedCount = await cleanupOldDoses(admin.firestore());

    console.log(
      `Scheduled cleanup completed successfully. Deleted ${deletedCount} old doses.`,
    );

    return null;
  } catch (error) {
    console.error('Error during scheduled dose cleanup:', error);
    // Don't throw - we don't want the function to be marked as failed
    // The error is logged for monitoring
    return null;
  }
});
