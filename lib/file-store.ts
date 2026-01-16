/**
 * File Store
 *
 * Temporary file storage using Vercel Blob for OCR processing.
 * Files are uploaded with public access so Case.dev OCR can fetch them.
 * Automatic cleanup after 5 minutes.
 */

import { put, del } from '@vercel/blob';

interface StoredFile {
  buffer: ArrayBuffer;
  mimeType: string;
  filename: string;
  createdAt: number;
}

interface BlobReference {
  url: string;
  pathname: string;
}

// In-memory store fallback (won't work for OCR - requires Blob)
const localFileStore = new Map<string, StoredFile>();

// Track blob URLs for cleanup
const blobStore = new Map<string, BlobReference>();

// TTL for stored files (5 minutes - enough for OCR processing)
const FILE_TTL_MS = 5 * 60 * 1000;

function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Store a file and return its public URL
 * Returns null if Blob is not configured
 */
export async function storeFile(
  id: string,
  buffer: ArrayBuffer,
  mimeType: string,
  filename: string
): Promise<string | null> {
  if (isBlobConfigured()) {
    const blob = await put(`temp/${id}/${filename}`, buffer, {
      access: 'public',
      contentType: mimeType,
    });

    blobStore.set(id, {
      url: blob.url,
      pathname: `temp/${id}/${filename}`,
    });

    // Schedule cleanup
    setTimeout(() => {
      deleteFile(id);
    }, FILE_TTL_MS);

    return blob.url;
  }

  // Fallback: in-memory storage (won't work for OCR)
  localFileStore.set(id, {
    buffer,
    mimeType,
    filename,
    createdAt: Date.now(),
  });

  setTimeout(() => {
    localFileStore.delete(id);
  }, FILE_TTL_MS);

  return null;
}

/**
 * Retrieve a stored file (in-memory fallback only)
 */
export function getFile(id: string): StoredFile | null {
  const file = localFileStore.get(id);
  if (!file) return null;
  if (Date.now() - file.createdAt > FILE_TTL_MS) {
    localFileStore.delete(id);
    return null;
  }
  return file;
}

/**
 * Delete a stored file from Blob storage
 */
export async function deleteFile(id: string): Promise<void> {
  const blobRef = blobStore.get(id);
  if (blobRef) {
    try {
      await del(blobRef.url);
    } catch {
      // Ignore deletion errors
    }
    blobStore.delete(id);
  }
  localFileStore.delete(id);
}

/**
 * Get the public URL for a stored file
 */
export function getFileUrl(id: string): string | null {
  return blobStore.get(id)?.url ?? null;
}

/**
 * Check if Blob storage is available
 */
export function isBlobAvailable(): boolean {
  return isBlobConfigured();
}
