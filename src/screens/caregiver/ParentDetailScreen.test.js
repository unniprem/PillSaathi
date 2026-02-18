/**
 * Tests for ParentDetailScreen
 *
 * Requirements: 4.1, 5.1, 7.1, 16.1, 16.2
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ParentDetailScreen from './ParentDetailScreen';
import useParent from '../../hooks/useParent';
import useUpcomingDoses from '../../hooks/useUpcomingDoses';
import useParentMedicines from '../../hooks/useParentMedicines';
import { useNavigation } from '@react-navigation/native';
import { CaregiverScreens } from '../../types/navigation';

// Mock dependencies
jest.mock('../../hooks/useParent');
jest.mock('../../hooks/useUpcomingDoses');
jest.mock('../../hooks/useParentMedicines');
jest.mock('@react-navigation/native');
jest.mock('../../components/EditAliasDialog', () => 'EditAliasDialog');

describe('ParentDetailScreen', () => {
  let mockNavigate;
  const mockRoute = {
    params: {
      parentId: 'parent123',
    },
  };

  beforeEach(() => {
    mockNavigate = jest.fn();
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 4.1: Display parent information section', () => {
    it('should display parent information with name and contact details', () => {
      // Arrange
      const mockParent = {
        id: 'parent123',
        name: 'John Doe',
        actualName: 'John Doe',
        alias: null,
        phone: '+1234567890',
        email: 'john@example.com',
        relationshipId: 'rel123',
      };

      useParent.mockReturnValue({
        parent: mockParent,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Phone: +1234567890')).toBeTruthy();
      expect(getByText('Email: john@example.com')).toBeTruthy();
    });

    it('should display alias when set', () => {
      // Arrange
      const mockParent = {
        id: 'parent123',
        name: 'Mom',
        actualName: 'Jane Doe',
        alias: 'Mom',
        phone: '+1234567890',
        relationshipId: 'rel123',
      };

      useParent.mockReturnValue({
        parent: mockParent,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('Mom')).toBeTruthy();
      expect(getByText('Actual name: Jane Doe')).toBeTruthy();
    });
  });

  describe('Requirement 7.1: Display upcoming doses section', () => {
    it('should display upcoming doses for next 24 hours', () => {
      // Arrange
      const mockDoses = [
        {
          id: 'dose1',
          medicineName: 'Aspirin',
          dosage: '100mg',
          scheduledTime: new Date('2024-01-15T08:00:00'),
        },
        {
          id: 'dose2',
          medicineName: 'Vitamin D',
          dosage: '1000 IU',
          scheduledTime: new Date('2024-01-15T20:00:00'),
        },
      ];

      useParent.mockReturnValue({
        parent: {
          id: 'parent123',
          name: 'John Doe',
          relationshipId: 'rel123',
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: mockDoses,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('Aspirin')).toBeTruthy();
      expect(getByText('Vitamin D')).toBeTruthy();
      expect(getByText('100mg')).toBeTruthy();
      expect(getByText('1000 IU')).toBeTruthy();
    });

    it('should display empty state when no upcoming doses', () => {
      // Arrange
      useParent.mockReturnValue({
        parent: {
          id: 'parent123',
          name: 'John Doe',
          relationshipId: 'rel123',
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(
        getByText('No upcoming medicines in the next 24 hours'),
      ).toBeTruthy();
    });
  });

  describe('Requirement 5.1: Display medicine list section', () => {
    it('should display all medicines for the parent', () => {
      // Arrange
      const mockMedicines = [
        {
          id: 'med1',
          name: 'Aspirin',
          dosageAmount: 100,
          dosageUnit: 'mg',
        },
        {
          id: 'med2',
          name: 'Vitamin D',
          dosageAmount: 1000,
          dosageUnit: 'IU',
        },
      ];

      useParent.mockReturnValue({
        parent: {
          id: 'parent123',
          name: 'John Doe',
          relationshipId: 'rel123',
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: mockMedicines,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('Aspirin')).toBeTruthy();
      expect(getByText('100 mg')).toBeTruthy();
      expect(getByText('Vitamin D')).toBeTruthy();
      expect(getByText('1000 IU')).toBeTruthy();
    });

    it('should display empty state when no medicines', () => {
      // Arrange
      useParent.mockReturnValue({
        parent: {
          id: 'parent123',
          name: 'John Doe',
          relationshipId: 'rel123',
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('No medicines yet')).toBeTruthy();
      expect(getByText('Tap "Add" to create the first medicine')).toBeTruthy();
    });
  });

  describe('Requirement 6.1: Navigate to medicine details', () => {
    it('should navigate to medicine details when medicine is tapped', () => {
      // Arrange
      const mockMedicines = [
        {
          id: 'med123',
          name: 'Aspirin',
          dosageAmount: 100,
          dosageUnit: 'mg',
        },
      ];

      useParent.mockReturnValue({
        parent: {
          id: 'parent123',
          name: 'John Doe',
          relationshipId: 'rel123',
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: mockMedicines,
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      const medicineCard = getByText('Aspirin');
      fireEvent.press(medicineCard.parent.parent);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        CaregiverScreens.MEDICINE_DETAILS,
        {
          medicineId: 'med123',
          parentId: 'parent123',
        },
      );
    });
  });

  describe('Requirement 4.2: Navigate to add medicine', () => {
    it('should navigate to medicine form when add button is tapped', () => {
      // Arrange
      useParent.mockReturnValue({
        parent: {
          id: 'parent123',
          name: 'John Doe',
          relationshipId: 'rel123',
        },
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      const addButton = getByText('+ Add');
      fireEvent.press(addButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith(
        CaregiverScreens.MEDICINE_FORM,
        {
          parentId: 'parent123',
        },
      );
    });
  });

  describe('Loading state', () => {
    it('should display loading indicator when loading', () => {
      // Arrange
      useParent.mockReturnValue({
        parent: null,
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: true,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('Loading parent details...')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('should display error message when fetch fails', () => {
      // Arrange
      const mockError = new Error('Failed to load parent');
      useParent.mockReturnValue({
        parent: null,
        loading: false,
        error: mockError,
        refetch: jest.fn(),
      });

      useUpcomingDoses.mockReturnValue({
        doses: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      useParentMedicines.mockReturnValue({
        medicines: [],
        loading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Act
      const { getByText } = render(<ParentDetailScreen route={mockRoute} />);

      // Assert
      expect(getByText('Failed to load parent details')).toBeTruthy();
      expect(getByText('Failed to load parent')).toBeTruthy();
    });
  });
});
