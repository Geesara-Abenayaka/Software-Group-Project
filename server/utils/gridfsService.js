import mongoose from 'mongoose';
import { Readable } from 'stream';

let gridFSBucket = null;

// Initialize GridFS bucket (call this after MongoDB connection)
export function initializeGridFS(db) {
  gridFSBucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: 'uploads'
  });
  console.log('GridFS bucket initialized');
}

// Get initialized GridFS bucket
export function getGridFSBucket() {
  if (!gridFSBucket) {
    throw new Error('GridFS bucket not initialized. Call initializeGridFS first.');
  }
  return gridFSBucket;
}

/**
 * Save file to GridFS
 * @param {string} filename - Original filename
 * @param {Buffer|string} fileData - File data (Buffer or base64 string)
 * @param {object} metadata - Optional metadata object
 * @returns {Promise<string>} - MongoDB ObjectId of saved file
 */
export async function saveFileToGridFS(filename, fileData, metadata = {}) {
  const bucket = getGridFSBucket();
  
  // Convert base64 to Buffer if needed
  let buffer = fileData;
  if (typeof fileData === 'string') {
    buffer = Buffer.from(fileData, 'base64');
  }
  
  return new Promise((resolve, reject) => {
    const readStream = Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        uploadedAt: new Date(),
        ...metadata
      }
    });

    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    readStream.pipe(uploadStream);
  });
}

/**
 * Get file metadata from GridFS
 * @param {string} fileId - MongoDB ObjectId as string
 * @returns {Promise<object>} - File metadata
 */
export async function getFileMetadata(fileId) {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  const file = await bucket.find({ _id: objectId }).toArray();
  if (!file.length) {
    throw new Error(`File not found: ${fileId}`);
  }
  
  return file[0];
}

/**
 * Download file from GridFS as Buffer
 * @param {string} fileId - MongoDB ObjectId as string
 * @returns {Promise<Buffer>} - File buffer
 */
export async function getFileBuffer(fileId) {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  const chunks = [];
  
  return new Promise((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(objectId);
    
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    downloadStream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Download file from GridFS as stream (for Express response)
 * @param {string} fileId - MongoDB ObjectId as string
 * @returns {Stream} - Readable stream for response.pipe()
 */
export function getFileStream(fileId) {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  return bucket.openDownloadStream(objectId);
}

/**
 * Delete file from GridFS
 * @param {string} fileId - MongoDB ObjectId as string
 * @returns {Promise<void>}
 */
export async function deleteFileFromGridFS(fileId) {
  const bucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);
  
  return bucket.delete(objectId);
}

/**
 * List all files by metadata query
 * @param {object} query - MongoDB query object
 * @returns {Promise<array>} - Array of file metadata
 */
export async function listFilesByQuery(query = {}) {
  const bucket = getGridFSBucket();
  return bucket.find(query).toArray();
}

/**
 * Delete multiple files
 * @param {array} fileIds - Array of MongoDB ObjectIds as strings
 * @returns {Promise<void>}
 */
export async function deleteMultipleFiles(fileIds) {
  const bucket = getGridFSBucket();
  
  for (const fileId of fileIds) {
    const objectId = new mongoose.Types.ObjectId(fileId);
    await bucket.delete(objectId);
  }
}
