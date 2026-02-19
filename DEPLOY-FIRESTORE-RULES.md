# Deploy Firestore Rules - IMPORTANT

## ⚠️ CRITICAL: You must deploy the updated Firestore rules for the app to work!

The cloud functions have been removed and the app now operates directly on Firestore. The security rules have been updated to allow these operations, but they must be deployed to Firebase.

## Quick Deploy

Run this command to deploy the updated rules:

```bash
firebase deploy --only firestore:rules
```

## What Changed in the Rules

### 1. Users Collection

- Fixed circular dependency issue
- Users can read their own profile
- Caregivers can read profiles of parents they're linked to

### 2. Relationships Collection

- Added `list` permission for queries
- Caregivers can create relationships directly
- Both parties can delete relationships

### 3. Medicines Collection

- Added `list` permission for queries
- Parents can read their own medicines
- Caregivers can read medicines for linked parents

### 4. Schedules Collection

- Added `list` permission for queries
- Anyone authenticated can read schedules

### 5. Doses Collection

- Added `list` permission for queries
- Parents can read and delete their own doses
- Caregivers can create/read/update/delete doses for linked parents

### 6. Invite Codes Collection

- Anyone authenticated can read and list invite codes
- Caregivers can mark codes as used when redeeming

## Verify Deployment

After deploying, verify the rules are active:

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Rules" tab
4. Check that the rules match the content in `firestore.rules`
5. Check the "Last deployed" timestamp

## Testing After Deployment

Test these operations in the app:

1. **Parent Login**:

   - [ ] Can view their profile
   - [ ] Can see their medicines
   - [ ] Can see their doses
   - [ ] Can generate invite code

2. **Caregiver Login**:

   - [ ] Can redeem invite code
   - [ ] Can see relationships
   - [ ] Can create medicines for linked parents
   - [ ] Can create schedules
   - [ ] Can see doses generated

3. **Cleanup**:
   - [ ] Parent can cleanup old doses

## Troubleshooting

### Error: "permission-denied"

If you still see permission errors after deploying:

1. **Check deployment succeeded**:

   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Verify you're deploying to the correct project**:

   ```bash
   firebase use
   ```

   If wrong project, switch:

   ```bash
   firebase use pillsathi-dev
   ```

3. **Check Firebase Console**:

   - Go to Firestore Rules tab
   - Verify the rules match your local `firestore.rules` file
   - Check the "Last deployed" timestamp

4. **Clear app cache**:
   - Uninstall and reinstall the app
   - Or clear app data in device settings

### Error: "Failed to deploy"

If deployment fails:

1. **Check Firebase CLI is logged in**:

   ```bash
   firebase login
   ```

2. **Check you have permission**:

   - Ensure you're an owner/editor on the Firebase project

3. **Validate rules syntax**:
   ```bash
   firebase deploy --only firestore:rules --debug
   ```

## Important Notes

- **Rules are project-specific**: Deploy to both dev and prod projects
- **Rules take effect immediately**: No app restart needed
- **Test thoroughly**: Verify all operations work after deployment
- **Monitor errors**: Check Firebase Console > Firestore > Usage tab for denied requests

## Deploy to Multiple Projects

If you have both dev and prod projects:

```bash
# Deploy to dev
firebase use pillsathi-dev
firebase deploy --only firestore:rules

# Deploy to prod
firebase use pillsathi-prod
firebase deploy --only firestore:rules
```

## Next Steps

After deploying the rules:

1. Test the app thoroughly
2. Monitor for any permission errors
3. Check Firebase Console for denied requests
4. Update this document if you find any issues

## Need Help?

If you encounter issues:

1. Check the error message in the app console
2. Check Firebase Console > Firestore > Usage for denied requests
3. Verify the rules in Firebase Console match your local file
4. Check that you deployed to the correct project
