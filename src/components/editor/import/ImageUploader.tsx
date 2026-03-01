'use client';

import { useState, useCallback, useRef } from 'react';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'application/pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

interface UploadedImage {
  src: string;
  width: number;
  height: number;
  fileName: string;
}

interface ImageUploaderProps {
  onUpload: (image: UploadedImage) => void;
  onSkip?: () => void;
}

export function ImageUploader({ onUpload, onSkip }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload PNG, JPG, GIF, SVG, or PDF.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 15MB.';
    }
    return null;
  }, []);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // For PDF, we'd need special handling (pdf.js) - for now just support images
      if (file.type === 'application/pdf') {
        setError('PDF support coming soon. Please use PNG or JPG for now.');
        setIsLoading(false);
        return;
      }

      // Get image dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      });

      onUpload({
        src: dataUrl,
        width: dimensions.width,
        height: dimensions.height,
        fileName: file.name,
      });
    } catch (err) {
      setError('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [validateFile, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Icon */}
      <div className="mb-6">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-gray-400">
          <circle cx="25" cy="40" r="8" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="40" r="8" stroke="currentColor" strokeWidth="2" />
          <line x1="40" y1="20" x2="40" y2="60" stroke="currentColor" strokeWidth="2" />
          <circle cx="55" cy="40" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-2">Scan a reference chart</h2>
      <p className="text-gray-400 mb-8">
        Upload an image of an existing chart so we can detect seats for you.
      </p>

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          w-full max-w-md p-8 rounded-xl border-2 border-dashed cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
          }
          ${isLoading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center">
          {isLoading ? (
            <>
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-300">Processing image...</p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-gray-500 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-300 mb-2">
                Drop an image here or <span className="text-indigo-400">click to upload</span>
              </p>
              <p className="text-sm text-gray-500">
                PNG, GIF, JPEG, SVG &bull; Up to 15 MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Skip option */}
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-8 text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Skip &gt;|
        </button>
      )}
    </div>
  );
}
