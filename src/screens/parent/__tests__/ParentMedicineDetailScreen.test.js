/**
 * ParentMedicineDetailScreen Tests
 *
 * Tests for today's doses display and manual dose marking functionality
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
 *
 * @format
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ParentMedicineDetailScreen from '../ParentMedicineDetailScreen';
import { useAuth } from '../../../contexts/AuthContext';
import medicineService from '../../../services/medicineService';
import scheduleService from '../../../services/scheduleService';
import doseService from '../../../services/doseService';

// Mock dependencies
jest.mock('../../../contexts/AuthContext');
jest.mock('../../../services/medicineService');
jest.mock('../../../services/scheduleService');
jest.mock('../../../services/doseService');

// Mock DoseTrackerService singleton
const mockDoseTrackerInstance = {
  initialize: jest.fn().mockResolvedValue(undefined),
  getTodaysDoses: jest.fn().mockResolvedValue([]),
  markDoseAsTaken: jest.fn().mockResolvedValue(undefined),
};

jest.mock(
  '../../../services/DoseTrackerService',
  () => mockDoseTrackerInstance,
);

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ParentMedicineDetailScreen', () => {
  const mockUser = { uid: 'parent123' };
  const mockMedicineId = 'med123';
  const mockRoute = {
    params: { medicineId: mockMedicineId },
  };

  const mockMedicine = {
    id: mockMedicineId,
    name: 'Test Medicine',
    dosageAmount: 10,
    dosageUnit: 'mg',
    status: 'active',
    instructions: 'Take with food',
  };

  const mockSchedule = {
    times: ['08:00', '14:00', '20:00'],
    repeatPattern: 'daily',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({ user: mockUser });

    medicineService.getMedicinesForParent.mockResolvedValue([mockMedicine]);
    scheduleService.getScheduleForMedicine.mockResolvedValue(mockSchedule);
    doseService.getDosesForDateRange.mockResolvedValue([]);

    // Reset mock instance
    mockDoseTrackerInstance.initialize.mockResolvedValue(undefined);
    mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue([]);
    mockDoseTrackerInstance.markDoseAsTaken.mockResolvedValue(undefined);
  });

  describe("Today's Doses Display (Requirements 7.1, 7.2, 7.3)", () => {
    it("should display today's doses section", async () => {
      const { getByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        expect(getByText("Today's Doses")).toBeTruthy();
      });
    });

    it('should show "upcoming" status for future doses', async () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);

      const todaysDoses = [
        {
          id: 'dose1',
          medicineId: mockMedicineId,
          scheduledTime: futureTime,
          status: 'scheduled',
        },
      ];

      mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue(todaysDoses);

      const { getByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        expect(getByText('Upcoming')).toBeTruthy();
      });
    });

    it('should show "overdue" status for past scheduled doses', async () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 2);

      const todaysDoses = [
        {
          id: 'dose1',
          medicineId: mockMedicineId,
          scheduledTime: pastTime,
          status: 'scheduled',
        },
      ];

      mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue(todaysDoses);

      const { getByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        expect(getByText('Overdue')).toBeTruthy();
      });
    });

    it('should show "taken" status for completed doses', async () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const todaysDoses = [
        {
          id: 'dose1',
          medicineId: mockMedicineId,
          scheduledTime: pastTime,
          status: 'taken',
        },
      ];

      mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue(todaysDoses);

      const { getByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        expect(getByText('Taken')).toBeTruthy();
      });
    });
  });

  describe('Manual Dose Marking (Requirements 7.5, 7.6)', () => {
    it('should allow marking past doses as taken', async () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const todaysDoses = [
        {
          id: 'dose1',
          medicineId: mockMedicineId,
          scheduledTime: pastTime,
          status: 'scheduled',
        },
      ];

      mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue(todaysDoses);

      const { getByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        expect(getByText('Mark Taken')).toBeTruthy();
      });

      const markTakenButton = getByText('Mark Taken');
      fireEvent.press(markTakenButton);

      await waitFor(() => {
        expect(mockDoseTrackerInstance.markDoseAsTaken).toHaveBeenCalledWith(
          'dose1',
        );
      });
    });

    it('should prevent marking future doses as taken (Requirement 7.6)', async () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 2);

      const todaysDoses = [
        {
          id: 'dose1',
          medicineId: mockMedicineId,
          scheduledTime: futureTime,
          status: 'scheduled',
        },
      ];

      mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue(todaysDoses);

      const { queryByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        // Future doses should not have "Mark Taken" button
        expect(queryByText('Mark Taken')).toBeNull();
      });
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no doses scheduled for today', async () => {
      mockDoseTrackerInstance.getTodaysDoses.mockResolvedValue([]);

      const { getByText } = render(
        <ParentMedicineDetailScreen route={mockRoute} />,
      );

      await waitFor(() => {
        expect(getByText('No doses scheduled for today')).toBeTruthy();
      });
    });
  });
});
