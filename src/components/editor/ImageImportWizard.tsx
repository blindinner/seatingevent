'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { ImageUploader, SeatScanner, BoothScanner, DetectionResults } from './import';
import { groupSeatsIntoRows } from '@/lib/imageDetection';
import { detectSeatsByColor, detectBoothsByColor, calculateExpectedRadius } from '@/lib/colorDetector';
import type { BackgroundImage, MapElement, RowElement, SeatElement, BoothElement } from '@/types/map';

type WizardStep = 'upload' | 'selectType' | 'detectSeats' | 'detectBooths' | 'results' | 'finalize';

type DetectionType = 'seats' | 'booths';

interface UploadedImage {
  src: string;
  width: number;
  height: number;
  fileName: string;
}

interface DetectedElement {
  type: 'seat' | 'booth';
  x: number;
  y: number;
  width?: number;
  height?: number;
  confidence: number;
}

interface ImageImportWizardProps {
  onComplete: (elements: MapElement[], backgroundImage?: BackgroundImage) => void;
  onCancel: () => void;
}

export function ImageImportWizard({ onComplete, onCancel }: ImageImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('upload');
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [detectedElements, setDetectedElements] = useState<DetectedElement[]>([]);
  const [keepBackground, setKeepBackground] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  const handleImageUpload = useCallback((uploadedImage: UploadedImage) => {
    setImage(uploadedImage);
    setStep('selectType');
  }, []);

  const handleSelectType = useCallback((type: DetectionType | 'skip') => {
    if (type === 'skip') {
      // Skip detection, go straight to finalize with just the background image
      setStep('finalize');
    } else if (type === 'seats') {
      setStep('detectSeats');
    } else {
      setStep('detectBooths');
    }
  }, []);

  const handleDetectionComplete = useCallback((elements: DetectedElement[]) => {
    setDetectedElements((prev) => [...prev, ...elements]);
    setStep('results');
  }, []);

  const handleDetectAnother = useCallback(() => {
    setStep('selectType');
  }, []);

  // Go back to scan for another color while keeping existing detections
  const handleDetectAnotherColor = useCallback(() => {
    // Check what type we were detecting
    const hasSeats = detectedElements.some((el) => el.type === 'seat');
    const hasBooths = detectedElements.some((el) => el.type === 'booth');

    // Go back to the appropriate scanner
    if (hasBooths && !hasSeats) {
      setStep('detectBooths');
    } else {
      setStep('detectSeats');
    }
  }, [detectedElements]);

  const handleBoothScan = useCallback(async (selection: { x: number; y: number; width: number; height: number }) => {
    if (!image) return;

    setIsDetecting(true);
    setDetectionError(null);

    try {
      console.log('Detecting booths with selection:', selection);

      // Run color-based booth detection
      const detected = await detectBoothsByColor(
        image.src,
        selection,
        {
          colorTolerance: 40,
          sizeTolerance: 0.5,
          minRegionSize: 50,
        },
        (progress) => {
          console.log(`Detection progress: ${progress.stage} (${progress.percent}%)`);
        }
      );

      console.log('Detected', detected.length, 'booths');

      // Convert to DetectedElement format
      let newBooths: DetectedElement[] = detected.map((booth) => ({
        type: 'booth' as const,
        x: booth.x,
        y: booth.y,
        width: booth.width,
        height: booth.height,
        confidence: booth.confidence,
      }));

      // If no booths detected, use the selection as a fallback
      if (newBooths.length === 0) {
        console.log('No booths detected, using selection as fallback');
        newBooths.push({
          type: 'booth',
          x: selection.x + selection.width / 2,
          y: selection.y + selection.height / 2,
          width: selection.width,
          height: selection.height,
          confidence: 1.0,
        });
      }

      // APPEND to existing detections (supports multi-color detection)
      setDetectedElements((prev) => {
        // Filter out duplicates (booths too close to existing ones)
        const minDistance = Math.min(selection.width, selection.height) * 0.8;
        const filtered = newBooths.filter((newBooth) => {
          return !prev.some((existing) => {
            const dist = Math.sqrt(
              Math.pow(newBooth.x - existing.x, 2) + Math.pow(newBooth.y - existing.y, 2)
            );
            return dist < minDistance;
          });
        });
        console.log(`Adding ${filtered.length} new booths (${newBooths.length - filtered.length} duplicates filtered)`);
        return [...prev, ...filtered];
      });

      setStep('results');
    } catch (error) {
      console.error('Detection failed:', error);
      setDetectionError('Failed to detect booths. Please try again or skip to manual placement.');

      // Fallback: just add the selection as a booth
      setDetectedElements((prev) => [...prev, {
        type: 'booth',
        x: selection.x + selection.width / 2,
        y: selection.y + selection.height / 2,
        width: selection.width,
        height: selection.height,
        confidence: 1.0,
      }]);
      setStep('results');
    } finally {
      setIsDetecting(false);
    }
  }, [image]);

  const handleSeatScan = useCallback(async (scanZoom: number, samplePoint: { x: number; y: number }) => {
    if (!image) return;

    // Store the zoom level for scale calculation
    setZoom(scanZoom);
    setIsDetecting(true);
    setDetectionError(null);

    try {
      // Calculate expected radius based on zoom level
      const expectedRadius = calculateExpectedRadius(scanZoom);
      console.log('Detecting seats with expected radius:', expectedRadius, 'at zoom:', scanZoom);
      console.log('Sample point:', samplePoint);

      // Run color-based detection
      // Finds all regions matching the color at the clicked point
      const detected = await detectSeatsByColor(
        image.src,
        samplePoint,
        {
          expectedRadius,
          colorTolerance: 40,
          sizeTolerance: 0.5,
          minRegionSize: 20,
        },
        (progress) => {
          console.log(`Detection progress: ${progress.stage} (${progress.percent}%)`);
        }
      );

      console.log('Detected', detected.length, 'seats');

      // Convert to DetectedElement format
      let newSeats: DetectedElement[] = detected.map((seat) => ({
        type: 'seat' as const,
        x: seat.x,
        y: seat.y,
        confidence: seat.confidence,
      }));

      // If no seats detected, use the clicked point as a fallback
      if (newSeats.length === 0) {
        console.log('No seats detected, using clicked point as fallback');
        newSeats.push({
          type: 'seat',
          x: samplePoint.x,
          y: samplePoint.y,
          confidence: 1.0,
        });
      }

      // APPEND to existing detections (supports multi-color detection)
      setDetectedElements((prev) => {
        // Filter out duplicates (seats too close to existing ones)
        const minDistance = expectedRadius * 1.5;
        const filtered = newSeats.filter((newSeat) => {
          return !prev.some((existing) => {
            const dist = Math.sqrt(
              Math.pow(newSeat.x - existing.x, 2) + Math.pow(newSeat.y - existing.y, 2)
            );
            return dist < minDistance;
          });
        });
        console.log(`Adding ${filtered.length} new seats (${newSeats.length - filtered.length} duplicates filtered)`);
        return [...prev, ...filtered];
      });
      setStep('results');
    } catch (error) {
      console.error('Detection failed:', error);
      setDetectionError('Failed to detect seats. Please try again or skip to manual placement.');

      // Fallback: just add the clicked point
      setDetectedElements([{
        type: 'seat',
        x: samplePoint.x,
        y: samplePoint.y,
        confidence: 1.0,
      }]);
      setStep('results');
    } finally {
      setIsDetecting(false);
    }
  }, [image]);

  const handleFinalize = useCallback(() => {
    const mapElements: MapElement[] = [];

    // Get only seat elements from detected
    const seatElements = detectedElements.filter((el) => el.type === 'seat');

    if (seatElements.length > 0) {
      // Convert to format expected by groupSeatsIntoRows
      const seatsForGrouping = seatElements.map((el) => ({
        x: el.x,
        y: el.y,
        radius: 12,
        confidence: el.confidence,
      }));

      // Group seats into rows
      const rows = groupSeatsIntoRows(seatsForGrouping, 30);

      // Create RowElement for each detected row
      rows.forEach((rowSeats, rowIndex) => {
        if (rowSeats.length === 0) return;

        const rowLabel = String.fromCharCode(65 + rowIndex); // A, B, C, ...

        // Calculate row position (use first seat as reference)
        const rowX = rowSeats[0].x;
        const rowY = rowSeats[0].y;

        // Calculate actual seat spacing from detected positions
        let calculatedSpacing = 30; // Default fallback
        if (rowSeats.length >= 2) {
          let totalDistance = 0;
          for (let i = 1; i < rowSeats.length; i++) {
            const dx = rowSeats[i].x - rowSeats[i - 1].x;
            const dy = rowSeats[i].y - rowSeats[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
          }
          calculatedSpacing = Math.round(totalDistance / (rowSeats.length - 1));
        }

        // Create seat elements for this row
        const seats: SeatElement[] = rowSeats.map((seat, seatIndex) => ({
          id: nanoid(),
          type: 'seat' as const,
          x: seat.x - rowX, // Relative to row position
          y: seat.y - rowY,
          rotation: 0,
          locked: false,
          visible: true,
          label: `${rowLabel}${seatIndex + 1}`,
          category: 'general' as const,
          status: 'available' as const,
          radius: 12,
        }));

        // Create the row element
        const rowElement: RowElement = {
          id: nanoid(),
          type: 'row',
          x: rowX,
          y: rowY,
          rotation: 0,
          locked: false,
          visible: true,
          seatCount: seats.length,
          seatSpacing: calculatedSpacing,
          seatRadius: 12,
          seats,
          curved: false,
          label: rowLabel,
          numberingDirection: 'left-to-right',
          startNumber: 1,
          category: 'general',
        };

        mapElements.push(rowElement);
      });
    }

    // Get booth elements from detected
    const boothElements = detectedElements.filter((el) => el.type === 'booth');

    if (boothElements.length > 0) {
      boothElements.forEach((el, index) => {
        const boothElement: BoothElement = {
          id: nanoid(),
          type: 'booth',
          x: el.x,
          y: el.y,
          rotation: 0,
          locked: false,
          visible: true,
          width: el.width || 60,
          height: el.height || 40,
          label: `${index + 1}`,
          boothNumber: `${index + 1}`,
          fill: '#4f46e5',
          stroke: '#3730a3',
          category: 'general',
        };

        mapElements.push(boothElement);
      });
    }

    // Create background image if user wants to keep it
    const backgroundImage: BackgroundImage | undefined = keepBackground && image
      ? {
          src: image.src,
          width: image.width,
          height: image.height,
          opacity: 0.3,
          visible: true,
          locked: true,
          scale: 1, // Use scale 1 since detected coords are in image space
        }
      : undefined;

    onComplete(mapElements, backgroundImage);
  }, [keepBackground, image, detectedElements, onComplete]);

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <ImageUploader
            onUpload={handleImageUpload}
            onSkip={onCancel}
          />
        );

      case 'selectType':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <h2 className="text-2xl font-bold text-white mb-2">What would you like to detect?</h2>
            <p className="text-gray-400 mb-8">
              Select the type of elements to find in your image
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => handleSelectType('seats')}
                className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl transition-colors"
              >
                <div className="w-16 h-16 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-indigo-400">
                    <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.3" />
                    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <span className="text-white font-medium">Seats</span>
                <span className="text-gray-500 text-sm">Detect circular seats</span>
              </button>

              <button
                onClick={() => handleSelectType('booths')}
                className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl transition-colors"
              >
                <div className="w-16 h-16 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-indigo-400">
                    <rect x="4" y="6" width="16" height="12" fill="currentColor" opacity="0.3" rx="2" />
                    <rect x="4" y="6" width="16" height="12" stroke="currentColor" strokeWidth="2" fill="none" rx="2" />
                  </svg>
                </div>
                <span className="text-white font-medium">Booths</span>
                <span className="text-gray-500 text-sm">Detect rectangular booths</span>
              </button>

              <button
                onClick={() => handleSelectType('skip')}
                className="flex flex-col items-center p-6 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl transition-colors"
              >
                <div className="w-16 h-16 flex items-center justify-center mb-3">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-gray-500">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-white font-medium">Skip</span>
                <span className="text-gray-500 text-sm">Manual placement</span>
              </button>
            </div>
          </div>
        );

      case 'detectSeats':
        return image ? (
          <SeatScanner
            image={image}
            isLoading={isDetecting}
            onScan={handleSeatScan}
            onSkip={() => setStep('finalize')}
          />
        ) : null;

      case 'detectBooths':
        return image ? (
          <BoothScanner
            image={image}
            isLoading={isDetecting}
            onScan={handleBoothScan}
            onSkip={() => setStep('finalize')}
          />
        ) : null;

      case 'results':
        return image ? (
          <DetectionResults
            image={image}
            detectedElements={detectedElements}
            zoom={zoom}
            onElementsChange={setDetectedElements}
            onDetectAnother={handleDetectAnother}
            onDetectAnotherColor={handleDetectAnotherColor}
            onContinue={() => setStep('finalize')}
          />
        ) : null;

      case 'finalize':
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Finalize Import</h2>
            <p className="text-gray-400 mb-8">
              Review your import settings
            </p>

            {/* Preview */}
            {image && (
              <div className="relative w-full max-w-2xl aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={image.src}
                  alt="Uploaded chart"
                  className="w-full h-full object-contain"
                  style={{ opacity: keepBackground ? 0.3 : 0 }}
                />
              </div>
            )}

            {/* Background toggle */}
            <label className="flex items-center gap-3 mb-8 cursor-pointer">
              <input
                type="checkbox"
                checked={keepBackground}
                onChange={(e) => setKeepBackground(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-gray-300">Keep background image as reference layer</span>
            </label>

            <div className="flex gap-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
              >
                Create Map
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">Import from Image</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {(['upload', 'selectType', 'results', 'finalize'] as const).map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full ${
                step === s
                  ? 'bg-indigo-500'
                  : ['upload', 'selectType', 'results', 'finalize'].indexOf(step) > i
                  ? 'bg-indigo-400'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderStep()}
      </div>
    </div>
  );
}
