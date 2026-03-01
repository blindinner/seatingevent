/**
 * Color-based seat detection using Web Worker
 *
 * Similar to competitor approach:
 * 1. User clicks on a seat
 * 2. Sample the color at that point
 * 3. Find all pixels with similar colors
 * 4. Group into connected regions
 * 5. Filter by size to find seats
 */

export interface DetectedSeat {
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

export interface DetectionProgress {
  stage: string;
  percent: number;
}

export interface ColorDetectionOptions {
  // Color tolerance (0-255, how different a color can be to still match)
  colorTolerance?: number;
  // Expected radius of seats in pixels
  expectedRadius: number;
  // Tolerance for size matching (0-1)
  sizeTolerance?: number;
  // Minimum region size in pixels
  minRegionSize?: number;
}

type ProgressCallback = (progress: DetectionProgress) => void;

/**
 * Load image from URL/base64 and get ImageData
 */
async function getImageData(imageSrc: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });
}

/**
 * Detect seats by color matching
 */
export async function detectSeatsByColor(
  imageSrc: string,
  samplePoint: { x: number; y: number },
  options: ColorDetectionOptions,
  onProgress?: ProgressCallback
): Promise<DetectedSeat[]> {
  onProgress?.({ stage: 'Loading image', percent: 0 });
  const imageData = await getImageData(imageSrc);

  return new Promise((resolve, reject) => {
    const workerCode = getWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.onmessage = (event) => {
      const data = event.data;

      if (data.type === 'progress') {
        onProgress?.(data);
      } else if (data.type === 'result') {
        cleanup();
        resolve(data.seats);
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.message));
      }
    };

    worker.onerror = (error) => {
      cleanup();
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({
      type: 'detect',
      imageData,
      sampleX: Math.round(samplePoint.x),
      sampleY: Math.round(samplePoint.y),
      colorTolerance: options.colorTolerance ?? 40,
      expectedRadius: options.expectedRadius,
      sizeTolerance: options.sizeTolerance ?? 0.5,
      minRegionSize: options.minRegionSize ?? 20,
    });
  });
}

function getWorkerCode(): string {
  return `
    // Get color at pixel
    function getPixelColor(data, width, x, y) {
      const idx = (y * width + x) * 4;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
      };
    }

    // Calculate color distance
    function colorDistance(c1, c2) {
      const dr = c1.r - c2.r;
      const dg = c1.g - c2.g;
      const db = c1.b - c2.b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // Flood fill to find connected region of similar color
    function floodFill(data, width, height, startX, startY, targetColor, tolerance, visited) {
      const pixels = [];
      const stack = [[startX, startY]];

      while (stack.length > 0) {
        const [x, y] = stack.pop();

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const key = y * width + x;
        if (visited.has(key)) continue;

        const color = getPixelColor(data, width, x, y);
        if (colorDistance(color, targetColor) > tolerance) continue;

        visited.add(key);
        pixels.push({ x, y });

        // Add neighbors (4-connected)
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }

      return pixels;
    }

    // Calculate bounding box and center of a region
    function analyzeRegion(pixels) {
      if (pixels.length === 0) return null;

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let sumX = 0, sumY = 0;

      for (const p of pixels) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        sumX += p.x;
        sumY += p.y;
      }

      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const centerX = sumX / pixels.length;
      const centerY = sumY / pixels.length;

      // Estimate radius as average of half-width and half-height
      const radius = (width + height) / 4;

      // Calculate circularity (how close to a circle)
      // Perfect circle area = pi * r^2
      // Bounding box area = width * height
      const expectedArea = Math.PI * radius * radius;
      const actualArea = pixels.length;
      const circularity = Math.min(actualArea, expectedArea) / Math.max(actualArea, expectedArea);

      return {
        centerX,
        centerY,
        radius,
        width,
        height,
        area: pixels.length,
        circularity,
        boundingBox: { minX, maxX, minY, maxY }
      };
    }

    // Find all regions of similar color in the image
    function findAllSimilarRegions(imageData, targetColor, tolerance, minRegionSize, expectedRadius, sizeTolerance) {
      const { data, width, height } = imageData;
      const visited = new Set();
      const regions = [];

      // Calculate expected area range
      const expectedArea = Math.PI * expectedRadius * expectedRadius;
      const minArea = expectedArea * (1 - sizeTolerance) * 0.5;
      const maxArea = expectedArea * (1 + sizeTolerance) * 2;

      // Scan image in grid pattern for efficiency
      const step = Math.max(1, Math.floor(expectedRadius / 3));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const key = y * width + x;
          if (visited.has(key)) continue;

          const color = getPixelColor(data, width, x, y);
          if (colorDistance(color, targetColor) > tolerance) continue;

          // Found a matching pixel, flood fill to get region
          const pixels = floodFill(data, width, height, x, y, targetColor, tolerance, visited);

          if (pixels.length < minRegionSize) continue;

          const analysis = analyzeRegion(pixels);
          if (!analysis) continue;

          // Filter by size
          if (analysis.area < minArea || analysis.area > maxArea) continue;

          // Filter by circularity (should be somewhat circular)
          if (analysis.circularity < 0.4) continue;

          regions.push(analysis);
        }
      }

      return regions;
    }

    // Remove overlapping detections
    function removeOverlaps(regions, minDistance) {
      const sorted = [...regions].sort((a, b) => b.circularity - a.circularity);
      const kept = [];

      for (const region of sorted) {
        let overlaps = false;
        for (const existing of kept) {
          const dist = Math.sqrt(
            Math.pow(region.centerX - existing.centerX, 2) +
            Math.pow(region.centerY - existing.centerY, 2)
          );
          if (dist < minDistance) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          kept.push(region);
        }
      }

      return kept;
    }

    self.onmessage = function(event) {
      const {
        type,
        imageData,
        sampleX,
        sampleY,
        colorTolerance,
        expectedRadius,
        sizeTolerance,
        minRegionSize
      } = event.data;

      if (type !== 'detect') {
        postMessage({ type: 'error', message: 'Unknown message type' });
        return;
      }

      try {
        const { data, width, height } = imageData;

        postMessage({ type: 'progress', stage: 'Sampling color', percent: 10 });

        // Get the target color from sample point
        const targetColor = getPixelColor(data, width, sampleX, sampleY);
        console.log('Target color:', targetColor);

        postMessage({ type: 'progress', stage: 'Scanning image', percent: 20 });

        // Find all regions with similar color
        const regions = findAllSimilarRegions(
          imageData,
          targetColor,
          colorTolerance,
          minRegionSize,
          expectedRadius,
          sizeTolerance
        );

        postMessage({ type: 'progress', stage: 'Filtering results', percent: 80 });

        // Remove overlapping detections
        const filtered = removeOverlaps(regions, expectedRadius * 1.5);

        postMessage({ type: 'progress', stage: 'Complete', percent: 100 });

        // Convert to seat format
        const seats = filtered.map(region => ({
          x: Math.round(region.centerX),
          y: Math.round(region.centerY),
          radius: Math.round(region.radius),
          confidence: region.circularity
        }));

        console.log('Found', seats.length, 'seats');

        postMessage({ type: 'result', seats });

      } catch (error) {
        postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Detection failed'
        });
      }
    };
  `;
}

