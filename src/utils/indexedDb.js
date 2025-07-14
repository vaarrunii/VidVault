// src/utils/indexedDb.js

const DB_NAME = 'VidVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

let db;

// Function to open the IndexedDB database
export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      // This event is fired when the database is first created or when the version is incremented.
      db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Create an object store to hold our videos.
        // We'll use 'id' as the keyPath for video metadata, and 'fileId' for the actual blob.
        // The 'fileId' will be generated and used as the primary key for the blob store.
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        db.createObjectStore('videoBlobs', { keyPath: 'fileId' }); // Store actual video blobs
        console.log("IndexedDB: Object stores created/upgraded.");
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("IndexedDB: Database opened successfully.");
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB: Error opening database:", event.target.errorCode, event.target.error);
      reject("Error opening database");
    };
  });
};

// Function to add video metadata and its blob to IndexedDB
export const addVideo = async (videoMetadata, videoBlob) => {
  if (!db) {
    db = await openDatabase();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, 'videoBlobs'], 'readwrite');
    const videoStore = transaction.objectStore(STORE_NAME);
    const blobStore = transaction.objectStore('videoBlobs');

    // Generate a unique ID for the blob
    const fileId = `${videoMetadata.id}-blob`;

    console.log(`IndexedDB: Attempting to add blob for ${videoMetadata.id} (size: ${videoBlob.size}, type: ${videoBlob.type})`);
    // Store the actual video blob
    const blobRequest = blobStore.add({ fileId, blob: videoBlob });

    blobRequest.onsuccess = () => {
      console.log(`IndexedDB: Blob added successfully for ${fileId}.`);
      // Store the video metadata, referencing the blob by its fileId
      const metadataToStore = { ...videoMetadata, fileId: fileId };
      const metadataRequest = videoStore.add(metadataToStore);

      metadataRequest.onsuccess = () => {
        console.log(`IndexedDB: Metadata added successfully for ${videoMetadata.id}.`);
        resolve(metadataToStore);
      };

      metadataRequest.onerror = (event) => {
        console.error("IndexedDB: Error adding video metadata:", event.target.error);
        reject(event.target.error);
      };
    };

    blobRequest.onerror = (event) => {
      console.error("IndexedDB: Error adding video blob:", event.target.error);
      reject(event.target.error);
    };

    transaction.oncomplete = () => {
      console.log("IndexedDB: Add transaction completed.");
    };

    transaction.onerror = (event) => {
      console.error("IndexedDB: Transaction error during add:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Function to update video metadata and its blob in IndexedDB
export const updateVideo = async (videoMetadata, videoBlob) => {
  if (!db) {
    db = await openDatabase();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, 'videoBlobs'], 'readwrite');
    const videoStore = transaction.objectStore(STORE_NAME);
    const blobStore = transaction.objectStore('videoBlobs');

    // If a new blob is provided, delete the old one and add the new one
    if (videoBlob) {
      console.log(`IndexedDB: Attempting to update blob for ${videoMetadata.id} (new size: ${videoBlob.size}, new type: ${videoBlob.type})`);
      // Delete old blob if it exists
      if (videoMetadata.fileId) {
        const deleteBlobRequest = blobStore.delete(videoMetadata.fileId);
        deleteBlobRequest.onsuccess = () => console.log(`IndexedDB: Old blob deleted for ${videoMetadata.fileId}.`);
        deleteBlobRequest.onerror = (event) => {
          console.warn("IndexedDB: Could not delete old blob (might not exist):", event.target.error);
        };
      }

      // Add new blob
      const newFileId = `${videoMetadata.id}-blob`;
      const addBlobRequest = blobStore.add({ fileId: newFileId, blob: videoBlob });

      addBlobRequest.onsuccess = () => {
        console.log(`IndexedDB: New blob added successfully for ${newFileId}.`);
        // Update metadata with new fileId
        const metadataToUpdate = { ...videoMetadata, fileId: newFileId };
        const updateMetadataRequest = videoStore.put(metadataToUpdate); // Use put for update

        updateMetadataRequest.onsuccess = () => {
          console.log(`IndexedDB: Metadata updated successfully for ${videoMetadata.id} with new blob.`);
          resolve(metadataToUpdate);
        };
        updateMetadataRequest.onerror = (event) => {
          console.error("IndexedDB: Error updating video metadata with new blob:", event.target.error);
          reject(event.target.error);
        };
      };
      addBlobRequest.onerror = (event) => {
        console.error("IndexedDB: Error adding new blob during update:", event.target.error);
        reject(event.target.error);
      };
    } else {
      console.log(`IndexedDB: No new blob provided for update of ${videoMetadata.id}, only updating metadata.`);
      // If no new blob, just update metadata
      const updateMetadataRequest = videoStore.put(videoMetadata); // Use put for update

      updateMetadataRequest.onsuccess = () => {
        console.log(`IndexedDB: Metadata updated successfully for ${videoMetadata.id} (no new blob).`);
        resolve(videoMetadata);
      };
      updateMetadataRequest.onerror = (event) => {
        console.error("IndexedDB: Error updating video metadata without new blob:", event.target.error);
        reject(event.target.error);
      };
    }

    transaction.oncomplete = () => {
      console.log("IndexedDB: Update transaction completed.");
    };

    transaction.onerror = (event) => {
      console.error("IndexedDB: Transaction error during update:", event.target.error);
      reject(event.target.error);
    };
  });
};


