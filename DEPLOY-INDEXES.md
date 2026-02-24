# Deploy Firestore Indexes

## Issue

The `getDosesForDateRange` query requires a composite index that doesn't exist yet:

- Collection: `doses`
- Fields: `parentId` (ASCENDING) + `scheduledTime` (DESCENDING)

## Solution

Added the required index to `firestore.indexes.json`.

## Deployment Command

Run this command to deploy the indexes:

```bash
firebase deploy --only firestore:indexes
```

## What This Does

Deploys the following new index:

```json
{
  "collectionGroup": "doses",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "parentId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "scheduledTime",
      "order": "DESCENDING"
    }
  ]
}
```

## Why This Index Is Needed

The `getDosesForDateRange` function queries:

```javascript
.collection('doses')
.where('parentId', '==', parentId)
.where('scheduledTime', '>=', startDate)
.where('scheduledTime', '<=', endDate)
.orderBy('scheduledTime', 'desc')
```

Firestore requires a composite index for:

- Filtering by `parentId`
- Range filtering by `scheduledTime`
- Ordering by `scheduledTime` in descending order

## After Deployment

1. Wait for index to build (usually takes a few seconds to minutes)
2. Check Firebase Console to verify index is active
3. Test the medicine detail screen
4. Verify doses load correctly

## Verification

After deployment, you should see:

- No more "failed-precondition" errors
- Medicine detail screen loads doses successfully
- Caregiver dose history screen works correctly

## Files Modified

- `firestore.indexes.json` - Added new composite index

## Related Screens

This index is used by:

- `ParentMedicineDetailScreen` - Shows upcoming doses for a medicine
- `CaregiverDoseHistoryScreen` - Shows dose history for all parents
