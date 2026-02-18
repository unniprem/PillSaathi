# Design Document: UI Navigation Restructure

## Overview

This design document outlines the restructuring of the PillSathi app's navigation and UI layout for both Caregiver and Parent user roles. The restructure improves user experience by reorganizing navigation elements, moving key actions to more accessible locations, and creating a more intuitive information hierarchy.

The design maintains the existing React Navigation architecture (bottom tabs + stack navigators) while reorganizing screens, adding new tabs, and implementing a profile completion flow for new users.

### Key Changes Summary

**Caregiver UI:**

- Dashboard displays list of all paired parents
- Logout button moved to header (all screens)
- Pairing moved to bottom tab navigation
- New "Upcoming" tab showing all upcoming medicines across parents
- Medicine management scoped within parent views
- Parent alias/nickname functionality

**Parent UI:**

- Dashboard displays all medicines and upcoming doses
- Logout button moved to header (all screens)
- New "Upcoming" tab showing daily medicine schedule
- Profile management accessible from profile tab

**Both Users:**

- Mandatory profile completion for new users (name, DOB required; email optional)
- Profile editing capability (name, DOB, email)
- Consistent header with logout button
- Preserved navigation state when switching tabs

## Architecture

### Navigation Structure

The app uses React Navigation v6 with the following hierarchy:

```
RootNavigator (Stack)
├── SplashScreen
├── AuthNavigator (Stack)
│   ├── LoginScreen
│   ├── PhoneVerificationScreen
│   ├── RoleSelectionScreen
│   └── ProfileSetupScreen (NEW - mandatory for new users)
├── ParentNavigator (Bottom Tabs)
│   ├── HomeTab (Stack)
│   │   ├── ParentHomeScreen (redesigned)
│   │   ├── MedicineDetailsScreen
│   │   └── ...
│   ├── UpcomingTab (Stack) (NEW)
│   │   └── ParentUpcomingScreen
│   └── ProfileTab (Stack)
│       ├── ParentProfileScreen
│       ├── EditProfileScreen (NEW)
│       └── SettingsScreen
└── CaregiverNavigator (Bottom Tabs)
    ├── HomeTab (Stack)
    │   ├── CaregiverHomeScreen (redesigned - parent list)
    │   ├── ParentDetailScreen (NEW - scoped medicine management)
    │   ├── MedicineListScreen (within parent context)
    │   ├── MedicineDetailsScreen
    │   └── MedicineFormScreen
    ├── UpcomingTab (Stack) (NEW)
    │   └── CaregiverUpcomingScreen
    ├── PairingTab (Stack) (MOVED from HomeTab)
    │   ├── CaregiverPairingScreen
    │   └── GenerateCodeScreen (NEW)
    └── ProfileTab (Stack)
        ├── CaregiverProfileScreen
        ├── EditProfileScreen (NEW)
        └── SettingsScreen
```

### Profile Completion Flow

New users must complete their profile before accessing the main app:

```
Login → Phone Verification → Role Selection → Profile Setup → Dashboard
                                                      ↓
                                            (name, DOB required)
                                            (email optional)
```

Existing users with complete profiles skip directly to dashboard after role selection.

## Components and Interfaces

### 1. Header Component with Logout

A reusable header component that displays on all screens with a logout button.

**Component: `LogoutHeader`**

```javascript
interface LogoutHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

function LogoutHeader({ title, showBackButton, onBackPress }) {
  // Renders header with title and logout button
  // Logout button triggers confirmation dialog
  // On confirm, calls AuthContext.signOut()
}
```

**Integration:**

- Set as `headerRight` option in stack navigator screen options
- Consistent across all screens in both navigators
- Uses React Navigation's `navigation.setOptions()` for dynamic updates

### 2. Caregiver Home Screen (Parent List)

Displays all parents the caregiver is paired with.

**Component: `CaregiverHomeScreen`**

