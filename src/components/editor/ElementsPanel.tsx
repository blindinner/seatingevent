'use client';

import { useMapStore } from '@/stores/mapStore';
import { useEditorStore } from '@/stores/editorStore';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import type { ElementLayer, MapElement, BarElement, PillarElement } from '@/types/map';

// Element templates for adding shapes
const ELEMENT_TEMPLATES = [
  { type: 'stage' as const, icon: '▬', label: 'Stage', defaultProps: { width: 400, height: 80, fill: '#374151' } },
  { type: 'rectangle' as const, icon: '▭', label: 'Rectangle', defaultProps: { width: 200, height: 60, fill: '#4B5563' } },
  { type: 'bar' as const, icon: '▤', label: 'Bar', defaultProps: { width: 150, height: 40, fill: '#78350f' } },
  { type: 'pillar' as const, icon: '●', label: 'Pillar', defaultProps: { radius: 15, fill: '#6B7280' } },
];

interface TemplateButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
}

function TemplateButton({ icon, label, onClick }: TemplateButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 p-3 rounded-lg',
        'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all'
      )}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

export function ElementsPanel() {
  const { map, addElement, updateElement, setElementLayer } = useMapStore();
  const { selectedIds } = useEditorStore();

  const selectedElement = selectedIds.length === 1
    ? map?.elements.find((el) => el.id === selectedIds[0])
    : null;

  const handleAddElement = (template: typeof ELEMENT_TEMPLATES[number]) => {
    const canvasWidth = map?.width || 1000;
    const canvasHeight = map?.height || 800;
    const x = canvasWidth / 2;
    const y = canvasHeight / 2;

    let element: MapElement;

    switch (template.type) {
      case 'stage':
        element = {
          id: nanoid(),
          type: 'stage',
          x: x - template.defaultProps.width / 2,
          y: y - template.defaultProps.height / 2,
          rotation: 0,
          locked: false,
          visible: true,
          width: template.defaultProps.width,
          height: template.defaultProps.height,
          label: 'STAGE',
          shape: 'rectangle',
          fill: template.defaultProps.fill,
          layer: 'below',
        };
        break;
      case 'rectangle':
        element = {
          id: nanoid(),
          type: 'rectangle',
          x: x - template.defaultProps.width / 2,
          y: y - template.defaultProps.height / 2,
          rotation: 0,
          locked: false,
          visible: true,
          width: template.defaultProps.width,
          height: template.defaultProps.height,
          fill: template.defaultProps.fill,
          stroke: '#4B5563',
          strokeWidth: 0,
          cornerRadius: 0,
          layer: 'below',
        };
        break;
      case 'bar':
        element = {
          id: nanoid(),
          type: 'bar',
          x: x - template.defaultProps.width / 2,
          y: y - template.defaultProps.height / 2,
          rotation: 0,
          locked: false,
          visible: true,
          width: template.defaultProps.width,
          height: template.defaultProps.height,
          label: 'BAR',
          fill: template.defaultProps.fill,
          layer: 'below',
        } as BarElement;
        break;
      case 'pillar':
        element = {
          id: nanoid(),
          type: 'pillar',
          x,
          y,
          rotation: 0,
          locked: false,
          visible: true,
          radius: template.defaultProps.radius,
          fill: template.defaultProps.fill,
          layer: 'above',
        } as PillarElement;
        break;
      default:
        return;
    }

    addElement(element);
  };

  const handleLayerChange = (layer: ElementLayer) => {
    if (selectedIds.length === 1) {
      setElementLayer(selectedIds[0], layer);
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Elements Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Add Elements
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ELEMENT_TEMPLATES.map((template) => (
            <TemplateButton
              key={template.label}
              icon={template.icon}
              label={template.label}
              onClick={() => handleAddElement(template)}
            />
          ))}
        </div>
      </div>

      {/* Selected Element Properties */}
      {selectedElement && (
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Layer
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleLayerChange('below')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                selectedElement.layer === 'below'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Below Seats
            </button>
            <button
              onClick={() => handleLayerChange('above')}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                selectedElement.layer === 'above'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              Above Seats
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 mt-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Tips
        </h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>Click to add elements</li>
          <li>Drag to position</li>
          <li>Use layers to control z-order</li>
          <li>Shift+click to multi-select</li>
        </ul>
      </div>
    </div>
  );
}
