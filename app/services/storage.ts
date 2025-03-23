import AsyncStorage from '@react-native-async-storage/async-storage';

interface TimeRecord {
  id: string;
  time: number;
  isRunning: boolean;
  label: string;
  children: TimeRecord[];
  parentId: string | null;
  isCollapsed: boolean;
  avatarColor: string;
  createdAt: Date;
  isEditing?: boolean;
  note?: string;
  isEditingNote?: boolean;
}

const RECORDS_PREFIX = 'time_record_';
const RECORDS_INDEX_KEY = 'time_records_index';

export const StorageService = {
  // Save a single record by its ID
  saveRecord: async (record: TimeRecord) => {
    try {
      const recordKey = `${RECORDS_PREFIX}${record.id}`;
      const jsonValue = JSON.stringify(record, (key, value) => {
        if (key === 'createdAt') {
          return new Date(value).toISOString();
        }
        return value;
      });
      await AsyncStorage.setItem(recordKey, jsonValue);
      
      // Update the index of record IDs
      await updateRecordIndex(record.id);
    } catch (error) {
      console.error('Error saving record:', error);
    }
  },

  // Load a single record by its ID
  loadRecord: async (id: string): Promise<TimeRecord | null> => {
    try {
      const recordKey = `${RECORDS_PREFIX}${id}`;
      const jsonValue = await AsyncStorage.getItem(recordKey);
      if (jsonValue) {
        return JSON.parse(jsonValue, (key, value) => {
          if (key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
      }
      return null;
    } catch (error) {
      console.error(`Error loading record ${id}:`, error);
      return null;
    }
  },

  // Get all record IDs
  getRecordIds: async (): Promise<string[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(RECORDS_INDEX_KEY);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading record IDs:', error);
      return [];
    }
  },

  // Load all records (still needed for backwards compatibility)
  loadRecords: async (): Promise<TimeRecord[]> => {
    try {
      const recordIds = await StorageService.getRecordIds();
      const records: TimeRecord[] = [];
      
      for (const id of recordIds) {
        const record = await StorageService.loadRecord(id);
        if (record) {
          records.push(record);
        }
      }
      
      return records;
    } catch (error) {
      console.error('Error loading all records:', error);
      return [];
    }
  },

  // Save all records (for backwards compatibility, also ensures all records are saved individually)
  saveRecords: async (records: TimeRecord[]) => {
    try {
      // Save each record individually
      for (const record of records) {
        await StorageService.saveRecord(record);
      }
      
      // Update the index with all record IDs
      const recordIds = records.map(record => record.id);
      await AsyncStorage.setItem(RECORDS_INDEX_KEY, JSON.stringify(recordIds));
    } catch (error) {
      console.error('Error saving all records:', error);
    }
  },
  
  // Delete a record by ID
  deleteRecord: async (id: string) => {
    try {
      const recordKey = `${RECORDS_PREFIX}${id}`;
      await AsyncStorage.removeItem(recordKey);
      
      // Update the index to remove this ID
      const recordIds = await StorageService.getRecordIds();
      const updatedIds = recordIds.filter(recordId => recordId !== id);
      await AsyncStorage.setItem(RECORDS_INDEX_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      console.error(`Error deleting record ${id}:`, error);
    }
  }
};

// Helper function to add a record ID to the index if it doesn't exist
const updateRecordIndex = async (id: string) => {
  try {
    const recordIds = await StorageService.getRecordIds();
    if (!recordIds.includes(id)) {
      recordIds.push(id);
      await AsyncStorage.setItem(RECORDS_INDEX_KEY, JSON.stringify(recordIds));
    }
  } catch (error) {
    console.error('Error updating record index:', error);
  }
};