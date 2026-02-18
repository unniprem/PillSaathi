/**
 * MedicineFormScreen
 *
 * Screen wrapper for MedicineForm component.
 * Extracts route params and passes them as props to MedicineForm.
 * Handles navigation after successful submission or cancellation.
 *
 * @format
 */

import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import MedicineForm from '../../components/MedicineForm';
import { useAuth } from '../../contexts/AuthContext';

/**
 * MedicineFormScreen Component
 *
 * @returns {JSX.Element}
 */
const MedicineFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  // Requirement 4.2: Ensure parentId is passed when navigating to form
  const { parentId, medicineId } = route.params || {};
  const caregiverId = user?.uid;

  // Validate required parameters
  if (!parentId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error: Parent ID is required to manage medicines
        </Text>
      </View>
    );
  }

  /**
   * Handle successful form submission
   */
  const handleSuccess = () => {
    navigation.goBack();
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <MedicineForm
      parentId={parentId}
      caregiverId={caregiverId}
      medicineId={medicineId}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

export default MedicineFormScreen;
