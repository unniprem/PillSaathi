/**
 * Relationship Utilities
 *
 * Utility functions for managing relationship data, including parent alias functionality.
 * Provides functions for getting and setting parent aliases in the relationships collection.
 *
 * Requirements: 16.1, 16.2, 16.3
 */

import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

// Collection name constant
const RELATIONSHIPS_COLLECTION = 'relationships';

/**
 * Get parent alias for a specific relationship
 * Retrieves the custom nickname/alias that a caregiver has set for a parent.
 * Returns null if no alias is set.
 *
 * Requirements: 16.2 - Use alias throughout caregiver interface
 *
 * @param {string} relationshipId - The relationship document ID
 * @param {Object} firestoreInstance - Optional Firestore instance for testing
 * @returns {Promise<string|null>} The parent alias or null if not set
 * @throws {Error} If the relationship doesn't exist or query fails
 *
 * @example
 * try {
 *   const alias = await getParentAlias('relationship123');
 *   console.log('Parent alias:', alias || 'No alias set');
 * } catch (error) {
 *   console.error('Failed to get alias:', error.message);
 * }
 */
export async function getParentAlias(relationshipId, firestoreInstance = null) {
  try {
    const firestore = firestoreInstance || getFirestore(getApp());
    const relationshipDoc = await firestore
      .collection(RELATIONSHIPS_COLLECTION)
      .doc(relationshipId)
      .get();

    if (!relationshipDoc.exists) {
      const error = new Error('Relationship not found');
      error.code = 'relationship-not-found';
      throw error;
    }

    const data = relationshipDoc.data();
    return data.parentAlias || null;
  } catch (error) {
    if (error.code === 'relationship-not-found') {
      throw error;
    }

    const mappedError = new Error('Failed to get parent alias');
    mappedError.code = 'alias-fetch-failed';
    mappedError.originalError = error;
    throw mappedError;
  }
}

/**
 * Set parent alias for a specific relationship
 * Allows a caregiver to set a custom nickname/alias for a parent.
 * The parent's actual name in the database remains unchanged.
 *
 * Requirements: 16.1 - Provide option to edit parent display name
 * Requirements: 16.2 - Use alias throughout caregiver interface
 * Requirements: 16.3 - Preserve parent's actual name in database
 *
 * @param {string} relationshipId - The relationship document ID
 * @param {string} alias - The alias to set (can be empty string to clear)
 * @param {Object} firestoreInstance - Optional Firestore instance for testing
 * @returns {Promise<void>}
 * @throws {Error} If the relationship doesn't exist or update fails
 *
 * @example
 * try {
 *   await setParentAlias('relationship123', 'Mom');
 *   console.log('Alias updated successfully');
 * } catch (error) {
 *   console.error('Failed to set alias:', error.message);
 * }
 */
export async function setParentAlias(
  relationshipId,
  alias,
  firestoreInstance = null,
) {
  try {
    const firestore = firestoreInstance || getFirestore(getApp());
    const relationshipRef = firestore
      .collection(RELATIONSHIPS_COLLECTION)
      .doc(relationshipId);

    // Check if relationship exists
    const relationshipDoc = await relationshipRef.get();
    if (!relationshipDoc.exists) {
      const error = new Error('Relationship not found');
      error.code = 'relationship-not-found';
      throw error;
    }

    // Update the alias field
    // If alias is empty string or null, we still set it (allows clearing)
    await relationshipRef.update({
      parentAlias: alias || null,
      updatedAt: new Date(),
    });
  } catch (error) {
    if (error.code === 'relationship-not-found') {
      throw error;
    }

    const mappedError = new Error('Failed to set parent alias');
    mappedError.code = 'alias-update-failed';
    mappedError.originalError = error;
    throw mappedError;
  }
}

/**
 * Get display name for a parent in a relationship
 * Returns the alias if set, otherwise returns the parent's actual name.
 * This is a convenience function for displaying parent names in the UI.
 *
 * Requirements: 16.2 - Use alias throughout caregiver interface
 *
 * @param {Object} relationship - Relationship object with parentName and optional parentAlias
 * @returns {string} The display name (alias if set, otherwise actual name)
 *
 * @example
 * const relationship = {
 *   parentName: 'John Doe',
 *   parentAlias: 'Dad'
 * };
 * const displayName = getParentDisplayName(relationship);
 * console.log(displayName); // 'Dad'
 */
export function getParentDisplayName(relationship) {
  if (!relationship) {
    return '';
  }
  return relationship.parentAlias || relationship.parentName || '';
}
