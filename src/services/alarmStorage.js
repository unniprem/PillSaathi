/**
 * Alarm Storage Service
 * Manages alarm metadata persistence using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ALARM_METADATA_PREFIX = '@alarm_metadata:';
const ALL_ALARMS_KEY = '@all_alarm_ids';

class AlarmStorageService {
  /**
   * Store alarm metadata for a medicine
   * @param {string} medicineId - Medicine ID
   * @param {Object} metadata - Alarm metadata
   * @param {Array} metadata.alarmIds - Array of alarm objects
   * @param {Date} metadata.lastScheduled - When alarms were last scheduled
   * @param {number} metadata.scheduleVersion - Schedule version number
   */
  async storeAlarmMetadata(medicineId, metadata) {
    try {
      const key = `${ALARM_METADATA_PREFIX}${medicineId}`;
      const data = {
        medicineId,
        alarmIds: metadata.alarmIds || [],
        lastScheduled: metadata.lastScheduled
          ? metadata.lastScheduled.toISOString()
          : new Date().toISOString(),
        scheduleVersion: metadata.scheduleVersion || 1,
      };

      await AsyncStorage.setItem(key, JSON.stringify(data));

      // Update the list of all alarm IDs
      await this.updateAllAlarmsList(medicineId);

      return true;
    } catch (error) {
      console.error('Failed to store alarm metadata:', error);
      return false;
    }
  }

  /**
   * Get alarm metadata for a medicine
   * @param {string} medicineId - Medicine ID
   * @returns {Object|null} Alarm metadata or null if not found
   */
  async getAlarmMetadata(medicineId) {
    try {
      const key = `${ALARM_METADATA_PREFIX}${medicineId}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) {
        return null;
      }

      const metadata = JSON.parse(data);

      // Convert ISO strings back to Date objects
      if (metadata.lastScheduled) {
        metadata.lastScheduled = new Date(metadata.lastScheduled);
      }

      // Convert alarm scheduled times back to Date objects
      if (metadata.alarmIds) {
        metadata.alarmIds = metadata.alarmIds.map(alarm => ({
          ...alarm,
          scheduledTime: alarm.scheduledTime
            ? new Date(alarm.scheduledTime)
            : null,
        }));
      }

      return metadata;
    } catch (error) {
      console.error('Failed to get alarm metadata:', error);
      return null;
    }
  }

  /**
   * Delete alarm metadata for a medicine
   * @param {string} medicineId - Medicine ID
   */
  async deleteAlarmMetadata(medicineId) {
    try {
      const key = `${ALARM_METADATA_PREFIX}${medicineId}`;
      await AsyncStorage.removeItem(key);

      // Remove from all alarms list
      await this.removeFromAllAlarmsList(medicineId);

      return true;
    } catch (error) {
      console.error('Failed to delete alarm metadata:', error);
      return false;
    }
  }

  /**
   * Get all medicine IDs that have alarm metadata
   * @returns {Array<string>} Array of medicine IDs
   */
  async getAllMedicineIdsWithAlarms() {
    try {
      const data = await AsyncStorage.getItem(ALL_ALARMS_KEY);

      if (!data) {
        return [];
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get all medicine IDs with alarms:', error);
      return [];
    }
  }

  /**
   * Update the list of all medicine IDs with alarms
   * @param {string} medicineId - Medicine ID to add
   */
  async updateAllAlarmsList(medicineId) {
    try {
      let medicineIds = await this.getAllMedicineIdsWithAlarms();

      // Ensure medicineIds is an array
      if (!Array.isArray(medicineIds)) {
        medicineIds = [];
      }

      if (!medicineIds.includes(medicineId)) {
        medicineIds.push(medicineId);
        await AsyncStorage.setItem(ALL_ALARMS_KEY, JSON.stringify(medicineIds));
      }

      return true;
    } catch (error) {
      console.error('Failed to update all alarms list:', error);
      return false;
    }
  }

  /**
   * Remove a medicine ID from the all alarms list
   * @param {string} medicineId - Medicine ID to remove
   */
  async removeFromAllAlarmsList(medicineId) {
    try {
      const medicineIds = await this.getAllMedicineIdsWithAlarms();
      const filtered = medicineIds.filter(id => id !== medicineId);

      await AsyncStorage.setItem(ALL_ALARMS_KEY, JSON.stringify(filtered));

      return true;
    } catch (error) {
      console.error('Failed to remove from all alarms list:', error);
      return false;
    }
  }

  /**
   * Get all alarm metadata for all medicines
   * @returns {Array<Object>} Array of alarm metadata objects
   */
  async getAllAlarmMetadata() {
    try {
      const medicineIds = await this.getAllMedicineIdsWithAlarms();
      const metadataPromises = medicineIds.map(id => this.getAlarmMetadata(id));
      const metadataArray = await Promise.all(metadataPromises);

      // Filter out null values
      return metadataArray.filter(metadata => metadata !== null);
    } catch (error) {
      console.error('Failed to get all alarm metadata:', error);
      return [];
    }
  }

  /**
   * Clear all alarm metadata (for debugging/testing)
   */
  async clearAllAlarmMetadata() {
    try {
      const medicineIds = await this.getAllMedicineIdsWithAlarms();

      // Delete all individual metadata entries
      const deletePromises = medicineIds.map(id => {
        const key = `${ALARM_METADATA_PREFIX}${id}`;
        return AsyncStorage.removeItem(key);
      });

      await Promise.all(deletePromises);

      // Clear the all alarms list
      await AsyncStorage.removeItem(ALL_ALARMS_KEY);

      return true;
    } catch (error) {
      console.error('Failed to clear all alarm metadata:', error);
      return false;
    }
  }

  /**
   * Add alarm IDs to existing metadata
   * @param {string} medicineId - Medicine ID
   * @param {Array} newAlarmIds - Array of new alarm objects to add
   */
  async addAlarmIds(medicineId, newAlarmIds) {
    try {
      const metadata = await this.getAlarmMetadata(medicineId);

      if (!metadata) {
        // Create new metadata if it doesn't exist
        return await this.storeAlarmMetadata(medicineId, {
          alarmIds: newAlarmIds,
          lastScheduled: new Date(),
          scheduleVersion: 1,
        });
      }

      // Add new alarm IDs to existing ones
      metadata.alarmIds = [...metadata.alarmIds, ...newAlarmIds];
      metadata.lastScheduled = new Date();

      return await this.storeAlarmMetadata(medicineId, metadata);
    } catch (error) {
      console.error('Failed to add alarm IDs:', error);
      return false;
    }
  }

  /**
   * Remove specific alarm IDs from metadata
   * @param {string} medicineId - Medicine ID
   * @param {Array<string>} alarmIdsToRemove - Array of alarm IDs to remove
   */
  async removeAlarmIds(medicineId, alarmIdsToRemove) {
    try {
      const metadata = await this.getAlarmMetadata(medicineId);

      if (!metadata) {
        return true; // Nothing to remove
      }

      // Filter out the alarm IDs to remove
      metadata.alarmIds = metadata.alarmIds.filter(
        alarm => !alarmIdsToRemove.includes(alarm.alarmId),
      );

      return await this.storeAlarmMetadata(medicineId, metadata);
    } catch (error) {
      console.error('Failed to remove alarm IDs:', error);
      return false;
    }
  }

  /**
   * Increment schedule version for a medicine
   * @param {string} medicineId - Medicine ID
   */
  async incrementScheduleVersion(medicineId) {
    try {
      const metadata = await this.getAlarmMetadata(medicineId);

      if (!metadata) {
        return false;
      }

      metadata.scheduleVersion = (metadata.scheduleVersion || 0) + 1;

      return await this.storeAlarmMetadata(medicineId, metadata);
    } catch (error) {
      console.error('Failed to increment schedule version:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AlarmStorageService();
