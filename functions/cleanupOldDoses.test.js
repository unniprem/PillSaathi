/**
 * Tests for Dose Cleanup Module
 *
 * These tests verify the cleanupOldDoses function correctly deletes old doses
 * while preserving recent doses.
 */

const { cleanupOldDoses } = require('./cleanupOldDoses');

describe('cleanupOldDoses', () => {
  let mockFirestore;
  let mockCollection;
  let mockQuery;
  let mockBatch;

  beforeEach(() => {
    // Reset mocks before each test
    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    mockQuery = {
      get: jest.fn(),
    };

    mockCollection = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnValue(mockQuery),
    };

    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue(mockBatch),
    };
  });

  test('should delete doses older than 30 days', async () => {
    // Create mock old doses
    const oldDose1 = { ref: { path: 'doses/old1' } };
    const oldDose2 = { ref: { path: 'doses/old2' } };

    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      size: 2,
      docs: [oldDose1, oldDose2],
    });

    // Second call returns empty (no more doses)
    mockQuery.get.mockResolvedValueOnce({
      empty: true,
      size: 0,
      docs: [],
    });

    const deletedCount = await cleanupOldDoses(mockFirestore);

    expect(deletedCount).toBe(2);
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.delete).toHaveBeenCalledWith(oldDose1.ref);
    expect(mockBatch.delete).toHaveBeenCalledWith(oldDose2.ref);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  test('should handle empty result (no old doses)', async () => {
    mockQuery.get.mockResolvedValueOnce({
      empty: true,
      size: 0,
      docs: [],
    });

    const deletedCount = await cleanupOldDoses(mockFirestore);

    expect(deletedCount).toBe(0);
    expect(mockBatch.delete).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  test('should handle multiple batches', async () => {
    // Create 750 mock doses (should require 2 batches)
    const createMockDoses = count => {
      return Array.from({ length: count }, (_, i) => ({
        ref: { path: `doses/dose${i}` },
      }));
    };

    // First batch: 500 doses
    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      size: 500,
      docs: createMockDoses(500),
    });

    // Second batch: 250 doses
    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      size: 250,
      docs: createMockDoses(250),
    });

    // Third call: no more doses
    mockQuery.get.mockResolvedValueOnce({
      empty: true,
      size: 0,
      docs: [],
    });

    const deletedCount = await cleanupOldDoses(mockFirestore);

    expect(deletedCount).toBe(750);
    expect(mockBatch.delete).toHaveBeenCalledTimes(750);
    expect(mockBatch.commit).toHaveBeenCalledTimes(2);
  });

  test('should query with correct cutoff date', async () => {
    mockQuery.get.mockResolvedValueOnce({
      empty: true,
      size: 0,
      docs: [],
    });

    await cleanupOldDoses(mockFirestore);

    expect(mockCollection.where).toHaveBeenCalledWith(
      'scheduledTime',
      '<',
      expect.any(Object), // Timestamp object
    );
  });

  test('should throw error on batch commit failure', async () => {
    const oldDose = { ref: { path: 'doses/old1' } };

    mockQuery.get.mockResolvedValueOnce({
      empty: false,
      size: 1,
      docs: [oldDose],
    });

    mockBatch.commit.mockRejectedValueOnce(new Error('Batch commit failed'));

    await expect(cleanupOldDoses(mockFirestore)).rejects.toThrow(
      'Batch commit failed',
    );
  });
});
