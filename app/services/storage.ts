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
}

const STORAGE_KEY = 'time_records_data';

export const StorageService = {
  // 保存所有记录
  saveRecords: async (records: TimeRecord[]) => {
    try {
      const jsonValue = JSON.stringify(records, (key, value) => {
        if (key === 'createdAt') {
          return new Date(value).toISOString();
        }
        return value;
      });
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (error) {
      console.error('Error saving records:', error);
    }
  },

  // 获取所有记录
  loadRecords: async (): Promise<TimeRecord[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        return JSON.parse(jsonValue, (key, value) => {
          if (key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
      }
      return [];
    } catch (error) {
      console.error('Error loading records:', error);
      return [];
    }
  }
}; 