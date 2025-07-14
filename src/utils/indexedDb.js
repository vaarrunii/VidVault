// src/utils/indexedDb.js
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'VidVaultDB';
// IMPORTANT: DB_VERSION remains 3. No new schema change, just logic fix.
const DB_VERSION = 3; 
const VIDEO_STORE_NAME = 'videos';
const BLOB_STORE_NAME = 'videoBlobs';

let db = null;

// Open (or create) the IndexedDB database
export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      console.log("IndexedDB: Upgrade needed or database created. Version:", event.oldVersion, "->", event.newVersion);
      db = event.target.result;

      // Create object store for video metadata
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        const videoStore = db.createObjectStore(VIDEO_STORE_NAME, { keyPath: 'id' });
        videoStore.createIndex('category', 'category', { unique: false });
        videoStore.createIndex('uploadDate', 'uploadDate', { unique: false });
        videoStore.createIndex('serialNumber', 'serialNumber', { unique: false });
        console.log(`IndexedDB: Object store '${VIDEO_STORE_NAME}' created.`);
      }

      // Create or clear object store for video blobs (actual files)
      if (db.objectStoreNames.contains(BLOB_STORE_NAME)) {
        // If the store exists, delete it to apply new schema/clear old data
        db.deleteObjectStore(BLOB_STORE_NAME);
        console.log(`IndexedDB: Existing object store '${BLOB_STORE_NAME}' deleted for upgrade.`);
      }
      // Create the blob store with the new structure
      db.createObjectStore(BLOB_STORE_NAME, { keyPath: 'id' });
      console.log(`IndexedDB: Object store '${BLOB_STORE_NAME}' created with new schema.`);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("IndexedDB: Database opened successfully.");
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB: Database error:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to read File into ArrayBuffer
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

