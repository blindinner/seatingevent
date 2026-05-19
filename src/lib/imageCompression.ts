/**
 * Compresses an image to reduce file size for social media sharing
 * Facebook/WhatsApp have ~8MB limit for OG images
 * This compresses to ~500KB-1MB max
 */

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 2000;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB target

export async function compressImage(base64Data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG for better compression
        let quality = JPEG_QUALITY;
        let result = canvas.toDataURL('image/jpeg', quality);

        // If still too large, reduce quality iteratively
        while (getBase64Size(result) > MAX_FILE_SIZE && quality > 0.5) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64Data;
  });
}

function getBase64Size(base64: string): number {
  // Remove data URL prefix and calculate size
  const base64Content = base64.split(',')[1] || base64;
  return Math.ceil((base64Content.length * 3) / 4);
}

/**
 * Compresses a File object and returns a base64 string
 */
export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string;
        const compressed = await compressImage(base64);
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