// Function to get all video metadata from IndexedDB
export const getAllVideoMetadata = async () => {
  if (!db) {
    db = await openDatabase();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
      console.log("IndexedDB: All video metadata retrieved.");
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB: Error getting all video metadata:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Function to get a specific video blob by its fileId
export const getVideoBlob = async (fileId) => {
  if (!db) {
    db = await openDatabase();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['videoBlobs'], 'readonly');
    const store = transaction.objectStore('videoBlobs');
    const request = store.get(fileId);

    request.onsuccess = (event) => {
      const result = event.target.result;
      if (result && result.blob) {
        console.log(`IndexedDB: Blob retrieved for ${fileId} (size: ${result.blob.size}, type: ${result.blob.type}).`);
        resolve(result.blob);
      } else {
        console.warn(`IndexedDB: Blob not found or invalid for ${fileId}. Result:`, result);
        resolve(null); // Blob not found
      }
    };

    request.onerror = (event) => {
      console.error("IndexedDB: Error getting video blob:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Function to delete video metadata and its blob from IndexedDB
export const deleteVideo = async (videoId, fileId) => {
  if (!db) {
    db = await openDatabase();
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, 'videoBlobs'], 'readwrite');
    const videoStore = transaction.objectStore(STORE_NAME);
    const blobStore = transaction.objectStore('videoBlobs');

    const deleteMetadataRequest = videoStore.delete(videoId);
    deleteMetadataRequest.onsuccess = () => {
      console.log(`IndexedDB: Video metadata deleted for ${videoId}.`);
    };
    deleteMetadataRequest.onerror = (event) => {
      console.error("IndexedDB: Error deleting video metadata:", event.target.error);
      reject(event.target.error);
    };

    if (fileId) {
      const deleteBlobRequest = blobStore.delete(fileId);
      deleteBlobRequest.onsuccess = () => {
        console.log(`IndexedDB: Video blob deleted for ${fileId}.`);
      };
      deleteBlobRequest.onerror = (event) => {
        console.error("IndexedDB: Error deleting video blob:", event.target.error);
        reject(event.target.error);
      };
    }

    transaction.oncomplete = () => {
      console.log("IndexedDB: Delete transaction completed.");
      resolve();
    };

    transaction.onerror = (event) => {
      console.error("IndexedDB: Transaction error during delete:", event.target.error);
      reject(event.target.error);
    };
  });
};