// Add a new video (metadata and blob)
export const addVideo = async (metadata, videoFile) => {
  await openDatabase(); // Ensure db is open

  // Read the file into ArrayBuffer BEFORE starting the transaction
  let arrayBuffer;
  try {
    arrayBuffer = await readFileAsArrayBuffer(videoFile);
  } catch (error) {
    console.error("IndexedDB: Error reading video file as ArrayBuffer before transaction:", error);
    throw error; // Re-throw to be caught by App.js
  }

  const transaction = db.transaction([VIDEO_STORE_NAME, BLOB_STORE_NAME], 'readwrite');
  const videoStore = transaction.objectStore(VIDEO_STORE_NAME);
  const blobStore = transaction.objectStore(BLOB_STORE_NAME);

  return new Promise((resolve, reject) => {
    const fileId = uuidv4(); // Generate a unique ID for the blob
    
    const blobData = {
      id: fileId,
      arrayBuffer: arrayBuffer,
      type: videoFile.type,
      size: videoFile.size
    };

    // Store the blob data (ArrayBuffer + type + size)
    const blobRequest = blobStore.add(blobData);
    blobRequest.onsuccess = () => {
      console.log(`IndexedDB: Blob data added successfully with ID: ${fileId}`);
      // Update metadata with the generated fileId and fileType
      const newMetadata = { 
        ...metadata, 
        fileId, 
        fileType: videoFile.type, 
        id: metadata.id || uuidv4() 
      };
      const videoRequest = videoStore.add(newMetadata);

      videoRequest.onsuccess = () => {
        console.log("IndexedDB: Metadata added successfully.");
        resolve(newMetadata);
      };

      videoRequest.onerror = (event) => {
        console.error("IndexedDB: Error adding video metadata:", event.target.error);
        reject(event.target.error);
      };
    };

    blobRequest.onerror = (event) => {
      console.error("IndexedDB: Error adding video blob data:", event.target.error);
      reject(event.target.error);
    };

    transaction.oncomplete = () => {
      console.log("IndexedDB: Add transaction completed.");
    };

    transaction.onerror = (event) => {
      console.error("IndexedDB: Add transaction error:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Update an existing video (metadata and optionally replace blob)
export const updateVideo = async (metadata, newVideoFile, fileTypeToPass) => {
  await openDatabase();

  let updatedMetadata = { ...metadata };
  let newBlobData = null;

  // Read the new file into ArrayBuffer BEFORE starting the transaction
  if (newVideoFile) {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(newVideoFile);
      const newFileId = uuidv4();
      newBlobData = {
        id: newFileId,
        arrayBuffer: arrayBuffer,
        type: newVideoFile.type,
        size: newVideoFile.size
      };
      updatedMetadata.fileId = newFileId; // Update metadata with new fileId immediately
      updatedMetadata.fileType = newVideoFile.type; // Update fileType immediately
    } catch (error) {
      console.error("IndexedDB: Error reading new video file as ArrayBuffer before transaction:", error);
      throw error; // Re-throw to be caught by App.js
    }
  } else if (fileTypeToPass) {
    // If no newVideoFile, ensure fileType is carried over from existing metadata
    updatedMetadata.fileType = fileTypeToPass;
  }

  const transaction = db.transaction([VIDEO_STORE_NAME, BLOB_STORE_NAME], 'readwrite');
  const videoStore = transaction.objectStore(VIDEO_STORE_NAME);
  const blobStore = transaction.objectStore(BLOB_STORE_NAME);

  return new Promise((resolve, reject) => {
    const performBlobOperations = async () => {
      if (newVideoFile) {
        // Step 1: Delete the old blob if it exists
        if (metadata.fileId) { // Use original metadata.fileId for deletion
          try {
            await new Promise((res, rej) => {
              const deleteRequest = blobStore.delete(metadata.fileId);
              deleteRequest.onsuccess = () => {
                console.log(`IndexedDB: Old blob ${metadata.fileId} deleted.`);
                res();
              };
              deleteRequest.onerror = (event) => {
                console.warn(`IndexedDB: Could not delete old blob ${metadata.fileId}. It might not exist. Error:`, event.target.error);
                res();
              };
            });
          } catch (error) {
            console.error(`IndexedDB: Unexpected error during old blob deletion for ${metadata.fileId}:`, error);
          }
        }

        // Step 2: Add the new blob data
        try {
          await new Promise((res, rej) => {
            const addRequest = blobStore.add(newBlobData); // Use the pre-read newBlobData
            addRequest.onsuccess = () => {
              console.log(`IndexedDB: New blob data added successfully with ID: ${newBlobData.id}`);
              res();
            };
            addRequest.onerror = (event) => {
              console.error("IndexedDB: Error adding new video blob data:", event.target.error);
              rej(event.target.error);
            };
          });
        } catch (error) {
          console.error("IndexedDB: Failed to add new blob data after deletion attempt:", error);
          throw error;
        }
      }
    };

    performBlobOperations()
      .then(() => {
        // Step 3: Update video metadata in the video store
        const videoRequest = videoStore.put(updatedMetadata);
        videoRequest.onsuccess = () => {
          console.log("IndexedDB: Metadata updated successfully for", updatedMetadata.id);
          resolve(updatedMetadata);
        };
        videoRequest.onerror = (event) => {
          console.error("IndexedDB: Error updating video metadata:", event.target.error);
          reject(event.target.error);
        };
      })
      .catch(error => {
        console.error("IndexedDB: Error during video update process (blob handling failed):", error);
        reject(error);
      });

    transaction.oncomplete = () => {
      console.log("IndexedDB: Update transaction completed.");
    };

    transaction.onerror = (event) => {
      console.error("IndexedDB: Update transaction error:", event.target.error);
      reject(event.target.error);
    };
  });
};


// Get all video metadata
export const getAllVideoMetadata = async () => {
  await openDatabase();
  const transaction = db.transaction([VIDEO_STORE_NAME], 'readonly');
  const store = transaction.objectStore(VIDEO_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      console.error("IndexedDB: Error getting all video metadata:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Get a video blob by its fileId
export const getVideoBlob = async (fileId) => {
  await openDatabase();
  const transaction = db.transaction([BLOB_STORE_NAME], 'readonly');
  const store = transaction.objectStore(BLOB_STORE_NAME);
  const request = store.get(fileId);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const blobData = event.target.result;
      if (blobData && blobData.arrayBuffer && blobData.type) {
        // Reconstruct Blob object from stored ArrayBuffer and type
        const blob = new Blob([blobData.arrayBuffer], { type: blobData.type });
        console.log(`IndexedDB: Blob retrieved for ${fileId} (size: ${blob.size}, type: ${blob.type}).`);
        resolve(blob);
      } else {
        console.warn(`IndexedDB: No valid blob data found for fileId: ${fileId}.`);
        resolve(null); // Resolve with null if blob data not found or invalid
      }
    };
    request.onerror = (event) => {
      console.error("IndexedDB: Error getting video blob data:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Delete a video (metadata and blob)
export const deleteVideo = async (videoId, fileId) => {
  await openDatabase();
  const transaction = db.transaction([VIDEO_STORE_NAME, BLOB_STORE_NAME], 'readwrite');
  const videoStore = transaction.objectStore(VIDEO_STORE_NAME);
  const blobStore = transaction.objectStore(BLOB_STORE_NAME);

  return new Promise((resolve, reject) => {
    const deleteVideoMetadata = videoStore.delete(videoId);
    deleteVideoMetadata.onsuccess = () => {
      console.log(`IndexedDB: Video metadata deleted for ID: ${videoId}`);
    };
    deleteVideoMetadata.onerror = (event) => {
      console.error(`IndexedDB: Error deleting video metadata for ID: ${videoId}`, event.target.error);
    };

    if (fileId) {
      const deleteVideoBlob = blobStore.delete(fileId);
      deleteVideoBlob.onsuccess = () => {
        console.log(`IndexedDB: Video blob deleted for fileId: ${fileId}`);
      };
      deleteVideoBlob.onerror = (event) => {
        console.warn(`IndexedDB: Could not delete video blob for fileId: ${fileId}. It might not exist. Error:`, event.target.error);
      };
    } else {
      console.warn(`IndexedDB: No fileId provided for video ID: ${videoId}. Skipping blob deletion.`);
    }

    transaction.oncomplete = () => {
      console.log(`IndexedDB: Delete transaction completed for video ID: ${videoId}.`);
      resolve();
    };

    transaction.onerror = (event) => {
      console.error(`IndexedDB: Delete transaction error for video ID: ${videoId}`, event.target.error);
      reject(event.target.error);
    };
  });
};