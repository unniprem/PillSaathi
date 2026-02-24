/**
 * Relationship Diagnostics Utility
 *
 * Helper functions to diagnose and fix relationship pairing issues.
 * Use these in development to debug "already connected" errors.
 */

import firestore from '@react-native-firebase/firestore';

/**
 * Check all relationships for a user
 *
 * @param {string} uid - User's Firebase Auth UID
 * @param {string} role - User's role ('parent' or 'caregiver')
 * @returns {Promise<Array>} List of relationships
 */
export async function checkUserRelationships(uid, role) {
  const db = firestore();
  const field = role === 'parent' ? 'parentUid' : 'caregiverUid';

  const snapshot = await db
    .collection('relationships')
    .where(field, '==', uid)
    .get();

  const relationships = [];
  snapshot.forEach(doc => {
    relationships.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  console.log(
    `[Diagnostics] Found ${relationships.length} relationships for ${role} ${uid}`,
  );
  relationships.forEach(rel => {
    console.log(`  - ${rel.id}:`, rel);
  });

  return relationships;
}

/**
 * Check if a specific relationship exists
 *
 * @param {string} parentUid - Parent's UID
 * @param {string} caregiverUid - Caregiver's UID
 * @returns {Promise<Object>} Relationship check result
 */
export async function checkSpecificRelationship(parentUid, caregiverUid) {
  const db = firestore();
  const relationshipId = `${parentUid}_${caregiverUid}`;

  const doc = await db.collection('relationships').doc(relationshipId).get();

  // Handle both function and property for exists (different Firebase versions)
  const docExists =
    typeof doc.exists === 'function' ? doc.exists() : doc.exists;

  const result = {
    relationshipId,
    exists: docExists,
    data: docExists ? doc.data() : null,
  };

  console.log('[Diagnostics] Relationship check:', result);

  return result;
}

/**
 * Delete a specific relationship (for debugging)
 *
 * @param {string} relationshipId - Relationship ID to delete
 * @returns {Promise<void>}
 */
export async function deleteRelationship(relationshipId) {
  const db = firestore();

  const doc = await db.collection('relationships').doc(relationshipId).get();

  // Handle both function and property for exists (different Firebase versions)
  const docExists =
    typeof doc.exists === 'function' ? doc.exists() : doc.exists;

  if (!docExists) {
    console.log(`[Diagnostics] Relationship ${relationshipId} does not exist`);
    return;
  }

  console.log(
    `[Diagnostics] Deleting relationship ${relationshipId}:`,
    doc.data(),
  );
  await doc.ref.delete();
  console.log(`[Diagnostics] Relationship ${relationshipId} deleted`);
}

/**
 * Find and remove duplicate relationships
 *
 * @param {string} uid - User's UID
 * @param {string} role - User's role
 * @returns {Promise<Array>} List of deleted relationship IDs
 */
export async function findAndRemoveDuplicates(uid, role) {
  const relationships = await checkUserRelationships(uid, role);

  // Group by the other user's UID
  const otherField = role === 'parent' ? 'caregiverUid' : 'parentUid';
  const grouped = {};

  relationships.forEach(rel => {
    const otherUid = rel[otherField];
    if (!grouped[otherUid]) {
      grouped[otherUid] = [];
    }
    grouped[otherUid].push(rel);
  });

  // Find duplicates (more than one relationship with same other user)
  const duplicates = [];
  Object.entries(grouped).forEach(([otherUid, rels]) => {
    if (rels.length > 1) {
      console.log(
        `[Diagnostics] Found ${rels.length} duplicate relationships with ${otherUid}`,
      );
      // Keep the oldest one, delete the rest
      rels.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return aTime - bTime;
      });

      // Delete all but the first (oldest)
      for (let i = 1; i < rels.length; i++) {
        duplicates.push(rels[i].id);
      }
    }
  });

  // Delete duplicates
  for (const relId of duplicates) {
    await deleteRelationship(relId);
  }

  console.log(
    `[Diagnostics] Removed ${duplicates.length} duplicate relationships`,
  );
  return duplicates;
}

/**
 * Run full diagnostic check
 *
 * @param {string} uid - User's UID
 * @param {string} role - User's role
 * @returns {Promise<Object>} Diagnostic report
 */
export async function runFullDiagnostic(uid, role) {
  console.log('=== RELATIONSHIP DIAGNOSTIC ===');
  console.log(`User: ${uid}`);
  console.log(`Role: ${role}`);

  const relationships = await checkUserRelationships(uid, role);

  const report = {
    uid,
    role,
    totalRelationships: relationships.length,
    relationships: relationships.map(r => ({
      id: r.id,
      parentUid: r.parentUid,
      caregiverUid: r.caregiverUid,
      createdAt: r.createdAt?.toDate?.() || r.createdAt,
    })),
  };

  console.log('=== DIAGNOSTIC REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  return report;
}
