import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ParentScreens, CaregiverScreens } from '../types/navigation';

const HeaderActions = () => {
  const navigation = useNavigation();
  const { profile } = useAuth();

  const handleProfilePress = () => {
    if (profile?.role === 'parent') {
      navigation.navigate('ParentProfile');
    } else if (profile?.role === 'caregiver') {
      navigation.navigate('CaregiverProfile');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleProfilePress}
        style={styles.profileButton}
        accessibilityLabel="Profile"
        accessibilityRole="button"
        accessibilityHint="View and edit your profile"
      >
        <Text style={styles.profileIcon}>👤</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Platform.OS === 'ios' ? 8 : 4,
  },
  profileButton: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    marginRight: 4,
  },
  profileIcon: {
    fontSize: 20,
    color: '#4e8ea2',
  },
});

export default HeaderActions;

