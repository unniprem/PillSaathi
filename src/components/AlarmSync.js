/**
 * AlarmSync Component
 *
 * Syncs alarms for parent users when they log in
 * This ensures alarms are only scheduled on parent devices
 * Listens for new doses and schedules alarms in real-time
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import alarmInitializer from '../services/alarmInitializer';
import firestore from '@react-native-firebase/firestore';

function AlarmSync() {
  const { user, profile } = useAuth();
  const doseListenerRef = useRef(null);

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

          // Set up real-time listener for new doses
          setupDoseListener(user.uid);
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
      if (doseListenerRef.current) {
        console.log('AlarmSync: Cleaning up dose listener');
        doseListenerRef.current();
        doseListenerRef.current = null;
      }
    };
  }, [user, profile]);

  const setupDoseListener = parentId => {
    try {
      console.log('AlarmSync: Setting up real-time listener for new doses');

      // Listen for new doses created for this parent
      // Only listen to future doses (scheduled in the future)
      const now = new Date();
      let isInitialLoad = true;

      doseListenerRef.current = firestore()
        .collection('doses')
        .where('parentId', '==', parentId)
        .where('scheduledTime', '>', now)
        .where('status', '==', 'scheduled')
        .onSnapshot(
          async snapshot => {
            // Skip initial load - we don't want to process existing doses
            if (isInitialLoad) {
              isInitialLoad = false;
              console.log(
                'AlarmSync: Initial load complete, now listening for new doses',
              );
              return;
            }

            // Check for new doses (added documents)
            const changes = snapshot.docChanges();

            for (const change of changes) {
              if (change.type === 'added') {
                const doseData = change.doc.data();

                console.log(
                  'AlarmSync: New dose detected:',
                  doseData.medicineName,
                  'at',
                  doseData.scheduledTime?.toDate?.()?.toLocaleString(),
                );

                // Schedule alarm for this new dose
                try {
                  const AlarmSchedulerService =
                    require('../services/AlarmSchedulerService').default;

                  const scheduledTime = doseData.scheduledTime?.toDate();

                  if (scheduledTime && scheduledTime > new Date()) {
                    await AlarmSchedulerService.createAlarm(
                      doseData.medicineId,
                      {
                        name: doseData.medicineName,
                        dosageAmount: doseData.dosageAmount,
                        dosageUnit: doseData.dosageUnit,
                        instructions: doseData.instructions || '',
                      },
                      scheduledTime,
                    );

                    console.log(
                      'AlarmSync: ✓ Alarm scheduled for new dose:',
                      doseData.medicineName,
                      'at',
                      scheduledTime.toLocaleString(),
                    );
                  } else {
                    console.log(
                      'AlarmSync: Skipping past dose:',
                      doseData.medicineName,
                    );
                  }
                } catch (error) {
                  console.error(
                    'AlarmSync: Failed to schedule alarm for new dose:',
                    error,
                  );
                }
              }
            }
          },
          error => {
            console.error('AlarmSync: Dose listener error:', error);
          },
        );
    } catch (error) {
      console.error('AlarmSync: Failed to setup dose listener:', error);
    }
  };

  return null; // This component doesn't render anything
}

export default AlarmSync;