```javascript
interface Parent {
  id: string;
  name: string;
  alias?: string; // Custom nickname set by caregiver
  upcomingMedicineCount: number;
  lastMedicineTime?: Date;
}

function CaregiverHomeScreen() {
  const parents = usePairedParents(); // Hook to fetch paired parents

  return (
    <FlatList
      data={parents}
      renderItem={({ item }) => (
        <ParentCard
          parent={item}
          onPress={() => navigateToParentDetail(item.id)}
        />
      )}
      ListEmptyComponent={<EmptyParentList />}
    />
  );
}
```

**Data Flow:**

1. Fetch paired parents from Firestore: `relationships` collection where `caregiverId === currentUser.uid`
2. For each parent, fetch upcoming medicine count
3. Display in scrollable list with summary cards
4. Tap navigates to `ParentDetailScreen`

### 3. Parent Detail Screen (Caregiver View)

Shows detailed information for a specific parent, including medicine management.

**Component: `ParentDetailScreen`**

```javascript
interface ParentDetailScreenProps {
  route: {
    params: {
      parentId: string,
    },
  };
}

function ParentDetailScreen({ route }) {
  const { parentId } = route.params;
  const parent = useParent(parentId);
  const medicines = useParentMedicines(parentId);
  const upcomingDoses = useUpcomingDoses(parentId, 24); // Next 24 hours

  return (
    <ScrollView>
      <ParentInfoSection
        parent={parent}
        onEditAlias={() => showEditAliasDialog()}
      />
      <UpcomingDosesSection doses={upcomingDoses} />
      <MedicineListSection
        medicines={medicines}
        onAddMedicine={() => navigateToMedicineForm(parentId)}
        onMedicinePress={medicineId =>
          navigateToMedicineDetails(medicineId, parentId)
        }
      />
    </ScrollView>
  );
}
```

**Features:**

- Edit parent alias/nickname
- View upcoming doses for this parent (next 24 hours)
- List all medicines for this parent
- Add new medicine (scoped to this parent)
- Tap medicine to view details

### 4. Parent Alias Management

Allows caregivers to set custom nicknames for parents.

**Component: `EditAliasDialog`**

```javascript
function EditAliasDialog({ parentId, currentAlias, onSave, onCancel }) {
  const [alias, setAlias] = useState(currentAlias || '');

  const handleSave = async () => {
    // Save to Firestore: relationships collection
    // Update local state
    await updateParentAlias(parentId, alias);
    onSave();
  };

  return (
    <Modal>
      <TextInput
        value={alias}
        onChangeText={setAlias}
        placeholder="Enter nickname"
      />
      <Button onPress={handleSave}>Save</Button>
      <Button onPress={onCancel}>Cancel</Button>
    </Modal>
  );
}
```

**Data Model:**

```javascript
// Firestore: relationships collection
{
  id: string;
  caregiverId: string;
  parentId: string;
  parentAlias?: string;  // NEW field
  status: 'active' | 'pending';
  createdAt: Timestamp;
}
```

### 5. Caregiver Upcoming Medicines Tab

Shows all upcoming medicines across all paired parents.

**Component: `CaregiverUpcomingScreen`**

```javascript
interface UpcomingDose {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: Date;
  parentId: string;
  parentName: string; // Uses alias if set
  status: 'pending' | 'taken' | 'missed';
}

function CaregiverUpcomingScreen() {
  const upcomingDoses = useAllUpcomingDoses(); // Across all parents

  return (
    <FlatList
      data={upcomingDoses}
      renderItem={({ item }) => (
        <UpcomingDoseCard
          dose={item}
          onPress={() =>
            navigateToMedicineDetails(item.medicineId, item.parentId)
          }
        />
      )}
      ListEmptyComponent={<NoUpcomingDoses />}
    />
  );
}
```

**Data Flow:**

1. Fetch all paired parents
2. For each parent, fetch upcoming doses from `doses` collection
3. Merge and sort by scheduled time
4. Display with parent name (using alias if available)

### 6. Pairing Tab (Caregiver)

Moved to bottom navigation for easier access.

**Component: `CaregiverPairingScreen`**

