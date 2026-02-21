/**
 * AlarmSync Component
 *
 * Syncs alarms for parent users when they log in
 * This ensures alarms are only scheduled on parent devices
 * Also listens for new medicines added by caregivers
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import alarmInitializer from '../services/alarmInitializer';
import { getFirestore } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';

function AlarmSync() {
  const { user, profile } = useAuth();
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const syncAlarms = async () => {
      console.log('AlarmSync: Checking user and profile...', {
        hasUser: !!user,
        userId: user?.uid,
        hasProfile: !!profile,
        role: profile?.role,
      });

      // Only sync for parent users
      if (user && profile && profile.role === 'parent') {
        try {
          console.log(
            'AlarmSync: Starting alarm sync for parent user:',
            user.uid,
          );
          await alarmInitializer.initialize(user.uid, 'parent');
          console.log('AlarmSync: Alarm sync completed');

          // Set up real-time listener for new medicines
          setupMedicineListener(user.uid);
        } catch (error) {
          console.error('AlarmSync: Failed to sync alarms:', error);
        }
      } else {
        console.log('AlarmSync: Skipping - not a parent user');
      }
    };

    syncAlarms();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribeRef.current) {
        console.log('AlarmSync: Cleaning up medicine listener');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user, profile]);

  const setupMedicineListener = parentId => {
    try {
      const firestore = getFirestore(getApp());

      console.log('AlarmSync: Setting up real-time listener for medicines');

      // Listen for new medicines added for this parent
      unsubscribeRef.current = firestore
        .collection('medicines')
        .where('parentId', '==', parentId)
        .where('status', '==', 'active')
        .onSnapshot(
          async snapshot => {
            // Check for new medicines (added documents)
            const changes = snapshot.docChanges();

            for (const change of changes) {
              if (change.type === 'added') {
                const medicineId = change.doc.id;
                const medicineData = change.doc.data();

                console.log(
                  'AlarmSync: New medicine detected:',
                  medicineId,
                  medicineData.name,
                );

                // Schedule alarms for this new medicine
                try {
                  const AlarmSchedulerService =
                    require('../services/AlarmSchedulerService').default;

                  // Get the schedule for this medicine
                  const scheduleSnapshot = await firestore
                    .collection('schedules')
                    .where('medicineId', '==', medicineId)
                    .limit(1)
                    .get();

                  if (!scheduleSnapshot.empty) {
                    const scheduleData = scheduleSnapshot.docs[0].data();

                    await AlarmSchedulerService.scheduleMedicineAlarms(
                      medicineId,
                      {
                        name: medicineData.name,
                        dosageAmount: medicineData.dosageAmount,
                        dosageUnit: medicineData.dosageUnit,
                        instructions: medicineData.instructions || '',
                      },
                      scheduleData,
                    );

                    console.log(
                      'AlarmSync: ✓ Alarms scheduled for new medicine:',
                      medicineData.name,
                    );
                  } else {
                    console.log(
                      'AlarmSync: No schedule found for medicine:',
                      medicineId,
                    );
                  }
                } catch (error) {
                  console.error(
                    'AlarmSync: Failed to schedule alarms for new medicine:',
                    error,
                  );
                }
              }
            }
          },
          error => {
            console.error('AlarmSync: Medicine listener error:', error);
          },
        );
    } catch (error) {
      console.error('AlarmSync: Failed to setup medicine listener:', error);
    }
  };

  return null; // This component doesn't render anything
}

export default AlarmSync;
