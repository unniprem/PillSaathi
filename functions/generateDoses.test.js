/**
 * Tests for dose generation logic
 */

const {
  generateDosesForSchedule,
  writeDosesInBatches,
} = require('./generateDoses');

describe('generateDosesForSchedule', () => {
  test('generates 7 doses for daily schedule with one time', () => {
    const schedule = {
      id: 'schedule1',
      medicineId: 'medicine1',
      times: ['09:00'],
      repeatPattern: 'daily',
      selectedDays: [],
    };

    const medicine = {
      id: 'medicine1',
      parentId: 'parent1',
      name: 'Test Medicine',
      dosageAmount: 10,
      dosageUnit: 'mg',
    };

    const startDate = new Date('2024-01-01T00:00:00Z');
    const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

    // Should generate 7 doses (one per day for 7 days)
    expect(doses).toHaveLength(7);

    // Verify first dose
    expect(doses[0]).toMatchObject({
      medicineId: 'medicine1',
      scheduleId: 'schedule1',
      parentId: 'parent1',
      medicineName: 'Test Medicine',
      dosageAmount: 10,
      dosageUnit: 'mg',
      status: 'pending',
    });

    // Verify scheduled times are correct
    expect(doses[0].scheduledTime.getHours()).toBe(9);
    expect(doses[0].scheduledTime.getMinutes()).toBe(0);
  });

  test('generates multiple doses per day for schedule with multiple times', () => {
    const schedule = {
      id: 'schedule1',
      medicineId: 'medicine1',
      times: ['09:00', '14:00', '21:00'],
      repeatPattern: 'daily',
      selectedDays: [],
    };

    const medicine = {
      id: 'medicine1',
      parentId: 'parent1',
      name: 'Test Medicine',
      dosageAmount: 10,
      dosageUnit: 'mg',
    };

    const startDate = new Date('2024-01-01T00:00:00Z');
    const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

    // Should generate 21 doses (3 times per day for 7 days)
    expect(doses).toHaveLength(21);
  });

  test('generates doses only for selected days with specific_days pattern', () => {
    const schedule = {
      id: 'schedule1',
      medicineId: 'medicine1',
      times: ['09:00'],
      repeatPattern: 'specific_days',
      selectedDays: [1, 3, 5], // Monday, Wednesday, Friday
    };

    const medicine = {
      id: 'medicine1',
      parentId: 'parent1',
      name: 'Test Medicine',
      dosageAmount: 10,
      dosageUnit: 'mg',
    };

    // Start on Monday 2024-01-01
    const startDate = new Date('2024-01-01T00:00:00Z');
    const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

    // Should generate doses only for Mon, Wed, Fri in the 7-day window
    // Jan 1 (Mon), Jan 3 (Wed), Jan 5 (Fri) = 3 doses
    expect(doses).toHaveLength(3);
  });

  test('prevents duplicate doses for same time', () => {
    const schedule = {
      id: 'schedule1',
      medicineId: 'medicine1',
      times: ['09:00', '09:00'], // Duplicate time
      repeatPattern: 'daily',
      selectedDays: [],
    };

    const medicine = {
      id: 'medicine1',
      parentId: 'parent1',
      name: 'Test Medicine',
      dosageAmount: 10,
      dosageUnit: 'mg',
    };

    const startDate = new Date('2024-01-01T00:00:00Z');
    const doses = generateDosesForSchedule(schedule, medicine, startDate, 7);

    // Should generate 7 doses (duplicates prevented)
    expect(doses).toHaveLength(7);
  });
});

describe('writeDosesInBatches', () => {
  test('writes doses in batches of 500', async () => {
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    const mockFirestore = {
      batch: jest.fn(() => mockBatch),
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({})),
      })),
    };

    // Create 1200 doses to test batching
    const doses = Array.from({ length: 1200 }, (_, i) => ({
      medicineId: 'medicine1',
      scheduleId: 'schedule1',
      parentId: 'parent1',
      medicineName: 'Test Medicine',
      dosageAmount: 10,
      dosageUnit: 'mg',
      scheduledTime: new Date(),
      status: 'pending',
      createdAt: new Date(),
    }));

    const written = await writeDosesInBatches(mockFirestore, doses);

    // Should write all 1200 doses
    expect(written).toBe(1200);

    // Should create 3 batches (500 + 500 + 200)
    expect(mockFirestore.batch).toHaveBeenCalledTimes(3);
    expect(mockBatch.commit).toHaveBeenCalledTimes(3);
  });

  test('retries failed batch writes', async () => {
    let attemptCount = 0;
    const mockBatch = {
      set: jest.fn(),
      commit: jest.fn(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve();
      }),
    };

    const mockFirestore = {
      batch: jest.fn(() => mockBatch),
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({})),
      })),
    };

    const doses = [
      {
        medicineId: 'medicine1',
        scheduleId: 'schedule1',
        parentId: 'parent1',
        medicineName: 'Test Medicine',
        dosageAmount: 10,
        dosageUnit: 'mg',
        scheduledTime: new Date(),
        status: 'pending',
        createdAt: new Date(),
      },
    ];

    const written = await writeDosesInBatches(mockFirestore, doses);

    // Should succeed after retry
    expect(written).toBe(1);
    expect(attemptCount).toBe(2);
  });
});