/**
 * Calculate expected radius based on zoom level
 */
export function calculateExpectedRadius(
  zoom: number,
  ourSeatRadius: number = 12
): number {
  return ourSeatRadius * (100 / zoom);
}

export interface DetectedBooth {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface BoothDetectionOptions {
  // Color tolerance (0-255)
  colorTolerance?: number;
  // Size tolerance (0-1)
  sizeTolerance?: number;
  // Minimum region size in pixels
  minRegionSize?: number;
}

/**
 * Detect booths by color matching based on a selected region
 */
export async function detectBoothsByColor(
  imageSrc: string,
  selection: { x: number; y: number; width: number; height: number },
  options: BoothDetectionOptions,
  onProgress?: ProgressCallback
): Promise<DetectedBooth[]> {
  onProgress?.({ stage: 'Loading image', percent: 0 });
  const imageData = await getImageData(imageSrc);

  return new Promise((resolve, reject) => {
    const workerCode = getBoothWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };

    worker.onmessage = (event) => {
      const data = event.data;

      if (data.type === 'progress') {
        onProgress?.(data);
      } else if (data.type === 'result') {
        cleanup();
        resolve(data.booths);
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.message));
      }
    };

    worker.onerror = (error) => {
      cleanup();
      reject(new Error(`Worker error: ${error.message}`));
    };

    worker.postMessage({
      type: 'detect',
      imageData,
      selectionX: Math.round(selection.x),
      selectionY: Math.round(selection.y),
      selectionWidth: Math.round(selection.width),
      selectionHeight: Math.round(selection.height),
      colorTolerance: options.colorTolerance ?? 40,
      sizeTolerance: options.sizeTolerance ?? 0.5,
      minRegionSize: options.minRegionSize ?? 50,
    });
  });
}

