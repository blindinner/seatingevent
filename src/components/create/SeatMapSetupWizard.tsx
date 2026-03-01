'use client';

import { useState } from 'react';
import type { MapElement, BackgroundImage, RowElement, SectionElement, StageElement, SeatElement, SeatCategory } from '@/types/map';
import { ImageImportWizard } from '@/components/editor/ImageImportWizard';
import { nanoid } from 'nanoid';

type SetupMode = 'select' | 'import-image';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  generate: () => MapElement[];
}

interface SeatMapSetupWizardProps {
  onComplete: (elements: MapElement[], backgroundImage?: BackgroundImage) => void;
  onCancel: () => void;
}

// Helper to create a row of seats
function createRow(
  rowLabel: string,
  x: number,
  y: number,
  seatCount: number,
  seatSpacing: number = 30,
  category: SeatCategory = 'general'
): RowElement {
  const seats: SeatElement[] = [];
  for (let i = 0; i < seatCount; i++) {
    seats.push({
      id: nanoid(),
      type: 'seat' as const,
      x: i * seatSpacing,
      y: 0,
      rotation: 0,
      locked: false,
      visible: true,
      label: `${rowLabel}${i + 1}`,
      category,
      status: 'available' as const,
      radius: 12,
    });
  }

  return {
    id: nanoid(),
    type: 'row',
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    seatCount,
    seatSpacing,
    seatRadius: 12,
    seats,
    curved: false,
    label: rowLabel,
    numberingDirection: 'left-to-right',
    startNumber: 1,
    category,
  };
}

// Helper to create a section
function createSection(
  label: string,
  x: number,
  y: number,
  rows: RowElement[],
  category: string = 'general'
): SectionElement {
  return {
    id: nanoid(),
    type: 'section',
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    label,
    rows,
    rowSpacing: 35,
    category: category as SeatCategory,
  };
}

// Helper to create a stage
function createStage(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string = 'STAGE'
): StageElement {
  return {
    id: nanoid(),
    type: 'stage' as const,
    x,
    y,
    rotation: 0,
    locked: false,
    visible: true,
    width,
    height,
    label,
    shape: 'rounded' as const,
    fill: 'rgba(255,255,255,0.1)',
  };
}

