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

  const { parentId, medicineId } = route.params || {};
  const caregiverId = user?.uid;

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

export default MedicineFormScreen;
