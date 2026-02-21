/**
 * Adherence Calculations
 * Helper functions for calculating medication adherence metrics
 * Requirements: Phase 5 - Escalation (Adherence Dashboard)
 */

/**
 * Calculates overall adherence metrics from an array of doses
 * @param {Array} doses - Array of dose objects
 * @returns {Object} - { percentage, taken, missed, snoozed, total }
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
 * Calculates adherence metrics grouped by medicine
 * @param {Array} doses - Array of dose objects with medicineId
 * @returns {Object} - Map of medicineId to adherence metrics
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
 * Calculates adherence trend over time periods
 * @param {Array} doses - Array of dose objects with scheduledTime
 * @param {string} period - Time period: '7d', '30d', or 'all'
 * @returns {Object} - Adherence metrics for the specified period
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