```javascript
function CaregiverPairingScreen() {
  const [inviteCode, setInviteCode] = useState('');

  return (
    <View>
      <Section title="Enter Parent Code">
        <TextInput
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="Enter 6-digit code"
        />
        <Button onPress={() => handleJoinWithCode(inviteCode)}>Join</Button>
      </Section>

      <Section title="Generate Code">
        <Text>Share this code with parents to pair with you</Text>
        <Button onPress={() => navigateToGenerateCode()}>Generate Code</Button>
      </Section>

      <Section title="My Relationships">
        <RelationshipsList />
      </Section>
    </View>
  );
}
```

### 7. Generate Code Screen (Caregiver)

Shows generated invite code and lists all caregivers paired with the parent.

**Component: `GenerateCodeScreen`**

```javascript
function GenerateCodeScreen() {
  const [code, setCode] = useState(null);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const pairedCaregivers = usePairedCaregivers(selectedParentId);

  const handleGenerateCode = async () => {
    const newCode = await generateInviteCode();
    setCode(newCode);
  };

  return (
    <ScrollView>
      <Section title="Generate Invite Code">
        <Button onPress={handleGenerateCode}>Generate Code</Button>
        {code && <CodeDisplay code={code} />}
      </Section>

      {selectedParentId && (
        <Section title="Caregivers for this Parent">
          <FlatList
            data={pairedCaregivers}
            renderItem={({ item }) => <CaregiverCard caregiver={item} />}
          />
        </Section>
      )}
    </ScrollView>
  );
}
```

### 8. Parent Home Screen (Redesigned)

Shows all medicines and upcoming doses on the dashboard.

**Component: `ParentHomeScreen`**

```javascript
function ParentHomeScreen() {
  const medicines = useMyMedicines();
  const upcomingDoses = useUpcomingDoses(currentUser.uid, 24);

  return (
    <ScrollView>
      <Section title="Upcoming Medicines">
        <UpcomingDosesList
          doses={upcomingDoses}
          onDosePress={dose => navigateToMedicineDetails(dose.medicineId)}
        />
      </Section>

      <Section title="All Medicines">
        <MedicineList
          medicines={medicines}
          onMedicinePress={medicineId => navigateToMedicineDetails(medicineId)}
          onAddMedicine={() => navigateToAddMedicine()}
        />
      </Section>
    </ScrollView>
  );
}
```

### 9. Parent Upcoming Medicines Tab

Dedicated tab showing all medicines for the current day.

**Component: `ParentUpcomingScreen`**

```javascript
function ParentUpcomingScreen() {
  const todayDoses = useTodayDoses(currentUser.uid);

  return (
    <FlatList
      data={todayDoses}
      renderItem={({ item }) => (
        <DoseCard
          dose={item}
          onPress={() => navigateToMedicineDetails(item.medicineId)}
          onMarkTaken={() => markDoseAsTaken(item.id)}
        />
      )}
      ListEmptyComponent={<NoMedicinesToday />}
    />
  );
}
```

**Features:**

- Shows only today's doses (midnight to midnight)
- Sorted chronologically
- Highlights overdue doses
- Quick action to mark as taken

### 10. Profile Setup Screen (New Users)

Mandatory profile completion for new users.

**Component: `ProfileSetupScreen`**

```javascript
interface ProfileData {
  name: string;
  dateOfBirth: Date;
  email?: string;
}

function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    // Validate required fields
    if (!name || !dateOfBirth) {
      setErrors({ name: !name, dateOfBirth: !dateOfBirth });
      return;
    }

    // Save to Firestore users collection
    await updateUserProfile({
      name,
      dateOfBirth,
      email: email || null,
      profileCompleted: true,
    });

    // Navigate to dashboard
    navigation.replace(user.role === 'parent' ? 'Parent' : 'Caregiver');
  };

  return (
    <ScrollView>
      <Text>Complete Your Profile</Text>
      <TextInput
        label="Name *"
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <DatePicker
        label="Date of Birth *"
        value={dateOfBirth}
        onChange={setDateOfBirth}
        error={errors.dateOfBirth}
      />
      <TextInput
        label="Email (Optional)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <Button onPress={handleSubmit} disabled={!name || !dateOfBirth}>
        Continue
      </Button>
    </ScrollView>
  );
}
```

