# Offline Support Documentation

## Overview

The PillSathi app includes comprehensive offline support to ensure users can continue working even when network connectivity is unreliable or unavailable.

## Features

### 1. Network Error Handling

All Firestore operations are wrapped with:

- **Try-catch blocks** for error handling
- **Retry logic with exponential backoff** (up to 3 retries)
- **User-friendly error messages** mapped from technical error codes
- **Loading and error states** in all UI components

### 2. Offline Queue (Optional)

When enabled, write operations are queued when offline and automatically synced when connection is restored:

- **Persistent storage** using AsyncStorage
- **Automatic retry** when connection is restored
- **Visual indicators** showing sync status
- **Maximum queue size** of 100 operations

## Usage

### Error Handling

The `errorHandler` utility provides centralized error handling:

```javascript
import { getErrorMessage, logError } from '../utils/errorHandler';

try {
  await someOperation();
} catch (error) {
  logError(error, 'ComponentName.methodName', { contextData });
  const userMessage = getErrorMessage(error);
  Alert.alert('Error', userMessage);
}
```

### Offline Queue

To enable offline queue for a write operation:

```javascript
import medicineService from '../services/medicineService';

// Enable offline queue with options parameter
const medicineId = await medicineService.createMedicine(data, {
  useOfflineQueue: true,
});
```

### Offline Indicator Component

Display network status and pending operations:

```javascript
import OfflineIndicator from '../components/OfflineIndicator';

function MyScreen() {
  return (
    <View>
      <OfflineIndicator position="top" />
      {/* Your screen content */}
    </View>
  );
}
```

### useOfflineQueue Hook

Access queue status in components:

```javascript
import { useOfflineQueue } from '../hooks/useOfflineQueue';

function MyComponent() {
  const { isOnline, pendingCount, hasPending } = useOfflineQueue();

  return (
    <View>
      {!isOnline && <Text>You are offline</Text>}
      {hasPending && <Text>{pendingCount} changes pending</Text>}
    </View>
  );
}
```

## Error Types

### Network Errors

- `network-error` - Network connection failed
- `timeout` - Request took too long
- `unavailable` - Service temporarily unavailable

### Authorization Errors

- `unauthorized` - User not authorized
- `permission-denied` - Insufficient permissions

### Validation Errors

- `validation-failed` - Input validation failed
- `invalid-argument` - Invalid input provided

### Resource Errors

- `medicine-not-found` - Medicine not found
- `schedule-not-found` - Schedule not found

## Configuration

### Retry Settings

Configured in `src/utils/retryHelper.js`:

- **Max retries**: 3 attempts
- **Initial delay**: 1 second
- **Max delay**: 10 seconds
- **Backoff**: Exponential (2^attempt)

### Queue Settings

Configured in `src/utils/offlineQueue.js`:

- **Max queue size**: 100 operations
- **Retry interval**: 5 seconds
- **Max retries per operation**: 3 attempts

## Best Practices

1. **Always use error handler utilities** for consistent error messages
2. **Log errors with context** for debugging
3. **Show loading states** during async operations
4. **Provide retry options** for failed operations
5. **Enable offline queue** for critical write operations
6. **Display sync status** when using offline queue

## Testing

To test offline support:

1. **Network errors**: Disable network in device settings
2. **Retry logic**: Simulate intermittent connectivity
3. **Queue persistence**: Force quit app with pending operations
4. **Error messages**: Trigger various error conditions

## Limitations

1. **Queue size**: Limited to 100 operations
2. **Operation persistence**: Operation functions are not persisted across app restarts
3. **Conflict resolution**: No automatic conflict resolution for concurrent edits
4. **Read operations**: Not queued (only write operations)

## Future Enhancements

- Conflict resolution for concurrent edits
- Optimistic UI updates
- Background sync
- Selective sync based on priority
- Compression for large queues