// Template definitions
const templates: Template[] = [
  {
    id: 'theater',
    name: 'Theater',
    description: 'Classic theater layout with stage and rows',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="3" width="18" height="6" rx="1" strokeLinecap="round" />
        <circle cx="6" cy="14" r="1.5" fill="currentColor" />
        <circle cx="10" cy="14" r="1.5" fill="currentColor" />
        <circle cx="14" cy="14" r="1.5" fill="currentColor" />
        <circle cx="18" cy="14" r="1.5" fill="currentColor" />
        <circle cx="6" cy="19" r="1.5" fill="currentColor" />
        <circle cx="10" cy="19" r="1.5" fill="currentColor" />
        <circle cx="14" cy="19" r="1.5" fill="currentColor" />
        <circle cx="18" cy="19" r="1.5" fill="currentColor" />
      </svg>
    ),
    preview: (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <rect x="40" y="10" width="120" height="25" rx="4" fill="rgba(255,255,255,0.15)" />
        <text x="100" y="27" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">STAGE</text>
        {[0, 1, 2, 3, 4].map((row) => (
          <g key={row} transform={`translate(0, ${50 + row * 22})`}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((seat) => (
              <circle
                key={seat}
                cx={35 + seat * 18}
                cy="0"
                r="6"
                fill={row < 2 ? '#EF4444' : '#3B82F6'}
                opacity="0.8"
              />
            ))}
          </g>
        ))}
      </svg>
    ),
    generate: () => {
      const elements: MapElement[] = [];

      // Add stage
      elements.push(createStage(100, 20, 200, 40, 'STAGE'));

      // Add rows
      const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      rowLabels.forEach((label, index) => {
        elements.push(createRow(label, 50, 100 + index * 35, 10, 30, 'general'));
      });

      return elements;
    },
  },
  {
    id: 'conference',
    name: 'Conference',
    description: 'Meeting room with sections',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="2" y="2" width="8" height="8" rx="1" />
        <rect x="14" y="2" width="8" height="8" rx="1" />
        <rect x="2" y="14" width="8" height="8" rx="1" />
        <rect x="14" y="14" width="8" height="8" rx="1" />
      </svg>
    ),
    preview: (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        {/* Left section */}
        <g transform="translate(10, 10)">
          {[0, 1, 2, 3].map((row) => (
            <g key={row} transform={`translate(0, ${row * 18})`}>
              {[0, 1, 2, 3].map((seat) => (
                <circle key={seat} cx={seat * 16 + 8} cy="8" r="5" fill="#3B82F6" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        {/* Right section */}
        <g transform="translate(110, 10)">
          {[0, 1, 2, 3].map((row) => (
            <g key={row} transform={`translate(0, ${row * 18})`}>
              {[0, 1, 2, 3].map((seat) => (
                <circle key={seat} cx={seat * 16 + 8} cy="8" r="5" fill="#3B82F6" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        {/* Bottom left section */}
        <g transform="translate(10, 90)">
          {[0, 1, 2].map((row) => (
            <g key={row} transform={`translate(0, ${row * 18})`}>
              {[0, 1, 2, 3].map((seat) => (
                <circle key={seat} cx={seat * 16 + 8} cy="8" r="5" fill="#22C55E" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
        {/* Bottom right section */}
        <g transform="translate(110, 90)">
          {[0, 1, 2].map((row) => (
            <g key={row} transform={`translate(0, ${row * 18})`}>
              {[0, 1, 2, 3].map((seat) => (
                <circle key={seat} cx={seat * 16 + 8} cy="8" r="5" fill="#22C55E" opacity="0.8" />
              ))}
            </g>
          ))}
        </g>
      </svg>
    ),
    generate: () => {
      const elements: MapElement[] = [];

      // Create 4 sections
      const leftTopRows: RowElement[] = [];
      const rightTopRows: RowElement[] = [];
      const leftBottomRows: RowElement[] = [];
      const rightBottomRows: RowElement[] = [];

      ['A', 'B', 'C', 'D'].forEach((label, i) => {
        leftTopRows.push(createRow(label, 0, i * 35, 6, 30, 'general'));
        rightTopRows.push(createRow(label, 0, i * 35, 6, 30, 'general'));
      });

      ['E', 'F', 'G'].forEach((label, i) => {
        leftBottomRows.push(createRow(label, 0, i * 35, 6, 30, 'general'));
        rightBottomRows.push(createRow(label, 0, i * 35, 6, 30, 'general'));
      });

      elements.push(createSection('Section A', 50, 50, leftTopRows, 'general'));
      elements.push(createSection('Section B', 300, 50, rightTopRows, 'general'));
      elements.push(createSection('Section C', 50, 250, leftBottomRows, 'general'));
      elements.push(createSection('Section D', 300, 250, rightBottomRows, 'general'));

      return elements;
    },
  },
  {
    id: 'classroom',
    name: 'Classroom',
    description: 'Lecture hall with podium',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <circle cx="6" cy="12" r="2" fill="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <circle cx="18" cy="12" r="2" fill="currentColor" />
        <circle cx="6" cy="18" r="2" fill="currentColor" />
        <circle cx="12" cy="18" r="2" fill="currentColor" />
        <circle cx="18" cy="18" r="2" fill="currentColor" />
      </svg>
    ),
    preview: (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        <rect x="70" y="10" width="60" height="20" rx="3" fill="rgba(255,255,255,0.15)" />
        <text x="100" y="24" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">PODIUM</text>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <g key={row} transform={`translate(0, ${45 + row * 17})`}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((seat) => (
              <circle
                key={seat}
                cx={20 + seat * 17}
                cy="0"
                r="5"
                fill="#3B82F6"
                opacity="0.8"
              />
            ))}
          </g>
        ))}
      </svg>
    ),
    generate: () => {
      const elements: MapElement[] = [];

      // Add podium
      elements.push(createStage(150, 20, 100, 30, 'PODIUM'));

      // Add rows
      const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      rowLabels.forEach((label, index) => {
        elements.push(createRow(label, 50, 80 + index * 32, 12, 28, 'general'));
      });

      return elements;
    },
  },
  {
    id: 'stadium',
    name: 'Stadium',
    description: 'Large venue with multiple sections',
    icon: (
      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <ellipse cx="12" cy="12" rx="10" ry="7" />
        <ellipse cx="12" cy="12" rx="5" ry="3" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
    preview: (
      <svg viewBox="0 0 200 150" className="w-full h-full">
        {/* Field */}
        <ellipse cx="100" cy="75" rx="40" ry="25" fill="rgba(34, 197, 94, 0.2)" stroke="rgba(34, 197, 94, 0.5)" />
        {/* Surrounding seats */}
        {[0, 1, 2].map((ring) => {
          const radius = 55 + ring * 18;
          const seats = 20 + ring * 6;
          return (
            <g key={ring}>
              {Array.from({ length: seats }).map((_, i) => {
                const angle = (i / seats) * Math.PI * 2 - Math.PI / 2;
                const x = 100 + Math.cos(angle) * radius;
                const y = 75 + Math.sin(angle) * (radius * 0.6);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={ring === 0 ? '#EF4444' : ring === 1 ? '#F97316' : '#3B82F6'}
                    opacity="0.8"
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
    ),
    generate: () => {
      const elements: MapElement[] = [];

      // Add field/stage
      elements.push(createStage(150, 150, 100, 60, 'FIELD'));

      // Add sections around
      const sections = [
        { name: 'North', x: 100, y: 30, rows: 4, seats: 15 },
        { name: 'South', x: 100, y: 350, rows: 4, seats: 15 },
        { name: 'East', x: 350, y: 100, rows: 4, seats: 8 },
        { name: 'West', x: -100, y: 100, rows: 4, seats: 8 },
      ];

      sections.forEach((section) => {
        const rows: RowElement[] = [];
        for (let i = 0; i < section.rows; i++) {
          rows.push(createRow(String.fromCharCode(65 + i), 0, i * 35, section.seats, 28, 'general'));
        }
        elements.push(createSection(section.name, section.x, section.y, rows, 'general'));
      });

      return elements;
    },
  },
];

export function SeatMapSetupWizard({ onComplete, onCancel }: SeatMapSetupWizardProps) {
  const [mode, setMode] = useState<SetupMode>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Handle blank canvas
  const handleBlankCanvas = () => {
    onComplete([]);
  };

  // Handle template selection
  const handleUseTemplate = () => {
    if (!selectedTemplate) return;
    const template = templates.find((t) => t.id === selectedTemplate);
    if (template) {
      onComplete(template.generate());
    }
  };

  // Handle image import completion
  const handleImageImportComplete = (elements: MapElement[], backgroundImage?: BackgroundImage) => {
    onComplete(elements, backgroundImage);
  };

  // Show image import wizard
  if (mode === 'import-image') {
    return (
      <ImageImportWizard
        onComplete={handleImageImportComplete}
        onCancel={() => setMode('select')}
      />
    );
  }

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
          <h1 className="text-lg font-semibold text-white">Create Seat Map</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            How would you like to start?
          </h2>
          <p className="text-gray-400 text-center mb-10">
            Choose a starting point for your seat map
          </p>

          {/* Options Grid */}
          <div className="grid grid-cols-3 gap-6 mb-10">
            {/* Blank Canvas */}
            <button
              onClick={handleBlankCanvas}
              className="group flex flex-col items-center p-6 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500 rounded-2xl transition-all"
            >
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-xl bg-gray-700/50 group-hover:bg-gray-700 transition-colors">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M12 8v8m-4-4h8" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Blank Canvas</h3>
              <p className="text-gray-500 text-sm text-center">
                Start from scratch with a blank canvas
              </p>
            </button>

            {/* Import from Image */}
            <button
              onClick={() => setMode('import-image')}
              className="group flex flex-col items-center p-6 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-indigo-500 rounded-2xl transition-all"
            >
              <div className="w-20 h-20 flex items-center justify-center mb-4 rounded-xl bg-gray-700/50 group-hover:bg-gray-700 transition-colors">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-400 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Import from Image</h3>
              <p className="text-gray-500 text-sm text-center">
                Upload a floor plan and detect seats
              </p>
            </button>

            {/* Template Selection Toggle */}
            <button
              onClick={() => setSelectedTemplate(selectedTemplate ? null : templates[0].id)}
              className={`group flex flex-col items-center p-6 border rounded-2xl transition-all ${
                selectedTemplate
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'bg-gray-800/50 hover:bg-gray-800 border-gray-700 hover:border-indigo-500'
              }`}
            >
              <div className={`w-20 h-20 flex items-center justify-center mb-4 rounded-xl transition-colors ${
                selectedTemplate ? 'bg-indigo-600/30' : 'bg-gray-700/50 group-hover:bg-gray-700'
              }`}>
                <svg viewBox="0 0 24 24" className={`w-10 h-10 transition-colors ${
                  selectedTemplate ? 'text-indigo-400' : 'text-gray-400 group-hover:text-indigo-400'
                }`} fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Use Template</h3>
              <p className="text-gray-500 text-sm text-center">
                Start with a pre-built layout
              </p>
            </button>
          </div>

          {/* Template Selection */}
          {selectedTemplate !== null && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-lg font-semibold text-white mb-4">Choose a Template</h3>
              <div className="grid grid-cols-4 gap-4 mb-6">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                      selectedTemplate === template.id
                        ? 'bg-indigo-600/20 border-indigo-500'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-12 h-12 flex items-center justify-center mb-3 rounded-lg transition-colors ${
                      selectedTemplate === template.id ? 'text-indigo-400' : 'text-gray-400'
                    }`}>
                      {template.icon}
                    </div>
                    <h4 className="text-white font-medium text-sm">{template.name}</h4>
                    <p className="text-gray-500 text-xs text-center mt-1">{template.description}</p>
                  </button>
                ))}
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-2">
                        {templates.find((t) => t.id === selectedTemplate)?.name} Preview
                      </h4>
                      <p className="text-gray-400 text-sm mb-4">
                        {templates.find((t) => t.id === selectedTemplate)?.description}
                      </p>
                      <button
                        onClick={handleUseTemplate}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                      >
                        Use This Template
                      </button>
                    </div>
                    <div className="w-64 h-40 bg-gray-900 rounded-lg overflow-hidden">
                      {templates.find((t) => t.id === selectedTemplate)?.preview}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
