const admin = require('firebase-admin');

/**
 * Send missed dose notification to all caregivers
 * @param {Object} params - Notification parameters
 * @param {string} params.doseId - Dose document ID
 * @param {string} params.parentId - Parent user ID
 * @param {string} params.medicineId - Medicine document ID
 * @param {Timestamp} params.scheduledTime - When dose was scheduled
 */
async function handler({ doseId, parentId, medicineId, scheduledTime }) {
  const db = admin.firestore();

  try {
    console.log(`Sending missed dose notification for dose ${doseId}`);

    // Get parent details
    const parentDoc = await db.collection('users').doc(parentId).get();
    if (!parentDoc.exists) {
      throw new Error(`Parent ${parentId} not found`);
    }
    const parent = parentDoc.data();
    const parentName = parent.displayName || parent.phoneNumber || 'Parent';

    // Get medicine details
    const medicineDoc = await db.collection('medicines').doc(medicineId).get();
    if (!medicineDoc.exists) {
      throw new Error(`Medicine ${medicineId} not found`);
    }
    const medicine = medicineDoc.data();
    const medicineName = medicine.name;

    // Get all caregivers for this parent
    const relationshipsSnapshot = await db
      .collection('relationships')
      .where('parentId', '==', parentId)
      .where('status', '==', 'active')
      .get();

    if (relationshipsSnapshot.empty) {
      console.log(`No active caregivers found for parent ${parentId}`);
      return { sent: 0, failed: 0 };
    }

    const caregiverIds = relationshipsSnapshot.docs.map(
      doc => doc.data().caregiverId,
    );
    console.log(
      `Found ${caregiverIds.length} caregivers for parent ${parentId}`,
    );

    // Get device tokens for all caregivers
    const tokens = [];
    for (const caregiverId of caregiverIds) {
      const tokensSnapshot = await db
        .collection('deviceTokens')
        .where('userId', '==', caregiverId)
        .where('enabled', '==', true)
        .get();

      tokensSnapshot.docs.forEach(doc => {
        tokens.push(doc.data().token);
      });
    }

    if (tokens.length === 0) {
      console.log('No device tokens found for caregivers');
      return { sent: 0, failed: 0 };
    }

    console.log(`Sending notification to ${tokens.length} devices`);

    // Format scheduled time
    const scheduledDate = scheduledTime.toDate();
    const timeString = scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Build notification payload
    const message = {
      notification: {
        title: 'Missed Dose Alert',
        body: `${parentName} missed ${medicineName} at ${timeString}`,
      },
      data: {
        type: 'missed_dose',
        doseId,
        parentId,
        medicineId,
        scheduledTime: scheduledTime.toMillis().toString(),
      },
      tokens,
    };

    // Send multicast notification
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(
      `Notification sent: ${response.successCount} succeeded, ${response.failureCount} failed`,
    );

    // Log failures
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${tokens[idx]}:`, resp.error);
        }
      });
    }

    // Log escalation event
    await db.collection('escalationLogs').add({
      doseId,
      parentId,
      medicineId,
      caregiverIds,
      scheduledTime,
      missedAt: admin.firestore.Timestamp.now(),
      notificationsSent: response.successCount,
      notificationsFailed: response.failureCount,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return {
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending missed dose notification:', error);

    // Log error to escalationLogs
    try {
      await db.collection('escalationLogs').add({
        doseId,
        parentId,
        medicineId,
        scheduledTime,
        missedAt: admin.firestore.Timestamp.now(),
        notificationsSent: 0,
        notificationsFailed: 0,
        error: error.message,
        createdAt: admin.firestore.Timestamp.now(),
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    throw error;
  }
}

exports.sendMissedDoseNotification = {
  handler,
};
