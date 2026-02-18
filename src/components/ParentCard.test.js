/**
 * Tests for ParentCard Component
 *
 * Requirements: 1.2, 1.3
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ParentCard from './ParentCard';

describe('ParentCard', () => {
  const mockParent = {
    id: 'parent123',
    name: 'John Doe',
    upcomingMedicineCount: 3,
  };

  describe('Requirement 1.2: Display parent information', () => {
    it('should display parent name', () => {
      // Act
      const { getByText } = render(
        <ParentCard parent={mockParent} onPress={jest.fn()} />,
      );

      // Assert
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should display upcoming medicine count', () => {
      // Act
      const { getByText } = render(
        <ParentCard parent={mockParent} onPress={jest.fn()} />,
      );

      // Assert
      expect(getByText('3')).toBeTruthy();
      expect(getByText('Upcoming Medicines')).toBeTruthy();
    });

    it('should display alias when provided', () => {
      // Arrange
      const parentWithAlias = {
        ...mockParent,
        name: 'Dad', // Alias
      };

      // Act
      const { getByText } = render(
        <ParentCard parent={parentWithAlias} onPress={jest.fn()} />,
      );

      // Assert
      expect(getByText('Dad')).toBeTruthy();
    });
  });

  describe('Requirement 1.3: Handle tap to navigate', () => {
    it('should call onPress when card is tapped', () => {
      // Arrange
      const mockOnPress = jest.fn();

      // Act
      const { getByRole } = render(
        <ParentCard parent={mockParent} onPress={mockOnPress} />,
      );

      const card = getByRole('button');
      fireEvent.press(card);

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should have correct accessibility label', () => {
      // Act
      const { getByLabelText } = render(
        <ParentCard parent={mockParent} onPress={jest.fn()} />,
      );

      // Assert
      expect(getByLabelText('View details for John Doe')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should display zero upcoming medicines', () => {
      // Arrange
      const parentWithNoMedicines = {
        ...mockParent,
        upcomingMedicineCount: 0,
      };

      // Act
      const { getByText } = render(
        <ParentCard parent={parentWithNoMedicines} onPress={jest.fn()} />,
      );

      // Assert
      expect(getByText('0')).toBeTruthy();
    });

    it('should display large upcoming medicine count', () => {
      // Arrange
      const parentWithManyMedicines = {
        ...mockParent,
        upcomingMedicineCount: 99,
      };

      // Act
      const { getByText } = render(
        <ParentCard parent={parentWithManyMedicines} onPress={jest.fn()} />,
      );

      // Assert
      expect(getByText('99')).toBeTruthy();
    });
  });
});
