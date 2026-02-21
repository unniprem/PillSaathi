/**
 * Unit tests for adherence calculations
 * Tests edge cases: no doses, all missed, invalid data, etc.
 */

import {
  calculateAdherence,
  getAdherenceByMedicine,
  getAdherenceTrend,
} from '../adherenceCalculations';

describe('calculateAdherence', () => {
  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = calculateAdherence(null);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
      });
    });

    it('should handle undefined input', () => {
      const result = calculateAdherence(undefined);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
      });
    });

    it('should handle empty array', () => {
      const result = calculateAdherence([]);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
      });
    });

    it('should handle non-array input', () => {
      const result = calculateAdherence('not an array');
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
      });
    });

    it('should handle array with invalid dose objects', () => {
      const doses = [null, undefined, {}, { id: '123' }];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        total: 0,
      });
    });

    it('should handle all missed doses', () => {
      const doses = [
        { status: 'missed' },
        { status: 'missed' },
        { status: 'missed' },
      ];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 3,
        snoozed: 0,
        pending: 0,
        total: 3,
      });
    });

    it('should handle all taken doses', () => {
      const doses = [
        { status: 'taken' },
        { status: 'taken' },
        { status: 'taken' },
      ];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 100,
        taken: 3,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 3,
      });
    });

    it('should handle all snoozed doses', () => {
      const doses = [{ status: 'snoozed' }, { status: 'snoozed' }];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 2,
        pending: 0,
        total: 2,
      });
    });

    it('should handle all pending doses', () => {
      const doses = [{ status: 'pending' }, { status: 'pending' }];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 2,
        total: 2,
      });
    });

    it('should filter out doses with missing status', () => {
      const doses = [
        { status: 'taken' },
        { id: '123' }, // missing status
        { status: 'missed' },
        null,
        { status: 'taken' },
      ];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 67, // 2 taken out of 3 valid
        taken: 2,
        missed: 1,
        snoozed: 0,
        pending: 0,
        total: 3,
      });
    });
  });

  describe('normal cases', () => {
    it('should calculate adherence correctly with mixed statuses', () => {
      const doses = [
        { status: 'taken' },
        { status: 'taken' },
        { status: 'missed' },
        { status: 'snoozed' },
        { status: 'pending' },
      ];
      const result = calculateAdherence(doses);
      expect(result).toEqual({
        percentage: 40, // 2 taken out of 5
        taken: 2,
        missed: 1,
        snoozed: 1,
        pending: 1,
        total: 5,
      });
    });
  });
});

describe('getAdherenceByMedicine', () => {
  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = getAdherenceByMedicine(null);
      expect(result).toEqual({});
    });

    it('should handle undefined input', () => {
      const result = getAdherenceByMedicine(undefined);
      expect(result).toEqual({});
    });

    it('should handle empty array', () => {
      const result = getAdherenceByMedicine([]);
      expect(result).toEqual({});
    });

    it('should handle non-array input', () => {
      const result = getAdherenceByMedicine('not an array');
      expect(result).toEqual({});
    });

    it('should handle doses without medicineId', () => {
      const doses = [
        { status: 'taken' },
        { status: 'missed' },
        null,
        undefined,
      ];
      const result = getAdherenceByMedicine(doses);
      expect(result).toEqual({});
    });

    it('should filter out null/undefined doses', () => {
      const doses = [
        { medicineId: 'med1', status: 'taken' },
        null,
        { medicineId: 'med1', status: 'missed' },
        undefined,
        { medicineId: 'med2', status: 'taken' },
      ];
      const result = getAdherenceByMedicine(doses);
      expect(result).toEqual({
        med1: {
          percentage: 50,
          taken: 1,
          missed: 1,
          snoozed: 0,
          pending: 0,
          total: 2,
        },
        med2: {
          percentage: 100,
          taken: 1,
          missed: 0,
          snoozed: 0,
          pending: 0,
          total: 1,
        },
      });
    });

    it('should handle medicine with all missed doses', () => {
      const doses = [
        { medicineId: 'med1', status: 'missed' },
        { medicineId: 'med1', status: 'missed' },
      ];
      const result = getAdherenceByMedicine(doses);
      expect(result).toEqual({
        med1: {
          percentage: 0,
          taken: 0,
          missed: 2,
          snoozed: 0,
          pending: 0,
          total: 2,
        },
      });
    });
  });

  describe('normal cases', () => {
    it('should group doses by medicine and calculate adherence', () => {
      const doses = [
        { medicineId: 'med1', status: 'taken' },
        { medicineId: 'med1', status: 'taken' },
        { medicineId: 'med1', status: 'missed' },
        { medicineId: 'med2', status: 'taken' },
        { medicineId: 'med2', status: 'snoozed' },
      ];
      const result = getAdherenceByMedicine(doses);
      expect(result).toEqual({
        med1: {
          percentage: 67,
          taken: 2,
          missed: 1,
          snoozed: 0,
          pending: 0,
          total: 3,
        },
        med2: {
          percentage: 50,
          taken: 1,
          missed: 0,
          snoozed: 1,
          pending: 0,
          total: 2,
        },
      });
    });
  });
});