**Validation:**

- Name: Required, non-empty string
- Date of Birth: Required, valid date, user must be at least 13 years old
- Email: Optional, valid email format if provided

### 11. Edit Profile Screen

Allows users to update their profile information.

**Component: `EditProfileScreen`**

```javascript
function EditProfileScreen() {
  const currentUser = useCurrentUser();
  const [name, setName] = useState(currentUser.name);
  const [dateOfBirth, setDateOfBirth] = useState(currentUser.dateOfBirth);
  const [email, setEmail] = useState(currentUser.email || '');

  const handleSave = async () => {
    await updateUserProfile({
      name,
      dateOfBirth,
      email: email || null,
    });

    navigation.goBack();
  };

  return (
    <ScrollView>
      <TextInput label="Name" value={name} onChangeText={setName} />
      <DatePicker
        label="Date of Birth"
        value={dateOfBirth}
        onChange={setDateOfBirth}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <Button onPress={handleSave}>Save Changes</Button>
    </ScrollView>
  );
}
```

### 12. Profile Completion Check

Logic to determine if profile setup is required.

**Hook: `useProfileCompletionCheck`**

```javascript
function useProfileCompletionCheck() {
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) return;

    // Check if profile is complete
    if (!user.profileCompleted || !user.name || !user.dateOfBirth) {
      // Redirect to profile setup
      navigation.replace('Auth', { screen: 'ProfileSetup' });
    }
  }, [user]);
}
```

**Integration:**

- Called in `RootNavigator` after authentication
- Checks `profileCompleted` flag in user document
- Redirects to `ProfileSetupScreen` if incomplete

## Data Models

### User Profile

