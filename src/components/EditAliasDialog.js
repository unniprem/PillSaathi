/**
 * EditAliasDialog Component
 *
 * A modal dialog that allows caregivers to set or edit a custom alias/nickname
 * for a parent. The dialog includes a text input pre-filled with the current
 * alias (if exists) and save/cancel actions.
 *
 * Requirements: 16.1, 16.2
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { setParentAlias } from '../utils/relationshipUtils';

/**
 * EditAliasDialog Component
 *
 * Displays a modal dialog for editing parent alias/nickname.
 * Pre-fills with current alias if exists, allows saving or canceling.
 *
 * Requirements:
 * - 16.1: Provide option to edit parent display name
 * - 16.2: Update relationship document with new alias
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether the dialog is visible
 * @param {string} props.relationshipId - The relationship document ID
 * @param {string} [props.currentAlias] - Current alias value (if exists)
 * @param {string} [props.parentName] - Parent's actual name (for display context)
 * @param {Function} props.onSave - Callback when alias is saved successfully
 * @param {Function} props.onCancel - Callback when dialog is cancelled
 * @returns {JSX.Element}
 *
 * @example
 * <EditAliasDialog
 *   visible={showDialog}
 *   relationshipId="rel123"
 *   currentAlias="Mom"
 *   parentName="Jane Doe"
 *   onSave={(newAlias) => console.log('Saved:', newAlias)}
 *   onCancel={() => console.log('Cancelled')}
 * />
 */
const EditAliasDialog = ({
  visible,
  relationshipId,
  currentAlias = '',
  parentName = '',
  onSave,
  onCancel,
}) => {
  const [alias, setAlias] = useState(currentAlias || '');
  const [loading, setLoading] = useState(false);

  // Update local state when currentAlias prop changes
  useEffect(() => {
    setAlias(currentAlias || '');
  }, [currentAlias]);

  /**
   * Handle save button press
   * Updates the relationship document in Firestore with the new alias
   *
   * Requirements: 16.2 - Update relationship document with new alias
   */
  const handleSave = async () => {
    try {
      setLoading(true);

      // Save alias to Firestore
      await setParentAlias(relationshipId, alias);

      // Call onSave callback with the new alias
      onSave(alias);

      // Reset loading state
      setLoading(false);
    } catch (error) {
      setLoading(false);

      // Show error alert
      Alert.alert(
        'Save Failed',
        error.message || 'Failed to save alias. Please try again.',
        [{ text: 'OK' }],
      );
    }
  };

  /**
   * Handle cancel button press
   * Resets the input to current alias and closes dialog
   */
  const handleCancel = () => {
    // Reset to current alias
    setAlias(currentAlias || '');
    onCancel();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleCancel}
      statusBarTranslucent
      accessibilityViewIsModal
      accessibilityLabel="Edit parent nickname dialog"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.dialogContainer}>
          <View style={styles.dialog}>
            {/* Title */}
            <Text style={styles.title}>Edit Nickname</Text>

            {/* Parent name context */}
            {parentName && (
              <Text style={styles.parentName}>for {parentName}</Text>
            )}

            {/* Description */}
            <Text style={styles.description}>
              Set a custom nickname to use instead of the parent's name
            </Text>

            {/* Alias input */}
            <TextInput
              style={styles.input}
              value={alias}
              onChangeText={setAlias}
              placeholder="Enter nickname"
              placeholderTextColor="#999999"
              autoFocus
              editable={!loading}
              maxLength={50}
              accessibilityLabel="Nickname input"
              accessibilityHint="Enter a custom nickname for this parent"
            />

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={loading}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                accessibilityHint="Cancel editing and close dialog"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={loading}
                accessibilityLabel="Save"
                accessibilityRole="button"
                accessibilityHint="Save the nickname"
                accessibilityState={{ disabled: loading }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    textAlign: 'center',
  },
  parentName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#F9F9F9',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EditAliasDialog;