describe('getAdherenceTrend', () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = getAdherenceTrend(null);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 0,
      });
    });

    it('should handle undefined input', () => {
      const result = getAdherenceTrend(undefined);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 0,
      });
    });

    it('should handle empty array', () => {
      const result = getAdherenceTrend([]);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 0,
      });
    });

    it('should handle non-array input', () => {
      const result = getAdherenceTrend('not an array');
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 0,
      });
    });

    it('should handle invalid period and default to 7d', () => {
      const doses = [{ scheduledTime: yesterday, status: 'taken' }];
      const result = getAdherenceTrend(doses, 'invalid_period');
      expect(result.total).toBe(1);
    });

    it('should handle doses without scheduledTime', () => {
      const doses = [{ status: 'taken' }, { status: 'missed' }];
      const result = getAdherenceTrend(doses);
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 0,
      });
    });

    it('should handle null/undefined doses in array', () => {
      const doses = [
        { scheduledTime: yesterday, status: 'taken' },
        null,
        undefined,
        { scheduledTime: yesterday, status: 'missed' },
      ];
      const result = getAdherenceTrend(doses, '7d');
      expect(result).toEqual({
        percentage: 50,
        taken: 1,
        missed: 1,
        snoozed: 0,
        pending: 0,
        total: 2,
      });
    });

    it('should handle invalid date objects', () => {
      const doses = [
        { scheduledTime: 'invalid date', status: 'taken' },
        { scheduledTime: yesterday, status: 'taken' },
      ];
      const result = getAdherenceTrend(doses, '7d');
      expect(result).toEqual({
        percentage: 100,
        taken: 1,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 1,
      });
    });

    it('should handle no doses in specified period', () => {
      const doses = [{ scheduledTime: lastMonth, status: 'taken' }];
      const result = getAdherenceTrend(doses, '7d');
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 0,
      });
    });

    it('should handle Firestore Timestamp objects', () => {
      const mockTimestamp = {
        toDate: () => yesterday,
      };
      const doses = [{ scheduledTime: mockTimestamp, status: 'taken' }];
      const result = getAdherenceTrend(doses, '7d');
      expect(result).toEqual({
        percentage: 100,
        taken: 1,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 1,
      });
    });

    it('should handle error when parsing Firestore Timestamp', () => {
      const mockTimestamp = {
        toDate: () => {
          throw new Error('Parse error');
        },
      };
      const doses = [
        { scheduledTime: mockTimestamp, status: 'taken' },
        { scheduledTime: yesterday, status: 'missed' },
      ];
      const result = getAdherenceTrend(doses, '7d');
      expect(result).toEqual({
        percentage: 0,
        taken: 0,
        missed: 1,
        snoozed: 0,
        pending: 0,
        total: 1,
      });
    });
  });

  describe('normal cases', () => {
    it('should filter doses by 7d period', () => {
      const doses = [
        { scheduledTime: yesterday, status: 'taken' },
        { scheduledTime: lastWeek, status: 'taken' },
        { scheduledTime: lastMonth, status: 'missed' },
      ];
      const result = getAdherenceTrend(doses, '7d');
      expect(result).toEqual({
        percentage: 100,
        taken: 1,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 1,
      });
    });

    it('should filter doses by 30d period', () => {
      const doses = [
        { scheduledTime: yesterday, status: 'taken' },
        { scheduledTime: lastWeek, status: 'taken' },
        { scheduledTime: lastMonth, status: 'missed' },
      ];
      const result = getAdherenceTrend(doses, '30d');
      expect(result).toEqual({
        percentage: 100,
        taken: 2,
        missed: 0,
        snoozed: 0,
        pending: 0,
        total: 2,
      });
    });

    it('should include all doses for "all" period', () => {
      const doses = [
        { scheduledTime: yesterday, status: 'taken' },
        { scheduledTime: lastWeek, status: 'taken' },
        { scheduledTime: lastMonth, status: 'missed' },
      ];
      const result = getAdherenceTrend(doses, 'all');
      expect(result).toEqual({
        percentage: 67,
        taken: 2,
        missed: 1,
        snoozed: 0,
        pending: 0,
        total: 3,
      });
    });
  });
});