```javascript
// Firestore: users collection
{
  uid: string;
  phoneNumber: string;
  role: 'parent' | 'caregiver';
  name: string;  // NEW - required
  dateOfBirth: Timestamp;  // NEW - required
  email?: string;  // NEW - optional
  profileCompleted: boolean;  // NEW - tracks completion
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Relationship with Alias

```javascript
// Firestore: relationships collection
{
  id: string;
  caregiverId: string;
  parentId: string;
  parentAlias?: string;  // NEW - custom nickname
  status: 'active' | 'pending';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Upcoming Dose View Model

```javascript
// Derived from doses collection
interface UpcomingDoseViewModel {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: Date;
  parentId: string;
  parentName: string; // Uses alias if available for caregivers
  status: 'pending' | 'taken' | 'missed';
  isOverdue: boolean;
  timeUntilDue: string; // e.g., "in 2 hours", "30 minutes ago"
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Caregiver Dashboard Displays All Paired Parents

_For any_ caregiver user, when the dashboard loads, all parents that the caregiver is paired with should be displayed in the parent list.

**Validates: Requirements 1.1**

### Property 2: Parent Information Rendering Completeness

_For any_ parent displayed in the caregiver dashboard, the rendered output should contain the parent's name and summary information fields.

**Validates: Requirements 1.2**

### Property 3: Parent Selection Navigation

_For any_ parent card in the caregiver dashboard, tapping on it should trigger navigation to the parent detail screen with the correct parent ID.

**Validates: Requirements 1.3**

### Property 4: Header Logout Button Presence

_For any_ screen in the caregiver or parent navigator, the header should include a logout button.

**Validates: Requirements 2.1, 12.1**

### Property 5: Logout Button Consistent Positioning

_For any_ screen in the application, the logout button should be positioned in the same location in the header.

**Validates: Requirements 2.4, 12.4**

### Property 6: Bottom Navigation Tab Visibility

_For any_ primary screen navigation, the bottom navigation tabs should remain visible and accessible.

**Validates: Requirements 3.4**

### Property 7: Medicine Parent Association Preservation

_For any_ medicine, when it is edited, the parent ID association should remain unchanged.

**Validates: Requirements 4.3**

### Property 8: Parent Medicine List Completeness

_For any_ parent, when viewing their details, all medicines associated with that parent should be displayed in the medicine list.

**Validates: Requirements 5.1**

### Property 9: Medicine Information Rendering

_For any_ medicine displayed in a list, the rendered output should contain at minimum the medicine name and dosage.

**Validates: Requirements 5.2, 10.2**

### Property 10: Medicine List Consistent Ordering

_For any_ medicine list, the medicines should be sorted in a consistent order (e.g., alphabetically by name or by creation date).

**Validates: Requirements 5.4**

### Property 11: Medicine Details Completeness

_For any_ medicine, when viewing its details, all relevant fields (name, dosage, schedule, frequency, special instructions) should be displayed.

**Validates: Requirements 6.2**

### Property 12: Upcoming Medicines Display

_For any_ parent, when viewing their details, all upcoming doses scheduled within the configured time window should be displayed.

**Validates: Requirements 7.1**

### Property 13: Upcoming Dose Information Completeness

_For any_ upcoming dose displayed, the rendered output should contain the medicine name, scheduled time, and dosage.

**Validates: Requirements 7.2, 11.2, 15.3, 17.3**

### Property 14: Upcoming Medicines Chronological Sorting

_For any_ list of upcoming medicines, the doses should be sorted chronologically by scheduled time.

**Validates: Requirements 7.3, 11.3, 15.4, 17.4**

### Property 15: Upcoming Medicines Time Window Filtering

_For any_ upcoming medicines list with a configured time window, only doses scheduled within that time window should be displayed.

**Validates: Requirements 7.4**

### Property 16: Paired Caregivers List Completeness

_For any_ parent, when viewing the generate code interface, all caregivers currently paired with that parent should be listed.

**Validates: Requirements 9.1**

### Property 17: Caregiver Information Rendering

_For any_ caregiver displayed in the paired caregivers list, the rendered output should contain the caregiver's name and pairing status.

**Validates: Requirements 9.2**

### Property 18: Parent Dashboard Medicine List

_For any_ parent user, when the dashboard loads, all medicines for that parent should be displayed.

**Validates: Requirements 10.1**

### Property 19: Overdue Medicine Highlighting

_For any_ upcoming medicine that is overdue, the display should include a visual highlight indicator.

**Validates: Requirements 11.4, 17.5**

### Property 20: Navigation Stack Preservation

_For any_ bottom navigation tab, when switching to another tab and back, the navigation stack should be preserved and the user should return to their previous position.

**Validates: Requirements 13.1, 13.2**

### Property 21: Consistent Back Button Behavior

_For any_ screen with a back button, the back button should navigate to the previous screen in the stack.

**Validates: Requirements 14.1**

### Property 22: Modal Presentation Consistency

_For any_ add or edit form screen, the presentation style should be modal.

**Validates: Requirements 14.2**

### Property 23: Header Styling Consistency

_For any_ screen, the header styling (background color, text color, font size) should match the defined header style.

**Validates: Requirements 14.4**

### Property 24: Caregiver All Upcoming Medicines Aggregation

_For any_ caregiver with multiple paired parents, the upcoming medicines tab should display all upcoming doses across all parents.

**Validates: Requirements 15.2**

### Property 25: Parent Name Display with Alias

_For any_ parent with an alias set by a caregiver, the alias should be displayed instead of the actual name throughout the caregiver's interface.

**Validates: Requirements 16.2**

### Property 26: Parent Actual Name Preservation

_For any_ parent, when a caregiver sets an alias, the parent's actual name in the database should remain unchanged.

**Validates: Requirements 16.3**

### Property 27: Parent Daily Upcoming Medicines Filtering

_For any_ parent user, the upcoming medicines tab should display only doses scheduled for the current day (midnight to midnight).

**Validates: Requirements 17.2**

### Property 28: Profile Validation

_For any_ profile update submission, if required fields (name, date of birth) are missing or invalid, the submission should be rejected with appropriate error messages.

**Validates: Requirements 18.2, 19.3**

## Error Handling

### Navigation Errors

**Scenario:** Navigation to a screen fails due to missing parameters or invalid screen name.

**Handling:**

- Log error with context (screen name, parameters)
- Display user-friendly error message
- Fallback to previous screen or home screen
- Report to error tracking service (e.g., Sentry)

### Data Loading Errors

**Scenario:** Failed to load parents, medicines, or upcoming doses from Firestore.

**Handling:**

- Display error state with retry button
- Cache last successful data and show with "offline" indicator
- Log error with context (collection, query parameters)
- Implement exponential backoff for retries

### Profile Update Errors

**Scenario:** Failed to save profile information to Firestore.

**Handling:**

- Display error message to user
- Keep form data intact for retry
- Validate data locally before submission
- Log error with context

### Alias Update Errors

**Scenario:** Failed to save parent alias to relationship document.

**Handling:**

- Display error message
- Revert to previous alias in UI
- Retry with exponential backoff
- Log error with relationship ID

### Authentication Errors

**Scenario:** Logout fails or auth state becomes inconsistent.

**Handling:**

- Force clear local auth state
- Navigate to login screen
- Display error message
- Log error with user context

### Validation Errors

**Scenario:** User submits invalid profile data (e.g., invalid date of birth, malformed email).

**Handling:**

- Display inline validation errors
- Highlight invalid fields
- Prevent submission until valid
- Provide helpful error messages

## Testing Strategy

### Unit Testing

Unit tests will focus on specific components, functions, and edge cases:

**Component Tests:**

- `LogoutHeader`: Renders correctly, logout button triggers confirmation
- `ParentCard`: Displays parent information, handles tap events
- `UpcomingDoseCard`: Displays dose information, handles overdue highlighting
- `EditAliasDialog`: Validates input, saves correctly
- `ProfileSetupScreen`: Validates required fields, handles submission
- Empty state components: Render appropriate messages

**Function Tests:**

- `updateParentAlias`: Saves alias to Firestore correctly
- `updateUserProfile`: Validates and saves profile data
- `checkProfileCompletion`: Returns correct completion status
- Date validation: Rejects invalid dates, enforces age requirements
- Email validation: Accepts valid emails, rejects invalid formats

**Edge Cases:**

- Empty parent list displays empty state
- Empty medicine list displays empty state
- No upcoming doses displays appropriate message
- No paired caregivers displays appropriate message
- Profile with missing fields triggers setup screen

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using a testing library like `fast-check` (JavaScript) or similar. Each test should run a minimum of 100 iterations.

**Test Configuration:**

- Library: `fast-check` for JavaScript/React Native
- Iterations: 100 minimum per property
- Tag format: `Feature: ui-navigation-restructure, Property {number}: {property_text}`

**Property Tests:**

1. **Property 1: Caregiver Dashboard Displays All Paired Parents**

   - Generate: Random caregiver with random number of paired parents
   - Test: Dashboard component receives all parent IDs
   - Tag: `Feature: ui-navigation-restructure, Property 1: Caregiver Dashboard Displays All Paired Parents`

2. **Property 2: Parent Information Rendering Completeness**

   - Generate: Random parent data with name and summary fields
   - Test: Rendered output contains name and summary
   - Tag: `Feature: ui-navigation-restructure, Property 2: Parent Information Rendering Completeness`

3. **Property 3: Parent Selection Navigation**

   - Generate: Random parent ID
   - Test: Tapping parent card calls navigation with correct ID
   - Tag: `Feature: ui-navigation-restructure, Property 3: Parent Selection Navigation`

4. **Property 7: Medicine Parent Association Preservation**

   - Generate: Random medicine with parent ID
   - Test: After editing, parent ID remains unchanged
   - Tag: `Feature: ui-navigation-restructure, Property 7: Medicine Parent Association Preservation`

5. **Property 8: Parent Medicine List Completeness**

   - Generate: Random parent with random medicines
   - Test: All medicine IDs appear in rendered list
   - Tag: `Feature: ui-navigation-restructure, Property 8: Parent Medicine List Completeness`

6. **Property 9: Medicine Information Rendering**

   - Generate: Random medicine with name and dosage
   - Test: Rendered output contains both fields
   - Tag: `Feature: ui-navigation-restructure, Property 9: Medicine Information Rendering`

7. **Property 10: Medicine List Consistent Ordering**

   - Generate: Random list of medicines
   - Test: Output is sorted consistently (same order for same input)
   - Tag: `Feature: ui-navigation-restructure, Property 10: Medicine List Consistent Ordering`

8. **Property 11: Medicine Details Completeness**

   - Generate: Random medicine with all fields
   - Test: Rendered details contain all required fields
   - Tag: `Feature: ui-navigation-restructure, Property 11: Medicine Details Completeness`

9. **Property 14: Upcoming Medicines Chronological Sorting**

   - Generate: Random list of doses with different times
   - Test: Output is sorted by scheduled time ascending
   - Tag: `Feature: ui-navigation-restructure, Property 14: Upcoming Medicines Chronological Sorting`

10. **Property 15: Upcoming Medicines Time Window Filtering**

    - Generate: Random doses with times inside and outside window
    - Test: Only doses within window are displayed
    - Tag: `Feature: ui-navigation-restructure, Property 15: Upcoming Medicines Time Window Filtering`

11. **Property 20: Navigation Stack Preservation**

    - Generate: Random navigation sequence in a tab
    - Test: After switching tabs and back, stack is preserved
    - Tag: `Feature: ui-navigation-restructure, Property 20: Navigation Stack Preservation`

12. **Property 25: Parent Name Display with Alias**

    - Generate: Random parent with alias
    - Test: Alias is displayed in all caregiver UI locations
    - Tag: `Feature: ui-navigation-restructure, Property 25: Parent Name Display with Alias`

13. **Property 26: Parent Actual Name Preservation**

    - Generate: Random parent and alias
    - Test: After setting alias, database name field is unchanged
    - Tag: `Feature: ui-navigation-restructure, Property 26: Parent Actual Name Preservation`

14. **Property 27: Parent Daily Upcoming Medicines Filtering**

    - Generate: Random doses across multiple days
    - Test: Only today's doses are displayed
    - Tag: `Feature: ui-navigation-restructure, Property 27: Parent Daily Upcoming Medicines Filtering`

15. **Property 28: Profile Validation**
    - Generate: Random profile data with missing/invalid fields
    - Test: Submission is rejected with errors
    - Tag: `Feature: ui-navigation-restructure, Property 28: Profile Validation`

### Integration Testing

Integration tests will verify the interaction between components and services:

- **Navigation Flow Tests:**

  - Complete user journey from login → profile setup → dashboard
  - Tab switching preserves navigation state
  - Deep linking to specific screens works correctly

- **Data Flow Tests:**

  - Parent list loads from Firestore and displays correctly
  - Medicine CRUD operations update UI correctly
  - Alias changes propagate to all displays
  - Profile updates persist and reflect in UI

- **Authentication Flow Tests:**
  - New user completes profile setup before accessing dashboard
  - Existing user skips profile setup
  - Logout clears state and navigates to login

### Manual Testing Checklist

- [ ] Caregiver dashboard shows all paired parents
- [ ] Tapping parent navigates to parent detail view
- [ ] Parent detail shows medicines and upcoming doses
- [ ] Medicine management works within parent context
- [ ] Upcoming tab shows all doses across parents (caregiver)
- [ ] Pairing tab is accessible from bottom navigation
- [ ] Generate code shows paired caregivers list
- [ ] Parent alias displays throughout caregiver UI
- [ ] Parent dashboard shows medicines and upcoming doses
- [ ] Parent upcoming tab shows only today's doses
- [ ] Logout button appears in header on all screens
- [ ] Logout confirmation dialog works correctly
- [ ] New user must complete profile before dashboard
- [ ] Profile editing works for both user types
- [ ] Navigation state preserved when switching tabs
- [ ] Empty states display correctly
- [ ] Error states display with retry options
