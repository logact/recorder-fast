import { IStorageProvider, IStorageService, TimeRecord } from './interfaces';
import { JsonStorageProvider } from './json-storage-provider';

/**
 * Storage service implementation that manages the interaction
 * with the current storage provider
 */
export class StorageService implements IStorageService {
  private storageProvider: IStorageProvider;

  constructor(provider?: IStorageProvider) {
    // Default to JSON storage if no provider is specified
    this.storageProvider = provider || new JsonStorageProvider();
  }

  /**
   * Initialize the storage service
   */
  async initialize(): Promise<void> {
    await this.storageProvider.initialize();
  }

  /**
   * Load a record by ID
   */
  async loadRecord(id: string): Promise<TimeRecord | null> {
    return this.storageProvider.getRecord(id);
  }

  /**
   * Save a record
   */
  async saveRecord(record: TimeRecord): Promise<void> {
    await this.storageProvider.saveRecord(record);
  }

  /**
   * Delete a record
   */
  async deleteRecord(id: string): Promise<void> {
    await this.storageProvider.deleteRecord(id);
  }

  /**
   * Load all records
   */
  async loadRecords(): Promise<TimeRecord[]> {
    return this.storageProvider.getAllRecords();
  }

  /**
   * Load root records (records with no parent)
   */
  async loadRootRecords(): Promise<TimeRecord[]> {
    return this.storageProvider.getRootRecords();
  }

  /**
   * Load child records for a given parent
   */
  async loadChildRecords(parentId: string): Promise<TimeRecord[]> {
    return this.storageProvider.getChildRecords(parentId);
  }

  /**
   * Save multiple records
   */
  async saveRecords(records: TimeRecord[]): Promise<void> {
    for (const record of records) {
      await this.saveRecord(record);
    }
  }

  /**
   * Clear all storage
   */
  async clearStorage(): Promise<void> {
    await this.storageProvider.clearAllData();
  }

  /**
   * Set a new storage provider
   */
  setProvider(provider: IStorageProvider): void {
    this.storageProvider = provider;
  }

  /**
   * Get the current storage provider
   */
  getProvider(): IStorageProvider {
    return this.storageProvider;
  }
} 