/**
 * Adherence Calculations
 * Helper functions for calculating medication adherence metrics
 * Requirements: Phase 5 - Escalation (Adherence Dashboard)
 */

/**
 * Calculates overall adherence metrics from an array of doses.
 *
 * Adherence rate is calculated as (taken / total) * 100.
 * Handles edge cases including null/undefined inputs, empty arrays, and invalid dose objects.
 *
 * @param {Array<Object>} doses - Array of dose objects with status field
 * @param {string} doses[].status - Dose status: 'taken', 'missed', 'snoozed', or 'pending'
 * @returns {Object} Adherence metrics object
 * @returns {number} returns.percentage - Adherence percentage (0-100), rounded to nearest integer
 * @returns {number} returns.taken - Count of doses with status 'taken'
 * @returns {number} returns.missed - Count of doses with status 'missed'
 * @returns {number} returns.snoozed - Count of doses with status 'snoozed'
 * @returns {number} returns.pending - Count of doses with status 'pending'
 * @returns {number} returns.total - Total count of valid doses
 *
 * @example
 * const doses = [
 *   { status: 'taken' },
 *   { status: 'taken' },
 *   { status: 'missed' }
 * ];
 * const result = calculateAdherence(doses);
 * // Returns: { percentage: 67, taken: 2, missed: 1, snoozed: 0, pending: 0, total: 3 }
 *
 * @example
 * // Edge case: empty array
 * calculateAdherence([]);
 * // Returns: { percentage: 0, taken: 0, missed: 0, snoozed: 0, pending: 0, total: 0 }
 */
export function calculateAdherence(doses) {
  // Handle edge cases: null, undefined, non-array, or empty array
  if (!doses || !Array.isArray(doses) || doses.length === 0) {
    return {
      percentage: 0,
      taken: 0,
      missed: 0,
      snoozed: 0,
      total: 0,
    };
  }

  // Filter out invalid dose objects (missing status field)
  const validDoses = doses.filter(
    dose => dose && typeof dose.status === 'string',
  );

  // Handle case where all doses are invalid
  if (validDoses.length === 0) {
    return {
      percentage: 0,
      taken: 0,
      missed: 0,
      snoozed: 0,
      total: 0,
    };
  }

  // Count doses by status
  const taken = validDoses.filter(dose => dose.status === 'taken').length;
  const missed = validDoses.filter(dose => dose.status === 'missed').length;
  const snoozed = validDoses.filter(dose => dose.status === 'snoozed').length;
  const pending = validDoses.filter(dose => dose.status === 'pending').length;
  const total = validDoses.length;

  // Calculate adherence percentage
  // Adherence rate = (taken / total) * 100
  // Handle edge case: all missed (0% adherence)
  // Handle edge case: all taken (100% adherence)
  const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

  return {
    percentage,
    taken,
    missed,
    snoozed,
    pending,
    total,
  };
}

/**
 * Calculates adherence metrics grouped by medicine.
 *
 * Groups doses by medicineId and calculates adherence for each medicine separately.
 * Useful for displaying per-medicine adherence breakdown in the dashboard.
 * Handles edge cases including missing medicineId fields and invalid doses.
 *
 * @param {Array<Object>} doses - Array of dose objects with medicineId and status fields
 * @param {string} doses[].medicineId - Unique identifier for the medicine
 * @param {string} doses[].status - Dose status: 'taken', 'missed', 'snoozed', or 'pending'
 * @returns {Object<string, Object>} Map of medicineId to adherence metrics
 * @returns {Object} returns[medicineId] - Adherence metrics for specific medicine (same structure as calculateAdherence)
 * @returns {number} returns[medicineId].percentage - Adherence percentage for this medicine
 * @returns {number} returns[medicineId].taken - Count of taken doses for this medicine
 * @returns {number} returns[medicineId].missed - Count of missed doses for this medicine
 * @returns {number} returns[medicineId].snoozed - Count of snoozed doses for this medicine
 * @returns {number} returns[medicineId].pending - Count of pending doses for this medicine
 * @returns {number} returns[medicineId].total - Total doses for this medicine
 *
 * @example
 * const doses = [
 *   { medicineId: 'med1', status: 'taken' },
 *   { medicineId: 'med1', status: 'missed' },
 *   { medicineId: 'med2', status: 'taken' }
 * ];
 * const result = getAdherenceByMedicine(doses);
 * // Returns: {
 * //   med1: { percentage: 50, taken: 1, missed: 1, snoozed: 0, pending: 0, total: 2 },
 * //   med2: { percentage: 100, taken: 1, missed: 0, snoozed: 0, pending: 0, total: 1 }
 * // }
 *
 * @example
 * // Edge case: doses without medicineId are ignored
 * getAdherenceByMedicine([{ status: 'taken' }]);
 * // Returns: {}
 */
