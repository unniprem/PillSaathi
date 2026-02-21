/**
 * Navigation Tests for MissedDosesListScreen
 *
 * Tests the navigation from missed doses list to dose history screen
 *
 * @format
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MissedDosesListScreen from '../MissedDosesListScreen';
import { CaregiverScreens } from '../../../types/navigation';

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

describe('MissedDosesListScreen - Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock: return empty results
    mockGet.mockResolvedValue({
      forEach: jest.fn(),
      docs: [],
    });
  });

  it('should navigate to dose history when a missed dose is tapped', async () => {
    // Mock Firestore to return a missed dose
    const mockDose = {
      id: 'dose123',
      medicineId: 'med456',
      medicineName: 'Test Medicine',
      parentId: 'parent1',
      status: 'missed',
      scheduledTime: new Date('2026-02-21T10:00:00'),
      missedAt: new Date('2026-02-21T10:35:00'),
    };

    mockGet.mockResolvedValue({
      forEach: callback => {
        callback({
          id: mockDose.id,
          data: () => ({
            ...mockDose,
            scheduledTime: {
              toDate: () => mockDose.scheduledTime,
            },
            missedAt: {
              toDate: () => mockDose.missedAt,
            },
          }),
        });
      },
      docs: [
        {
          id: mockDose.id,
          data: () => mockDose,
        },
      ],
    });

    const { findByText } = render(<MissedDosesListScreen />);

    // Wait for the dose to be rendered
    const doseItem = await findByText('Test Medicine');

    // Tap the dose item
    fireEvent.press(doseItem);

    // Verify navigation was called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(CaregiverScreens.UPCOMING, {
        medicineId: 'med456',
        medicineName: 'Test Medicine',
        initialStatusFilter: ['missed'],
        highlightDoseId: 'dose123',
      });
    });
  });

  it('should pass correct parameters when navigating to dose history', async () => {
    const mockDose = {
      id: 'dose789',
      medicineId: 'med101',
      medicineName: 'Aspirin',
      parentId: 'parent1',
      status: 'missed',
      scheduledTime: new Date('2026-02-21T14:00:00'),
      missedAt: new Date('2026-02-21T14:35:00'),
    };

    mockGet.mockResolvedValue({
      forEach: callback => {
        callback({
          id: mockDose.id,
          data: () => ({
            ...mockDose,
            scheduledTime: {
              toDate: () => mockDose.scheduledTime,
            },
            missedAt: {
              toDate: () => mockDose.missedAt,
            },
          }),
        });
      },
      docs: [
        {
          id: mockDose.id,
          data: () => mockDose,
        },
      ],
    });

    const { findByText } = render(<MissedDosesListScreen />);

    // Wait for the dose to be rendered
    const doseItem = await findByText('Aspirin');

    // Tap the dose item
    fireEvent.press(doseItem);

    // Verify navigation was called with correct parameters
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(CaregiverScreens.UPCOMING, {
        medicineId: 'med101',
        medicineName: 'Aspirin',
        initialStatusFilter: ['missed'],
        highlightDoseId: 'dose789',
      });
    });
  });

  it('should not navigate if dose is missing medicineId or medicineName', async () => {
    const mockDose = {
      id: 'dose999',
      medicineId: null, // Missing medicineId
      medicineName: null, // Missing medicineName
      parentId: 'parent1',
      status: 'missed',
      scheduledTime: new Date('2026-02-21T16:00:00'),
      missedAt: new Date('2026-02-21T16:35:00'),
    };

    mockGet.mockResolvedValue({
      forEach: callback => {
        callback({
          id: mockDose.id,
          data: () => ({
            ...mockDose,
            scheduledTime: {
              toDate: () => mockDose.scheduledTime,
            },
            missedAt: {
              toDate: () => mockDose.missedAt,
            },
          }),
        });
      },
      docs: [
        {
          id: mockDose.id,
          data: () => mockDose,
        },
      ],
    });

    const { findByText } = render(<MissedDosesListScreen />);

    // Wait for the dose to be rendered (will show "Unknown Medicine")
    const doseItem = await findByText('Unknown Medicine');

    // Tap the dose item
    fireEvent.press(doseItem);

    // Verify navigation was NOT called
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('should navigate with multiple missed doses', async () => {
    const mockDoses = [
      {
        id: 'dose1',
        medicineId: 'med1',
        medicineName: 'Medicine A',
        parentId: 'parent1',
        status: 'missed',
        scheduledTime: new Date('2026-02-21T10:00:00'),
        missedAt: new Date('2026-02-21T10:35:00'),
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
              missedAt: {
                toDate: () => dose.missedAt,
              },
            }),
          });
        });
      },
      docs: mockDoses.map(dose => ({
        id: dose.id,
        data: () => dose,
      })),
    });

    const { findByText } = render(<MissedDosesListScreen />);

    // Wait for both doses to be rendered
    const dose1Item = await findByText('Medicine A');
    const dose2Item = await findByText('Medicine B');

    expect(dose1Item).toBeTruthy();
    expect(dose2Item).toBeTruthy();

    // Tap the second dose
    fireEvent.press(dose2Item);

    // Verify navigation was called with correct parameters for dose2
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(CaregiverScreens.UPCOMING, {
        medicineId: 'med2',
        medicineName: 'Medicine B',
        initialStatusFilter: ['missed'],
        highlightDoseId: 'dose2',
      });
    });
  });
});
