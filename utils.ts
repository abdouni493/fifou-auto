import { supabase } from './supabase';

// Utility function to get the currently logged-in user's username
export const getLoggedInUserName = (): string | null => {
  return localStorage.getItem('autolux_user_name');
};

// Utility function to get the currently logged-in user's ID
export const getLoggedInUserId = (): string | null => {
  return localStorage.getItem('autolux_user_id');
};

// Utility function to get the created_by value for database records (returns UUID if possible)
export const getCreatedByValue = (): string => {
  const userId = getLoggedInUserId();
  const userName = getLoggedInUserName();
  // Return UUID if available, else username/email, else 'System'
  return userId || userName || 'System';
};

/**
 * Compress an image file to reduce its size before uploading.
 */
export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file); // fallback
              }
            },
            'image/jpeg',
            0.8
          );
        } else {
          resolve(file); // fallback
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
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
  // Compress image if it's an image file
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    try {
      fileToUpload = await compressImage(file);
    } catch (e) {
      console.warn("Image compression failed, using original file", e);
    }
  }

  const ext = fileToUpload.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = folder ? `${folder}/${filename}` : filename;

  const { error } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
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
