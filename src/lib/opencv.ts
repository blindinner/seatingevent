/**
 * OpenCV.js loader and wrapper
 * Loads OpenCV.js dynamically from CDN when needed
 */

// OpenCV.js CDN URL - using a smaller WASM build
const OPENCV_CDN_URL = 'https://docs.opencv.org/4.5.5/opencv.js';

// Global reference to cv object
let cv: any = null;
let loadingPromise: Promise<any> | null = null;
let loadFailed = false;

/**
 * Check if OpenCV is loaded and ready
 */
export function isOpenCVReady(): boolean {
  return cv !== null && typeof cv.Mat !== 'undefined';
}

/**
 * Check if OpenCV loading previously failed
 */
export function hasLoadFailed(): boolean {
  return loadFailed;
}

/**
 * Load OpenCV.js from CDN
 * Returns a promise that resolves when OpenCV is ready
 */
export async function loadOpenCV(): Promise<any> {
  // Already loaded
  if (isOpenCVReady()) {
    return cv;
  }

  // Previous load failed
  if (loadFailed) {
    throw new Error('OpenCV.js previously failed to load. Please refresh the page.');
  }

  // Already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    // Check if we're in browser
    if (typeof window === 'undefined') {
      reject(new Error('OpenCV.js can only be loaded in browser'));
      return;
    }

    // Check if already loaded via window
    if ((window as any).cv && typeof (window as any).cv.Mat !== 'undefined') {
      cv = (window as any).cv;
      resolve(cv);
      return;
    }

    console.log('Loading OpenCV.js from CDN...');

    // Set up the Module before loading the script
    (window as any).Module = {
      onRuntimeInitialized: () => {
        console.log('OpenCV.js runtime initialized');
        cv = (window as any).cv;
        if (cv && typeof cv.Mat !== 'undefined') {
          console.log('OpenCV.js loaded successfully');
          resolve(cv);
        } else {
          loadFailed = true;
          loadingPromise = null;
          reject(new Error('OpenCV.js loaded but cv object not available'));
        }
      },
    };

    // Create script element
    const script = document.createElement('script');
    script.src = OPENCV_CDN_URL;
    script.async = true;

    // Set a timeout for loading
    const timeout = setTimeout(() => {
      loadFailed = true;
      loadingPromise = null;
      reject(new Error('OpenCV.js loading timed out (60s)'));
    }, 60000);

    script.onload = () => {
      console.log('OpenCV.js script loaded, waiting for initialization...');
      // The onRuntimeInitialized callback will resolve the promise
    };

    script.onerror = (e) => {
      clearTimeout(timeout);
      loadFailed = true;
      loadingPromise = null;
      console.error('Failed to load OpenCV.js:', e);
      reject(new Error('Failed to load OpenCV.js from CDN'));
    };

    document.head.appendChild(script);
  });

  return loadingPromise;
}

/**
 * Get the OpenCV instance (must call loadOpenCV first)
 */
export function getCV(): any {
  if (!cv) {
    throw new Error('OpenCV not loaded. Call loadOpenCV() first.');
  }
  return cv;
}

/**
 * Convert an HTMLImageElement to an OpenCV Mat
 */
export function imageToMat(img: HTMLImageElement): any {
  const cv = getCV();

  // Create a canvas to get image data
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Create Mat from image data
  const mat = cv.matFromImageData(imageData);
  return mat;
}

/**
 * Convert a base64 image source to an OpenCV Mat
 */
export async function base64ToMat(base64Src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const mat = imageToMat(img);
        resolve(mat);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64Src;
  });
}

/**
 * Clean up a Mat to prevent memory leaks
 */
export function deleteMat(mat: any): void {
  if (mat && typeof mat.delete === 'function') {
    mat.delete();
  }
}
