const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Import escalation functions
const { scheduledDoseCheck } = require('./src/scheduledDoseCheck');
const {
  sendMissedDoseNotification,
} = require('./src/sendMissedDoseNotification');

// Export functions
exports.scheduledDoseCheck = scheduledDoseCheck;
exports.sendMissedDoseNotification = sendMissedDoseNotification;
