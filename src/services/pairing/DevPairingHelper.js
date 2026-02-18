/**
 * DevPairingHelper - Development Helper for Testing Pairing
 *
 * This helper allows testing pairing functionality without deployed Cloud Functions.
 * ONLY USE FOR DEVELOPMENT/TESTING - NOT FOR PRODUCTION
 *
 * To use this helper:
 * 1. Import it in CaregiverPairingScreen
 * 2. Replace CloudFunctionsService.redeemInviteCode with DevPairingHelper.redeemInviteCodeDev
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

class DevPairingHelper {
  constructor() {
    this.firestore = getFirestore(getApp());
  }

  /**
   * Development version of redeemInviteCode
   * Directly creates relationship in Firestore without Cloud Function
   *
   * @param {string} code - Invite code to redeem
   * @param {string} caregiverUid - Caregiver's UID
   * @returns {Promise<{success: boolean, relationshipId: string, message: string}>}
   */
  async redeemInviteCodeDev(code, caregiverUid) {
    console.log('[DevPairingHelper] redeemInviteCodeDev called', {
      code,
      caregiverUid,
    });

    try {
      // Validate code format
      const codeUppercase = code.toUpperCase();
      const codeFormatRegex = /^[A-Z0-9]{8}$/;

      if (!codeFormatRegex.test(codeUppercase)) {
        console.error('[DevPairingHelper] Invalid code format');
        const error = new Error(
          'Invalid code format. Code must be 8 alphanumeric characters',
        );
        error.code = 'invalid-argument';
        throw error;
      }

      console.log(
        '[DevPairingHelper] Querying for invite code:',
        codeUppercase,
      );

      // Query for invite code
      const inviteCodesSnapshot = await this.firestore
        .collection('inviteCodes')
        .where('code', '==', codeUppercase)
        .limit(1)
        .get();

      console.log('[DevPairingHelper] Query result:', {
        empty: inviteCodesSnapshot.empty,
        size: inviteCodesSnapshot.size,
      });

      // Check if code exists
      if (inviteCodesSnapshot.empty) {
        console.error('[DevPairingHelper] Code not found');
        const error = new Error(
          'Invalid invite code. Please check the code and try again',
        );
        error.code = 'not-found';
        throw error;
      }

      const inviteCodeDoc = inviteCodesSnapshot.docs[0];
      const inviteCodeData = inviteCodeDoc.data();

      console.log('[DevPairingHelper] Found invite code:', {
        parentUid: inviteCodeData.parentUid,
        expiresAt: inviteCodeData.expiresAt,
      });

      // Check if code is expired
      const now = new Date();
      const expiresAt = inviteCodeData.expiresAt.toDate();

      if (expiresAt <= now) {
        console.error('[DevPairingHelper] Code expired');
        const error = new Error(
          'This invite code has expired. Please request a new code from the parent',
        );
        error.code = 'failed-precondition';
        throw error;
      }

      // Check if code has already been used
      if (inviteCodeData.used === true) {
        console.error('[DevPairingHelper] Code already used');
        const error = new Error(
          'This invite code has already been used. Please request a new code from the parent',
        );
        error.code = 'failed-precondition';
        throw error;
      }

      const { parentUid } = inviteCodeData;

      console.log('[DevPairingHelper] Checking for existing relationship');

      // Check for existing relationship (prevent duplicate caregiver-parent pairs)
      const existingRelationshipSnapshot = await this.firestore
        .collection('relationships')
        .where('parentUid', '==', parentUid)
        .where('caregiverUid', '==', caregiverUid)
        .limit(1)
        .get();

      // If relationship already exists, return error
      if (!existingRelationshipSnapshot.empty) {
        console.log('[DevPairingHelper] Relationship already exists');
        const error = new Error('You are already connected with this parent');
        error.code = 'already-exists';
        throw error;
      }

      console.log('[DevPairingHelper] Creating new relationship');

      // Create new relationship document
      const relationshipRef = await this.firestore
        .collection('relationships')
        .add({
          parentUid,
          caregiverUid,
          createdAt: new Date(),
          createdBy: caregiverUid,
        });

      console.log(
        '[DevPairingHelper] Relationship created:',
        relationshipRef.id,
      );

      // Mark the invite code as used and increment usedCount
      await inviteCodeDoc.ref.update({
        used: true,
        usedCount: (inviteCodeData.usedCount || 0) + 1,
        usedAt: new Date(),
        usedBy: caregiverUid,
      });

      console.log('[DevPairingHelper] Success!');

      return {
        success: true,
        relationshipId: relationshipRef.id,
        message: 'Relationship created successfully',
      };
    } catch (error) {
      console.error('[DevPairingHelper] Error:', error);
      // Map errors similar to Cloud Function
      if (error.code) {
        throw error;
      }

      console.error('Error redeeming invite code:', error);
      const mappedError = new Error(
        'An error occurred while redeeming the invite code. Please try again',
      );
      mappedError.code = 'internal';
      mappedError.originalError = error;
      throw mappedError;
    }
  }

  /**
   * Development version of removeRelationship
   * Directly removes relationship in Firestore without Cloud Function
   * Only allows caregivers to remove relationships
   *
   * @param {string} relationshipId - Relationship ID to remove
   * @param {string} caregiverUid - Caregiver's UID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async removeRelationshipDev(relationshipId, caregiverUid) {
    console.log('[DevPairingHelper] removeRelationshipDev called', {
      relationshipId,
      caregiverUid,
    });

    try {
      // Fetch relationship document
      const relationshipDoc = await this.firestore
        .collection('relationships')
        .doc(relationshipId)
        .get();

      // Check if relationship exists
      if (!relationshipDoc.exists) {
        console.error('[DevPairingHelper] Relationship not found');
        const error = new Error('Relationship not found');
        error.code = 'not-found';
        throw error;
      }

      const relationshipData = relationshipDoc.data();
      const { caregiverUid: relationshipCaregiverUid } = relationshipData;

      console.log('[DevPairingHelper] Relationship data:', {
        relationshipCaregiverUid,
        requestingCaregiverUid: caregiverUid,
      });

      // Verify requesting user is the caregiver in the relationship
      if (caregiverUid !== relationshipCaregiverUid) {
        console.error('[DevPairingHelper] Permission denied');
        const error = new Error('Only caregivers can remove relationships');
        error.code = 'permission-denied';
        throw error;
      }

      console.log('[DevPairingHelper] Deleting relationship');

      // Delete relationship document
      await relationshipDoc.ref.delete();

      console.log('[DevPairingHelper] Relationship removed successfully');

      return {
        success: true,
        message: 'Relationship removed successfully',
      };
    } catch (error) {
      console.error('[DevPairingHelper] Error:', error);
      // Map errors similar to Cloud Function
      if (error.code) {
        throw error;
      }

      console.error('Error removing relationship:', error);
      const mappedError = new Error(
        'An error occurred while removing the relationship. Please try again',
      );
      mappedError.code = 'internal';
      mappedError.originalError = error;
      throw mappedError;
    }
  }
}

export default new DevPairingHelper();
