'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@/components/editor/Canvas';
import { VerticalToolbar } from '@/components/editor/toolbar/VerticalToolbar';
import { PropertyPanel } from '@/components/editor/PropertyPanel';
import { SeatMapSetupWizard } from '@/components/create/SeatMapSetupWizard';
import { useMapStore } from '@/stores/mapStore';
import { useEditorStore } from '@/stores/editorStore';
import type { MapElement, BackgroundImage } from '@/types/map';

interface SeatMapEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SeatMapEditorModal({ isOpen, onClose }: SeatMapEditorModalProps) {
  const { map, createNewMap, addElements, setBackgroundImage } = useMapStore();
  const { deselectAll, setActiveTool } = useEditorStore();
  const [showWizard, setShowWizard] = useState(false);

  // Show wizard when modal opens and there's no map
  useEffect(() => {
    if (isOpen && !map) {
      setShowWizard(true);
    }
  }, [isOpen, map]);

  // Reset editor state when opening
  useEffect(() => {
    if (isOpen && !showWizard) {
      deselectAll();
      setActiveTool('select');
    }
  }, [isOpen, showWizard, deselectAll, setActiveTool]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showWizard) {
          setShowWizard(false);
          if (!map) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showWizard, map, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle wizard completion
  const handleWizardComplete = (elements: MapElement[], backgroundImage?: BackgroundImage) => {
    // Create a new map first
    createNewMap('Event Seat Map');

    // Add elements if any
    if (elements.length > 0) {
      // Use setTimeout to ensure map is created first
      setTimeout(() => {
        addElements(elements);
      }, 0);
    }

    // Set background image if provided
    if (backgroundImage) {
      setTimeout(() => {
        setBackgroundImage(backgroundImage);
      }, 0);
    }

    setShowWizard(false);
  };

  // Handle wizard cancel
  const handleWizardCancel = () => {
    setShowWizard(false);
    if (!map) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Show wizard if needed
  if (showWizard) {
    return createPortal(
      <SeatMapSetupWizard
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <span>←</span>
            <span>Back to event</span>
          </button>
          <div className="w-px h-5 bg-white/10" />
          <h1 className="text-[15px] font-semibold text-white">
            {map?.name || 'Seat Map Editor'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[13px] font-medium hover:bg-white/20 transition-colors"
          >
            Start Over
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Vertical Toolbar */}
        <VerticalToolbar />

        {/* Canvas - center area */}
        <Canvas />

        {/* Right Property Panel */}
        <PropertyPanel />
      </div>
    </div>,
    document.body
  );
}
