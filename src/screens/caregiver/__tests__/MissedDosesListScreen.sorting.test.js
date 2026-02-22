/**
 * Sorting Tests for MissedDosesListScreen
 *
 * Tests that missed doses are sorted by most recent first (missedAt timestamp)
 *
 * @format
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MissedDosesListScreen from '../MissedDosesListScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
  }),
}));

// Mock Firebase Firestore
const mockGet = jest.fn();
const mockWhere = jest.fn(() => ({
  where: mockWhere,
  orderBy: jest.fn(() => ({
    limit: jest.fn(() => ({
      get: mockGet,
    })),
  })),
  get: mockGet,
}));

const mockCollection = jest.fn(() => ({
  where: mockWhere,
  get: mockGet,
}));

jest.mock('@react-native-firebase/firestore', () => {
  return () => ({
    collection: mockCollection,
  });
});

// Mock usePairedParents hook
jest.mock('../../../hooks/usePairedParents', () => ({
  usePairedParents: jest.fn(() => ({
    parents: [
      {
        id: 'parent1',
        name: 'Test Parent',
        email: 'parent@test.com',
      },
    ],
    loading: false,
    error: null,
  })),
}));

describe('MissedDosesListScreen - Sorting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sort missed doses by most recent first (missedAt)', async () => {
    // Create doses with different missedAt times
    const mockDoses = [
      {
        id: 'dose1',
        medicineId: 'med1',
        medicineName: 'Medicine A',
        parentId: 'parent1',
        status: 'missed',
        scheduledTime: new Date('2026-02-21T08:00:00'),
        missedAt: new Date('2026-02-21T08:35:00'), // Oldest
      },
      {
        id: 'dose2',
        medicineId: 'med2',
        medicineName: 'Medicine B',
        parentId: 'parent1',
        status: 'missed',
        scheduledTime: new Date('2026-02-21T12:00:00'),
        missedAt: new Date('2026-02-21T12:35:00'), // Middle
      },
      {
        id: 'dose3',
        medicineId: 'med3',
        medicineName: 'Medicine C',
        parentId: 'parent1',
        status: 'missed',
        scheduledTime: new Date('2026-02-21T16:00:00'),
        missedAt: new Date('2026-02-21T16:35:00'), // Most recent
      },
    ];

    mockGet.mockResolvedValue({
      forEach: callback => {
        // Return in random order to test sorting
        [mockDoses[1], mockDoses[0], mockDoses[2]].forEach(dose => {
          callback({
            id: dose.id,
            data: () => ({
              ...dose,
              scheduledTime: {
                toDate: () => dose.scheduledTime,
              },
              missedAt: {
                toDate: () => dose.missedAt,
              },
            }),
          });
        });
      },
      docs: [mockDoses[1], mockDoses[0], mockDoses[2]].map(dose => ({
        id: dose.id,
        data: () => dose,
      })),
    });

    const { findAllByText } = render(<MissedDosesListScreen />);

    // Wait for all doses to be rendered
    await waitFor(async () => {
      const medicineNames = await findAllByText(/Medicine [ABC]/);
      expect(medicineNames).toHaveLength(3);
    });

    // Get all medicine name elements
    const medicineNames = await findAllByText(/Medicine [ABC]/);

    // Verify they are in the correct order (most recent first)
    expect(medicineNames[0].props.children).toBe('Medicine C'); // Most recent
    expect(medicineNames[1].props.children).toBe('Medicine B'); // Middle
    expect(medicineNames[2].props.children).toBe('Medicine A'); // Oldest
  });

  it('should use scheduledTime as fallback when missedAt is null', async () => {
    const mockDoses = [
      {
        id: 'dose1',
        medicineId: 'med1',
        medicineName: 'Medicine A',
        parentId: 'parent1',
        status: 'missed',
        scheduledTime: new Date('2026-02-21T10:00:00'),
        missedAt: null, // No missedAt
      },
      {
        id: 'dose2',
        medicineId: 'med2',
        medicineName: 'Medicine B',
        parentId: 'parent1',
        status: 'missed',
        scheduledTime: new Date('2026-02-21T14:00:00'),
        missedAt: new Date('2026-02-21T14:35:00'),
      },
    ];

    mockGet.mockResolvedValue({
      forEach: callback => {
        mockDoses.forEach(dose => {
          callback({
            id: dose.id,
            data: () => ({
              ...dose,
              scheduledTime: {
                toDate: () => dose.scheduledTime,
              },
              missedAt: dose.missedAt
                ? {
                    toDate: () => dose.missedAt,
                  }
                : null,
            }),
          });
        });
      },
      docs: mockDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      })),
    });

    const { findAllByText } = render(<MissedDosesListScreen />);

    // Wait for all doses to be rendered
    await waitFor(async () => {
      const medicineNames = await findAllByText(/Medicine [AB]/);
      expect(medicineNames).toHaveLength(2);
    });

    // Get all medicine name elements
    const medicineNames = await findAllByText(/Medicine [AB]/);

    // Medicine B should be first (has missedAt)
    // Medicine A should be second (uses scheduledTime as fallback)
    expect(medicineNames[0].props.children).toBe('Medicine B');
    expect(medicineNames[1].props.children).toBe('Medicine A');
  });
});