export function getAdherenceByMedicine(doses) {
  // Handle edge cases: null, undefined, non-array, or empty array
  if (!doses || !Array.isArray(doses) || doses.length === 0) {
    return {};
  }

  // Group doses by medicineId
  const dosesByMedicine = doses.reduce((acc, dose) => {
    // Handle edge case: dose is null/undefined or missing medicineId
    if (!dose || !dose.medicineId) {
      return acc;
    }

    const medicineId = dose.medicineId;
    if (!acc[medicineId]) {
      acc[medicineId] = [];
    }
    acc[medicineId].push(dose);
    return acc;
  }, {});

  // Handle edge case: no valid doses with medicineId
  if (Object.keys(dosesByMedicine).length === 0) {
    return {};
  }

  // Calculate adherence for each medicine
  const adherenceByMedicine = {};
  Object.keys(dosesByMedicine).forEach(medicineId => {
    adherenceByMedicine[medicineId] = calculateAdherence(
      dosesByMedicine[medicineId],
    );
  });

  return adherenceByMedicine;
}

/**
 * Calculates adherence trend over specified time periods.
 *
 * Filters doses within the specified time period and calculates adherence metrics.
 * Supports Firestore Timestamp objects and JavaScript Date objects for scheduledTime.
 * Useful for displaying adherence over different time ranges (7 days, 30 days, all time).
 *
 * @param {Array<Object>} doses - Array of dose objects with scheduledTime and status fields
 * @param {string} doses[].status - Dose status: 'taken', 'missed', 'snoozed', or 'pending'
 * @param {(Date|Object)} doses[].scheduledTime - Scheduled time as Date or Firestore Timestamp
 * @param {string} [period='7d'] - Time period to analyze: '7d', '30d', or 'all'
 * @returns {Object} Adherence metrics for the specified period
 * @returns {number} returns.percentage - Adherence percentage (0-100) for the period
 * @returns {number} returns.taken - Count of taken doses in the period
 * @returns {number} returns.missed - Count of missed doses in the period
 * @returns {number} returns.snoozed - Count of snoozed doses in the period
 * @returns {number} returns.pending - Count of pending doses in the period
 * @returns {number} returns.total - Total doses in the period
 *
 * @example
 * const doses = [
 *   { status: 'taken', scheduledTime: new Date('2026-02-20') },
 *   { status: 'missed', scheduledTime: new Date('2026-02-19') },
 *   { status: 'taken', scheduledTime: new Date('2026-01-01') }
 * ];
 * const result = getAdherenceTrend(doses, '7d');
 * // Returns adherence for last 7 days only (first two doses)
 * // { percentage: 50, taken: 1, missed: 1, snoozed: 0, pending: 0, total: 2 }
 *
 * @example
 * // All time period
 * getAdherenceTrend(doses, 'all');
 * // Returns adherence for all doses
 * // { percentage: 67, taken: 2, missed: 1, snoozed: 0, pending: 0, total: 3 }
 *
 * @example
 * // Invalid period defaults to '7d'
 * getAdherenceTrend(doses, 'invalid');
 * // Same as getAdherenceTrend(doses, '7d')
 */
export function getAdherenceTrend(doses, period = '7d') {
  // Handle edge cases: null, undefined, non-array, or empty array
  if (!doses || !Array.isArray(doses) || doses.length === 0) {
    return {
      percentage: 0,
      taken: 0,
      missed: 0,
      snoozed: 0,
      pending: 0,
      total: 0,
    };
  }

  // Handle edge case: invalid period, default to 7d
  const validPeriods = ['7d', '30d', 'all'];
  const normalizedPeriod = validPeriods.includes(period) ? period : '7d';

  // Calculate date range based on period
  const now = new Date();
  let startDate;

  switch (normalizedPeriod) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
      startDate = new Date(0); // Beginning of time
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Filter doses within the period
  const filteredDoses = doses.filter(dose => {
    // Handle edge case: dose is null/undefined or missing scheduledTime
    if (!dose || !dose.scheduledTime) {
      return false;
    }

    // Handle both Firestore Timestamp and Date objects
    let doseDate;
    try {
      if (dose.scheduledTime.toDate) {
        // Firestore Timestamp
        doseDate = dose.scheduledTime.toDate();
      } else if (dose.scheduledTime instanceof Date) {
        doseDate = dose.scheduledTime;
      } else {
        // Try to parse as date
        doseDate = new Date(dose.scheduledTime);
      }

      // Handle edge case: invalid date
      if (isNaN(doseDate.getTime())) {
        return false;
      }

      return doseDate >= startDate && doseDate <= now;
    } catch (error) {
      // Handle edge case: error parsing date
      return false;
    }
  });

  // Handle edge case: no doses in the specified period
  if (filteredDoses.length === 0) {
    return {
      percentage: 0,
      taken: 0,
      missed: 0,
      snoozed: 0,
      pending: 0,
      total: 0,
    };
  }

  // Calculate adherence for filtered doses
  return calculateAdherence(filteredDoses);
}
