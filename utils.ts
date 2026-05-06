import { supabase } from './supabase';

// Utility function to get the currently logged-in user's username
export const getLoggedInUserName = (): string | null => {
  return localStorage.getItem('autolux_user_name');
};

// Utility function to get the created_by value for database records
export const getCreatedByValue = (): string => {
  return getLoggedInUserName() || 'Unknown';
};

/**
 * Upload a File object to a Supabase storage bucket.
 * Returns the public URL string, or throws on error.
 *
 * @param bucket  - The bucket name (e.g. 'vehicle-photos')
 * @param file    - The File object from an <input type="file">
 * @param folder  - Optional subfolder inside the bucket (e.g. a record id)
 */
export async function uploadImageToBucket(
  bucket: string,
  file: File,
  folder?: string
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = folder ? `${folder}/${filename}` : filename;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload multiple files to the same bucket.
 * Returns an array of public URLs.
 */
export async function uploadImagesToBucket(
  bucket: string,
  files: File[],
  folder?: string
): Promise<string[]> {
  return Promise.all(files.map(f => uploadImageToBucket(bucket, f, folder)));
}

/**
 * Delete an image from a bucket given its full public URL.
 */
export async function deleteImageFromBucket(
  bucket: string,
  publicUrl: string
): Promise<void> {
  const baseUrl = `https://ievdekuapysvmiuiadum.supabase.co/storage/v1/object/public/${bucket}/`;
  const path = publicUrl.replace(baseUrl, '');
  await supabase.storage.from(bucket).remove([path]);
}
