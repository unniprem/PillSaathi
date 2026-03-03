/**
 * ParentProfileScreen - Parent Profile Screen
 *
 * Displays parent user profile information and provides access to profile editing,
 * medicine management, and caregiver management.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ParentScreens } from '../../types/navigation';

/**
 * ParentProfileScreen Component
 *
 * Displays user details and navigation options for:
 * - Edit profile
 * - Manage medicines
 * - Manage caregivers
 *
 * @param {Object} props
 * @param {Object} props.navigation - Navigation prop
 * @returns {JSX.Element}
 */
const ParentProfileScreen = ({ navigation }) => {
  const { user, profile, logout } = useAuth();

  /**
   * Format date for display
   */
  const formatDate = date => {
    if (!date) {
      return 'Not set';
    }
    const dateObj = date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Details</Text>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{profile?.name || 'Not set'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailValue}>
              {formatDate(profile?.dateOfBirth)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>
              {profile?.email || 'Not set'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>
              {user?.phoneNumber || 'Not set'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>Parent</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate(ParentScreens.EDIT_PROFILE)}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate(ParentScreens.PAIRING)}
          accessibilityLabel="Pairing and relationships"
          accessibilityRole="button"
        >
          <Text style={styles.menuItemText}>Pairing &amp; Relationships</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Logout"
          accessibilityRole="button"
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  menuItemArrow: {
    fontSize: 24,
    color: '#CCCCCC',
    fontWeight: '300',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E53E3E',
    minHeight: 48,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
  },
});

export default ParentProfileScreen;
