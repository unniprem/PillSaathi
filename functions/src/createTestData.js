/**
 * Script to create test data for Phase 5 escalation testing
 *
 * This script creates:
 * - Test parent user
 * - Test medicine (active)
 * - Test dose 35 minutes in the past (status: pending)
 * - Test caregiver user
 * - Relationship between parent and caregiver
 * - Device token for caregiver
 *
 * Usage:
 *   node src/createTestData.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (uses default credentials)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'pillsathi-dev',
  });
}

const db = admin.firestore();

/**
 * Create test parent user
 */
async function createTestParent() {
  const parentId = 'test-parent-' + Date.now();
  const parentData = {
    uid: parentId,
    email: 'testparent@example.com',
    displayName: 'Test Parent',
    phoneNumber: '+1234567890',
    role: 'parent',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(parentId).set(parentData);
  console.log('✓ Created test parent user:', parentId);
  return parentId;
}

/**
 * Create test caregiver user
 */
async function createTestCaregiver() {
  const caregiverId = 'test-caregiver-' + Date.now();
  const caregiverData = {
    uid: caregiverId,
    email: 'testcaregiver@example.com',
    displayName: 'Test Caregiver',
    phoneNumber: '+1987654321',
    role: 'caregiver',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(caregiverId).set(caregiverData);
  console.log('✓ Created test caregiver user:', caregiverId);
  return caregiverId;
}

/**
 * Create test medicine (active)
 */
async function createTestMedicine(parentId) {
  const medicineId = 'test-medicine-' + Date.now();
  const medicineData = {
    id: medicineId,
    parentId: parentId,
    name: 'Test Medicine',
    dosage: '10mg',
    instructions: 'Take with food',
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('medicines').doc(medicineId).set(medicineData);
  console.log('✓ Created test medicine:', medicineId);
  return medicineId;
}

/**
 * Create test dose 35 minutes in the past (status: pending)
 */
async function createTestDose(parentId, medicineId) {
  const doseId = 'test-dose-' + Date.now();

  // Create a timestamp 35 minutes in the past
  const now = new Date();
  const scheduledTime = new Date(now.getTime() - 35 * 60 * 1000);

  const doseData = {
    id: doseId,
    parentId: parentId,
    medicineId: medicineId,
    scheduledTime: admin.firestore.Timestamp.fromDate(scheduledTime),
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('doses').doc(doseId).set(doseData);
  console.log('✓ Created test dose (35 min ago):', doseId);
  console.log('  Scheduled time:', scheduledTime.toISOString());
  return doseId;
}

/**
 * Create relationship between parent and caregiver
 */
async function createRelationship(parentId, caregiverId) {
  const relationshipId = 'test-relationship-' + Date.now();
  const relationshipData = {
    id: relationshipId,
    parentId: parentId,
    caregiverId: caregiverId,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db
    .collection('relationships')
    .doc(relationshipId)
    .set(relationshipData);
  console.log('✓ Created relationship:', relationshipId);
  return relationshipId;
}

/**
 * Create device token for caregiver
 */
async function createDeviceToken(caregiverId) {
  const tokenId = 'test-token-' + Date.now();
  const tokenData = {
    id: tokenId,
    userId: caregiverId,
    token: 'test-fcm-token-' + Date.now(),
    platform: 'android',
    enabled: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('deviceTokens').doc(tokenId).set(tokenData);
  console.log('✓ Created device token:', tokenId);
  return tokenId;
}

/**
 * Main function to create all test data
 */
async function main() {
  try {
    console.log('\n🚀 Creating test data for Phase 5 escalation...\n');

    // Create test parent
    const parentId = await createTestParent();

    // Create test caregiver
    const caregiverId = await createTestCaregiver();

    // Create test medicine
    const medicineId = await createTestMedicine(parentId);

    // Create test dose (35 minutes in the past)
    const doseId = await createTestDose(parentId, medicineId);

    // Create relationship
    const relationshipId = await createRelationship(parentId, caregiverId);

    // Create device token
    const tokenId = await createDeviceToken(caregiverId);

    console.log('\n✅ Test data created successfully!\n');
    console.log('Summary:');
    console.log('  Parent ID:', parentId);
    console.log('  Caregiver ID:', caregiverId);
    console.log('  Medicine ID:', medicineId);
    console.log('  Dose ID:', doseId);
    console.log('  Relationship ID:', relationshipId);
    console.log('  Device Token ID:', tokenId);
    console.log('\nYou can now test the escalation flow by:');
    console.log('  1. Manually triggering scheduledDoseCheck function');
    console.log('  2. Waiting for the next scheduled run (every 5 minutes)');
    console.log('  3. Checking the dose status changes to "missed"');
    console.log('  4. Verifying FCM notification is sent to caregiver\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

// Run the script
main();