function getBoothWorkerCode(): string {
  return `
    // Get color at pixel
    function getPixelColor(data, width, x, y) {
      const idx = (y * width + x) * 4;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
      };
    }

    // Calculate color distance
    function colorDistance(c1, c2) {
      const dr = c1.r - c2.r;
      const dg = c1.g - c2.g;
      const db = c1.b - c2.b;
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    // Get average color of a region
    function getAverageColor(data, width, x, y, w, h) {
      let r = 0, g = 0, b = 0;
      let count = 0;

      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const color = getPixelColor(data, width, x + dx, y + dy);
          r += color.r;
          g += color.g;
          b += color.b;
          count++;
        }
      }

      return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count)
      };
    }

    // Flood fill to find connected region of similar color
    function floodFill(data, width, height, startX, startY, targetColor, tolerance, visited) {
      const pixels = [];
      const stack = [[startX, startY]];

      while (stack.length > 0) {
        const [x, y] = stack.pop();

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const key = y * width + x;
        if (visited.has(key)) continue;

        const color = getPixelColor(data, width, x, y);
        if (colorDistance(color, targetColor) > tolerance) continue;

        visited.add(key);
        pixels.push({ x, y });

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }

      return pixels;
    }

    // Calculate bounding box and center of a region
    function analyzeRegion(pixels) {
      if (pixels.length === 0) return null;

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let sumX = 0, sumY = 0;

      for (const p of pixels) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        sumX += p.x;
        sumY += p.y;
      }

      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const centerX = sumX / pixels.length;
      const centerY = sumY / pixels.length;

      // Calculate rectangularity (how well it fills the bounding box)
      const boundingArea = width * height;
      const fillRatio = pixels.length / boundingArea;

      return {
        centerX,
        centerY,
        width,
        height,
        minX,
        minY,
        area: pixels.length,
        fillRatio,
        boundingBox: { minX, maxX, minY, maxY }
      };
    }

    // Find all regions of similar color in the image
    function findAllSimilarRegions(imageData, targetColor, tolerance, minRegionSize, expectedWidth, expectedHeight, sizeTolerance) {
      const { data, width, height } = imageData;
      const visited = new Set();
      const regions = [];

      // Calculate expected area range
      const expectedArea = expectedWidth * expectedHeight;
      const minArea = expectedArea * (1 - sizeTolerance) * 0.3;
      const maxArea = expectedArea * (1 + sizeTolerance) * 3;

      // Size range
      const minWidth = expectedWidth * (1 - sizeTolerance);
      const maxWidth = expectedWidth * (1 + sizeTolerance);
      const minHeight = expectedHeight * (1 - sizeTolerance);
      const maxHeight = expectedHeight * (1 + sizeTolerance);

      // Scan image in grid pattern for efficiency
      const step = Math.max(1, Math.floor(Math.min(expectedWidth, expectedHeight) / 4));

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const key = y * width + x;
          if (visited.has(key)) continue;

          const color = getPixelColor(data, width, x, y);
          if (colorDistance(color, targetColor) > tolerance) continue;

          // Found a matching pixel, flood fill to get region
          const pixels = floodFill(data, width, height, x, y, targetColor, tolerance, visited);

          if (pixels.length < minRegionSize) continue;

          const analysis = analyzeRegion(pixels);
          if (!analysis) continue;

          // Filter by area
          if (analysis.area < minArea || analysis.area > maxArea) continue;

          // Filter by dimensions (should be similar aspect ratio)
          if (analysis.width < minWidth || analysis.width > maxWidth) continue;
          if (analysis.height < minHeight || analysis.height > maxHeight) continue;

          // Filter by fill ratio (should be fairly rectangular, at least 40% filled)
          if (analysis.fillRatio < 0.4) continue;

          regions.push(analysis);
        }
      }

      return regions;
    }

    // Remove overlapping detections
    function removeOverlaps(regions, minDistance) {
      const sorted = [...regions].sort((a, b) => b.fillRatio - a.fillRatio);
      const kept = [];

      for (const region of sorted) {
        let overlaps = false;
        for (const existing of kept) {
          const dist = Math.sqrt(
            Math.pow(region.centerX - existing.centerX, 2) +
            Math.pow(region.centerY - existing.centerY, 2)
          );
          if (dist < minDistance) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          kept.push(region);
        }
      }

      return kept;
    }

    self.onmessage = function(event) {
      const {
        type,
        imageData,
        selectionX,
        selectionY,
        selectionWidth,
        selectionHeight,
        colorTolerance,
        sizeTolerance,
        minRegionSize
      } = event.data;

      if (type !== 'detect') {
        postMessage({ type: 'error', message: 'Unknown message type' });
        return;
      }

      try {
        const { data, width, height } = imageData;

        postMessage({ type: 'progress', stage: 'Sampling selection', percent: 10 });

        // Get the average color from the selected region
        const targetColor = getAverageColor(
          data, width,
          selectionX, selectionY,
          selectionWidth, selectionHeight
        );
        console.log('Target color:', targetColor);

        postMessage({ type: 'progress', stage: 'Scanning image', percent: 20 });

        // Find all regions with similar color and size
        const regions = findAllSimilarRegions(
          imageData,
          targetColor,
          colorTolerance,
          minRegionSize,
          selectionWidth,
          selectionHeight,
          sizeTolerance
        );

        postMessage({ type: 'progress', stage: 'Filtering results', percent: 80 });

        // Remove overlapping detections
        const minDist = Math.min(selectionWidth, selectionHeight) * 0.8;
        const filtered = removeOverlaps(regions, minDist);

        postMessage({ type: 'progress', stage: 'Complete', percent: 100 });

        // Convert to booth format
        const booths = filtered.map(region => ({
          x: Math.round(region.centerX),
          y: Math.round(region.centerY),
          width: Math.round(region.width),
          height: Math.round(region.height),
          confidence: region.fillRatio
        }));

        console.log('Found', booths.length, 'booths');

        postMessage({ type: 'result', booths });

      } catch (error) {
        postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Detection failed'
        });
      }
    };
  `;
}
