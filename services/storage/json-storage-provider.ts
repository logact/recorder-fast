import AsyncStorage from '@react-native-async-storage/async-storage';
import { IStorageProvider, TimeRecord } from './interfaces';

const RECORDS_PREFIX = 'time_record_';
const RECORDS_INDEX_KEY = 'time_records_index';

/**
 * JSON storage provider that uses AsyncStorage for persistence
 */
export class JsonStorageProvider implements IStorageProvider {
  /**
   * Initialize the storage provider
   */
  async initialize(): Promise<void> {
    // Check if the index exists, create if not
    const indexExists = await AsyncStorage.getItem(RECORDS_INDEX_KEY);
    if (!indexExists) {
      await AsyncStorage.setItem(RECORDS_INDEX_KEY, JSON.stringify([]));
    }
  }
  
  /**
   * Get a record by its ID
   */
  async getRecord(id: string): Promise<TimeRecord | null> {
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
  }

  /**
   * Save a record
   */
  async saveRecord(record: TimeRecord): Promise<void> {
    try {
      const recordKey = `${RECORDS_PREFIX}${record.id}`;
      const jsonValue = JSON.stringify(record, (key, value) => {
        if (key === 'createdAt') {
          return new Date(value).toISOString();
        }
        return value;
      });
      
      await AsyncStorage.setItem(recordKey, jsonValue);
      await this.updateRecordIndex(record.id);
    } catch (error) {
      console.error('Error saving record:', error);
    }
  }

  /**
   * Delete a record by ID
   */
  async deleteRecord(id: string): Promise<void> {
    try {
      const recordKey = `${RECORDS_PREFIX}${id}`;
      await AsyncStorage.removeItem(recordKey);
      
      // Update the index to remove this ID
      const recordIds = await this.getRecordIds();
      const updatedIds = recordIds.filter(recordId => recordId !== id);
      await AsyncStorage.setItem(RECORDS_INDEX_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      console.error(`Error deleting record ${id}:`, error);
    }
  }

  /**
   * Get all records
   */
  async getAllRecords(): Promise<TimeRecord[]> {
    try {
      const recordIds = await this.getRecordIds();
      const records: TimeRecord[] = [];
      
      for (const id of recordIds) {
        const record = await this.getRecord(id);
        if (record) {
          records.push(record);
        }
      }
      
      return records;
    } catch (error) {
      console.error('Error loading all records:', error);
      return [];
    }
  }

  /**
   * Get root records (records with no parent)
   */
  async getRootRecords(): Promise<TimeRecord[]> {
    try {
      const allRecords = await this.getAllRecords();
      return allRecords.filter(record => record.parentId === null);
    } catch (error) {
      console.error('Error loading root records:', error);
      return [];
    }
  }

  /**
   * Get child records for a given parent ID
   */
  async getChildRecords(parentId: string): Promise<TimeRecord[]> {
    try {
      const allRecords = await this.getAllRecords();
      return allRecords.filter(record => record.parentId === parentId);
    } catch (error) {
      console.error(`Error loading children for ${parentId}:`, error);
      return [];
    }
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    try {
      const recordIds = await this.getRecordIds();
      
      // Delete all records
      const deletePromises = recordIds.map(id => 
        AsyncStorage.removeItem(`${RECORDS_PREFIX}${id}`)
      );
      
      // Also delete the index
      deletePromises.push(AsyncStorage.removeItem(RECORDS_INDEX_KEY));
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Get all record IDs from the index
   */
  private async getRecordIds(): Promise<string[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(RECORDS_INDEX_KEY);
      return jsonValue ? JSON.parse(jsonValue) : [];
    } catch (error) {
      console.error('Error loading record IDs:', error);
      return [];
    }
  }

  /**
   * Update the record index to include an ID if it's not already there
   */
  private async updateRecordIndex(id: string): Promise<void> {
    try {
      const recordIds = await this.getRecordIds();
      if (!recordIds.includes(id)) {
        recordIds.push(id);
        await AsyncStorage.setItem(RECORDS_INDEX_KEY, JSON.stringify(recordIds));
      }
    } catch (error) {
      console.error('Error updating record index:', error);
    }
  }
} 