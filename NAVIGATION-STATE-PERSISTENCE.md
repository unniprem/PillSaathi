# Navigation State Persistence

## Overview

The PillSathi app implements navigation state persistence to provide a better user experience by remembering where users were in the app when they restart it.

## How It Works

### State Saving

- Navigation state is automatically saved to AsyncStorage whenever the user navigates to a different screen
- The state is stored under the key `@navigation_state`
- State changes are tracked using the `onStateChange` callback in `NavigationContainer`

### State Restoration

- When the app starts, it attempts to restore the previous navigation state from AsyncStorage
- If a saved state exists, it's passed to `NavigationContainer` as `initialState`
- The app waits for state restoration to complete before rendering (shows nothing during restoration)
- If restoration fails, the app starts with the default navigation state

### Error Handling

- All AsyncStorage operations are wrapped in try-catch blocks
- Errors are logged to the console with warnings
- The app continues to function normally even if persistence fails

## Implementation Details

### Files Modified

1. **src/navigation/RootNavigator.js**

   - Added AsyncStorage import
   - Added state restoration logic in `useEffect`
   - Added `initialState`, `isReady`, `navigationRef`, and `routeNameRef` state
   - Added `onReady` and `onStateChange` callbacks to `NavigationContainer`
   - Added early return when not ready

2. **src/utils/navigationPersistence.js** (new file)

   - Utility functions for testing and managing navigation state
   - `getSavedNavigationState()` - Read current saved state
   - `clearNavigationState()` - Clear saved state
   - `testNavigationPersistence()` - Test the persistence feature

3. **App.js**
   - Added call to `testNavigationPersistence()` on app start
   - Logs navigation state information to console

## Testing

### Manual Testing

1. **Test State Persistence:**

   ```bash
   # Start the app
   npm run android  # or npm run ios

   # Navigate to different screens
   # Close the app completely (not just minimize)
   # Restart the app
   # Verify you're on the same screen you were on before closing
   ```

2. **Test State Restoration:**

   ```javascript
   // In the app, open the developer console
   // You should see logs like:
   // 🧪 Testing Navigation State Persistence...
   // 📱 Saved Navigation State: { ... }
   // ✅ Navigation state persistence is working!
   ```

3. **Test Error Handling:**

   ```javascript
   // Use the utility functions to test
   import {
     clearNavigationState,
     getSavedNavigationState,
   } from './src/utils/navigationPersistence';

   // Clear state
   await clearNavigationState();

   // Check state
   await getSavedNavigationState();
   ```

### Console Logs

When navigation state persistence is working, you'll see logs like:

```
🧪 Testing Navigation State Persistence...

📱 Saved Navigation State: {
  "routes": [
    {
      "name": "Auth",
      "state": { ... }
    }
  ],
  "index": 0
}
✅ Navigation state persistence is working!
Current route: Auth

💡 Navigate to different screens and restart the app to test persistence
```

## Benefits

1. **Better UX**: Users don't lose their place when the app restarts
2. **Seamless Experience**: App feels more native and polished
3. **Development**: Easier to test specific screens without navigating through the app
4. **Analytics Ready**: Route tracking is built-in (can be extended for analytics)

## Considerations

### When State is NOT Persisted

- On first app launch (no previous state exists)
- When AsyncStorage fails (rare, but handled gracefully)
- When the user logs out (should be cleared manually in Phase 1)

### Security

- Navigation state does not contain sensitive data (only route names and params)
- Sensitive data should never be passed as navigation params
- User credentials are handled separately by Firebase Auth

### Performance

- State restoration is fast (typically < 50ms)
- The app shows nothing during restoration to avoid flicker
- State saving is asynchronous and doesn't block navigation

## Future Enhancements

1. **Clear on Logout**: Add logic to clear navigation state when user logs out
2. **Selective Persistence**: Only persist certain routes (e.g., skip splash screen)
3. **State Validation**: Validate restored state to ensure it's still valid
4. **Deep Linking**: Integrate with deep linking for better state management
5. **Analytics**: Use route tracking for user behavior analytics

## Troubleshooting

### State Not Persisting

1. Check AsyncStorage permissions
2. Check console for error messages
3. Verify `@react-native-async-storage/async-storage` is installed
4. Try clearing the state and testing again

### App Crashes on Restart

1. Check if the saved state is corrupted
2. Clear AsyncStorage: `await clearNavigationState()`
3. Check for navigation structure changes that might invalidate old state

### State Restoration Too Slow

1. This is rare, but if it happens:
2. Check AsyncStorage performance
3. Consider reducing the amount of state being saved
4. Add a timeout for state restoration

## References

- [React Navigation - State Persistence](https://reactnavigation.org/docs/state-persistence/)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)
- [React Navigation - Navigation Container](https://reactnavigation.org/docs/navigation-container/)
