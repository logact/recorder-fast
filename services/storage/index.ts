export * from './interfaces';
export * from './json-storage-provider';
export * from './storage-service';

// Create and export the default storage service instance
import { StorageService } from './storage-service';
import { JsonStorageProvider } from './json-storage-provider';

// Create the default instance with JSON storage
const storageService = new StorageService(new JsonStorageProvider());

// Initialize the service (this should be awaited in app startup)
storageService.initialize().catch(error => {
  console.error('Failed to initialize storage service:', error);
});

export default storageService; 