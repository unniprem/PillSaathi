/**
 * useUpcomingDoses Hook
 *
 * Custom hook to listen to upcoming doses for a parent within a time window.
 * Uses Firestore real-time listeners for live updates.
 * Marks overdue doses for highlighting.
 *
 * Requirements: 7.1, 11.1
 */

import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

/**
 * Hook to listen to upcoming doses for a parent
 *
 * Listens to doses scheduled within the specified time window.
 * Shows missed doses from the past 1 hour and upcoming doses for the next N hours.
 * Returns doses sorted chronologically by scheduled time.
 * Marks doses as overdue if scheduledTime is in the past.
 * Updates automatically when doses change in Firestore.
 *
 * @param {string} parentId - Parent's Firebase Auth UID
 * @param {number} hours - Number of hours to look ahead (default: 24)
 * @returns {Object} - { doses: Array, loading: boolean, error: Error | null }
 *
 * @example
 * function ParentDetailScreen({ route }) {
 *   const { parentId } = route.params;
 *   const { doses, loading, error } = useUpcomingDoses(parentId, 24);
 *
 *   if (loading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <FlatList
 *       data={doses}
 *       renderItem={({ item }) => <DoseCard dose={item} />}
 *     />
 *   );
 * }
 */
export function useUpcomingDoses(parentId, hours = 24) {
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!parentId) {
      setDoses([]);
      setLoading(false);
      return;
    }

    // Calculate time window: past 1 hour to future N hours
    const now = new Date();
    const startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // Set up real-time listener using React Native Firebase API
    const unsubscribe = firestore()
      .collection('doses')
      .where('parentId', '==', parentId)
      .where('scheduledTime', '>=', startTime)
      .where('scheduledTime', '<=', endTime)
      .orderBy('scheduledTime', 'asc')
      .onSnapshot(
        snapshot => {
          try {
            const currentTime = new Date();
            const dosesData = snapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduledTime: doc.data().scheduledTime?.toDate(),
              }))
              .filter(dose => dose.status !== 'taken') // Filter out taken doses
              .map(dose => ({
                ...dose,
                isOverdue:
                  dose.scheduledTime && dose.scheduledTime < currentTime,
              }));

            setDoses(dosesData);
            setError(null);
            setLoading(false);
          } catch (err) {
            console.error('Error processing doses snapshot:', err);
            setError(err);
            setLoading(false);
          }
        },
        err => {
          console.error('Error listening to upcoming doses:', err);
          setError(err);
          setLoading(false);
        },
      );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [parentId, hours]);

  return {
    doses,
    loading,
    error,
  };
}

export default useUpcomingDoses;
