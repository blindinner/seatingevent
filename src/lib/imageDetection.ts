/**
 * Image detection algorithms for seat and booth detection
 * Uses OpenCV.js for image processing
 */

import { loadOpenCV, getCV, base64ToMat, deleteMat, hasLoadFailed } from './opencv';

export interface DetectedSeat {
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

export interface DetectedBooth {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface DetectionOptions {
  // Expected radius of seats in the image (in pixels, at original image scale)
  expectedRadius: number;
  // Tolerance for radius matching (0-1, e.g., 0.3 = ±30%)
  radiusTolerance?: number;
  // Minimum distance between detected circles (in pixels)
  minDistance?: number;
  // Sensitivity parameters for Hough transform
  param1?: number; // Canny edge detection threshold
  param2?: number; // Accumulator threshold (lower = more circles detected)
}

/**
 * Detect circular seats in an image using Hough Circle Transform
 *
 * @param imageSrc - Base64 image source
 * @param options - Detection options including expected radius
 * @returns Array of detected seats with positions and confidence
 */
export async function detectSeats(
  imageSrc: string,
  options: DetectionOptions
): Promise<DetectedSeat[]> {
  // Check if OpenCV previously failed
  if (hasLoadFailed()) {
    console.warn('OpenCV not available, returning empty results');
    return [];
  }

  let cv: any;
  try {
    // Load OpenCV if not already loaded
    await loadOpenCV();
    cv = getCV();
  } catch (error) {
    console.error('Failed to load OpenCV:', error);
    return [];
  }

  const {
    expectedRadius,
    radiusTolerance = 0.4,
    minDistance,
    param1 = 100,
    param2 = 30,
  } = options;

  // Calculate radius range
  const minRadius = Math.floor(expectedRadius * (1 - radiusTolerance));
  const maxRadius = Math.ceil(expectedRadius * (1 + radiusTolerance));
  const defaultMinDistance = minDistance || expectedRadius * 2;

  let src: any = null;
  let gray: any = null;
  let circles: any = null;

  try {
    // Load image
    src = await base64ToMat(imageSrc);

    // Convert to grayscale
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    const ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0);

    // Detect circles using Hough Circle Transform
    circles = new cv.Mat();
    cv.HoughCircles(
      blurred,
      circles,
      cv.HOUGH_GRADIENT,
      1, // dp - inverse ratio of accumulator resolution
      defaultMinDistance, // minDist - minimum distance between circle centers
      param1, // param1 - higher threshold for Canny edge detector
      param2, // param2 - accumulator threshold (lower = more circles)
      minRadius,
      maxRadius
    );

    // Clean up blurred mat
    blurred.delete();

    // Convert results to DetectedSeat array
    const detectedSeats: DetectedSeat[] = [];

    for (let i = 0; i < circles.cols; i++) {
      const x = circles.data32F[i * 3];
      const y = circles.data32F[i * 3 + 1];
      const radius = circles.data32F[i * 3 + 2];

      // Calculate confidence based on how close the radius is to expected
      const radiusDiff = Math.abs(radius - expectedRadius) / expectedRadius;
      const confidence = Math.max(0, 1 - radiusDiff);

      detectedSeats.push({
        x: Math.round(x),
        y: Math.round(y),
        radius: Math.round(radius),
        confidence,
      });
    }

    // Sort by confidence (highest first)
    detectedSeats.sort((a, b) => b.confidence - a.confidence);

    return detectedSeats;
  } finally {
    // Clean up OpenCV Mats to prevent memory leaks
    if (src) deleteMat(src);
    if (gray) deleteMat(gray);
    if (circles) deleteMat(circles);
  }
}

/**
 * Detect seats near a sample point (for validation/filtering)
 * This can be used to filter results based on color/appearance similarity
 *
 * @param imageSrc - Base64 image source
 * @param samplePoint - Point clicked by user as reference
 * @param detectedSeats - Already detected seats to filter
 * @returns Filtered array of seats similar to the sample
 */
export async function filterSeatsBySample(
  imageSrc: string,
  samplePoint: { x: number; y: number },
  detectedSeats: DetectedSeat[]
): Promise<DetectedSeat[]> {
  // For now, just return all detected seats
  // In a more advanced implementation, we could:
  // 1. Get the color at the sample point
  // 2. Filter seats that have similar colors
  // 3. Use template matching for more accuracy

  return detectedSeats;
}

/**
 * Group detected seats into rows based on Y-coordinate proximity
 *
 * @param seats - Array of detected seats
 * @param rowThreshold - Maximum Y difference to consider seats in same row
 * @returns Array of rows, each containing seats sorted by X
 */
export function groupSeatsIntoRows(
  seats: DetectedSeat[],
  rowThreshold: number = 20
): DetectedSeat[][] {
  if (seats.length === 0) return [];

  // Sort by Y coordinate
  const sorted = [...seats].sort((a, b) => a.y - b.y);

  const rows: DetectedSeat[][] = [];
  let currentRow: DetectedSeat[] = [sorted[0]];
  let rowY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const seat = sorted[i];

    if (Math.abs(seat.y - rowY) <= rowThreshold) {
      // Same row
      currentRow.push(seat);
    } else {
      // New row - sort current row by X and save
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);

      currentRow = [seat];
      rowY = seat.y;
    }
  }

  // Don't forget the last row
  currentRow.sort((a, b) => a.x - b.x);
  rows.push(currentRow);

  return rows;
}

/**
 * Estimate the expected radius in image pixels based on zoom level
 *
 * @param zoom - Current zoom level (100 = 100%)
 * @param ourSeatRadius - Our standard seat radius (default 12px)
 * @returns Expected radius in original image pixels
 */
export function calculateExpectedRadius(
  zoom: number,
  ourSeatRadius: number = 12
): number {
  // At zoom%, our cursor (ourSeatRadius) should match the seat in the image
  // So the seat in the original image is: ourSeatRadius * (100 / zoom)
  return ourSeatRadius * (100 / zoom);
}
