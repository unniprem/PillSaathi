/**
 * Verify Firestore Indexes are Active
 *
 * This script tests the critical indexes needed for Phase 5:
 * 1. doses: status + scheduledTime (for scheduledDoseCheck)
 * 2. escalationLogs: parentId + createdAt (for caregiver queries)
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'pillsathi-dev',
});
const db = admin.firestore();

async function verifyIndexes() {
  console.log('🔍 Verifying Firestore Indexes...\n');

  try {
    // Test 1: Verify doses index (status + scheduledTime)
    console.log('Test 1: Querying doses with status + scheduledTime...');
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const dosesQuery = await db
      .collection('doses')
      .where('status', 'in', ['pending', 'snoozed'])
      .where('scheduledTime', '<', thirtyMinutesAgo)
      .limit(1)
      .get();

    console.log(
      `✅ Doses index active - Query returned ${dosesQuery.size} documents`,
    );

    // Test 2: Verify escalationLogs index (parentId + createdAt)
    console.log(
      '\nTest 2: Querying escalationLogs with parentId + createdAt...',
    );

    const logsQuery = await db
      .collection('escalationLogs')
      .where('parentId', '==', 'test-parent-id')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    console.log(
      `✅ EscalationLogs index active - Query returned ${logsQuery.size} documents`,
    );

    console.log('\n✅ All indexes are ACTIVE and working correctly!');
    console.log('\nIndex verification complete.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Index verification failed:');
    console.error(error.message);

    if (error.message.includes('index')) {
      console.error(
        '\n⚠️  Index may still be building. Check Firebase Console:',
      );
      console.error(
        'https://console.firebase.google.com/project/pillsathi-dev/firestore/indexes',
      );
    }

    process.exit(1);
  }
}

verifyIndexes();
