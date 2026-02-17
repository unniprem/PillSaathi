/**
 * Navigation State Persistence Utilities
 *
 * Utilities for testing and managing navigation state persistence.
 * These functions can be used to verify that navigation state
 * is being saved and restored correctly.
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVIGATION_STATE_KEY = '@navigation_state';

/**
 * Get the current saved navigation state from AsyncStorage
 *
 * @returns {Promise<Object|null>} The saved navigation state or null
 */
export async function getSavedNavigationState() {
  try {
    const stateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
    if (stateString) {
      const state = JSON.parse(stateString);
      // eslint-disable-next-line no-console
      console.log('📱 Saved Navigation State:', JSON.stringify(state, null, 2));
      return state;
    }
    // eslint-disable-next-line no-console
    console.log('📱 No saved navigation state found');
    return null;
  } catch (error) {
    console.error('❌ Error reading navigation state:', error);
    return null;
  }
}

/**
 * Clear the saved navigation state from AsyncStorage
 *
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function clearNavigationState() {
  try {
    await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
    // eslint-disable-next-line no-console
    console.log('✅ Navigation state cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing navigation state:', error);
    return false;
  }
}

/**
 * Test navigation state persistence
 * Call this function to verify that state is being saved
 *
 * @returns {Promise<void>}
 */
export async function testNavigationPersistence() {
  // eslint-disable-next-line no-console
  console.log('\n🧪 Testing Navigation State Persistence...\n');

  const state = await getSavedNavigationState();

  if (state) {
    // eslint-disable-next-line no-console
    console.log('✅ Navigation state persistence is working!');
    // eslint-disable-next-line no-console
    console.log('Current route:', state.routes?.[state.index]?.name);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      'ℹ️  No navigation state saved yet (this is normal on first launch)',
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    '\n💡 Navigate to different screens and restart the app to test persistence\n',
  );
}
