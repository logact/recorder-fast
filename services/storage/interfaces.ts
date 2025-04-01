/**
 * Base record interface shared across the application
 */
export interface TimeRecord {
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
  startTime?: number;    // 开始计时的时间戳
  baseTime: number;      // 基础累计时间（不包含当前计时段）
}

/**
 * Storage provider interface that defines the contract 
 * for different storage implementations
 */
export interface IStorageProvider {
  // Individual record operations
  getRecord(id: string): Promise<TimeRecord | null>;
  saveRecord(record: TimeRecord): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  
  // Batch operations
  getAllRecords(): Promise<TimeRecord[]>;
  getRootRecords(): Promise<TimeRecord[]>;
  getChildRecords(parentId: string): Promise<TimeRecord[]>;
  
  // Additional operations
  initialize(): Promise<void>;
  clearAllData(): Promise<void>;
}

/**
 * Storage service that uses the current storage provider
 */
export interface IStorageService {
  // Core operations
  loadRecord(id: string): Promise<TimeRecord | null>;
  saveRecord(record: TimeRecord): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  
  // Collection operations
  loadRecords(): Promise<TimeRecord[]>;
  loadRootRecords(): Promise<TimeRecord[]>;
  loadChildRecords(parentId: string): Promise<TimeRecord[]>;
  saveRecords(records: TimeRecord[]): Promise<void>;
  
  // Utility operations
  initialize(): Promise<void>;
  clearStorage(): Promise<void>;
  
  // Provider management
  setProvider(provider: IStorageProvider): void;
  getProvider(): IStorageProvider;
} 