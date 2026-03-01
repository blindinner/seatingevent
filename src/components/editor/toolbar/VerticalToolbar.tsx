'use client';

import { useEditorStore } from '@/stores/editorStore';
import { ToolButton, SubmenuItem } from './ToolButton';
import {
  SelectIcon,
  SelectSeatsIcon,
  BrushSelectIcon,
  SelectSameTypeIcon,
  NodeIcon,
  RowIcon,
  RowSegmentedIcon,
  MultipleRowsIcon,
  RoundTableIcon,
  RectTableIcon,
  BoothIcon,
  BoothRowIcon,
  RectAreaIcon,
  EllipseAreaIcon,
  PolyAreaIcon,
  RectangleIcon,
  EllipseIcon,
  PolygonIcon,
  LineIcon,
  TextIcon,
} from './toolIcons';
import type { ToolType } from '@/types/map';

interface ToolGroup {
  id: string;
  tools: ToolConfig[];
}

interface ToolConfig {
  type: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  submenu?: ToolConfig[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'selection',
    tools: [
      { type: 'select', icon: <SelectIcon />, label: 'Select', shortcut: 'V' },
      { type: 'selectSeats', icon: <SelectSeatsIcon />, label: 'Select Seats', shortcut: 'X' },
      { type: 'brush', icon: <BrushSelectIcon />, label: 'Brush Select', shortcut: 'C' },
      { type: 'selectSameType', icon: <SelectSameTypeIcon />, label: 'Select Same Type', shortcut: 'Z' },
      { type: 'node', icon: <NodeIcon />, label: 'Edit Nodes', shortcut: 'A' },
    ],
  },
  {
    id: 'seating',
    tools: [
      {
        type: 'row',
        icon: <RowIcon />,
        label: 'Row',
        shortcut: 'R',
        submenu: [
          { type: 'row', icon: <RowIcon />, label: 'Single Row', shortcut: 'R' },
          { type: 'rowSegmented', icon: <RowSegmentedIcon />, label: 'Row with Segments' },
          { type: 'multipleRows', icon: <MultipleRowsIcon />, label: 'Multiple Rows' },
        ],
      },
      {
        type: 'roundTable',
        icon: <RoundTableIcon />,
        label: 'Table',
        shortcut: 'E',
        submenu: [
          { type: 'roundTable', icon: <RoundTableIcon />, label: 'Round Table', shortcut: 'E' },
          { type: 'rectTable', icon: <RectTableIcon />, label: 'Rectangular Table' },
        ],
      },
      {
        type: 'booth',
        icon: <BoothIcon />,
        label: 'Booth',
        shortcut: 'B',
        submenu: [
          { type: 'booth', icon: <BoothIcon />, label: 'Single Booth', shortcut: 'B' },
          { type: 'boothSegmented', icon: <BoothRowIcon />, label: 'Booth Row' },
        ],
      },
    ],
  },
  {
    id: 'areas',
    tools: [
      {
        type: 'rectArea',
        icon: <RectAreaIcon />,
        label: 'General Admission',
        shortcut: 'G',
        submenu: [
          { type: 'rectArea', icon: <RectAreaIcon />, label: 'Rectangular Area', shortcut: 'G' },
          { type: 'ellipseArea', icon: <EllipseAreaIcon />, label: 'Elliptical Area' },
          { type: 'polyArea', icon: <PolyAreaIcon />, label: 'Polygonal Area' },
        ],
      },
    ],
  },
  {
    id: 'shapes',
    tools: [
      {
        type: 'rectangle',
        icon: <RectangleIcon />,
        label: 'Shape',
        shortcut: 'H',
        submenu: [
          { type: 'rectangle', icon: <RectangleIcon />, label: 'Rectangle', shortcut: 'H' },
          { type: 'ellipse', icon: <EllipseIcon />, label: 'Ellipse' },
          { type: 'polygon', icon: <PolygonIcon />, label: 'Polygon' },
        ],
      },
    ],
  },
  {
    id: 'other',
    tools: [
      { type: 'line', icon: <LineIcon />, label: 'Line', shortcut: 'L' },
      { type: 'text', icon: <TextIcon />, label: 'Text', shortcut: 'T' },
    ],
  },
];

export function VerticalToolbar() {
  const { activeTool, setActiveTool } = useEditorStore();

  // Check if any tool in a group (including submenu) is active
  const isToolActive = (tool: ToolConfig): boolean => {
    if (activeTool === tool.type) return true;
    if (tool.submenu) {
      return tool.submenu.some((subTool) => activeTool === subTool.type);
    }
    return false;
  };

  // Get the currently active icon for tools with submenus
  const getActiveIcon = (tool: ToolConfig): React.ReactNode => {
    if (tool.submenu) {
      const activeSub = tool.submenu.find((sub) => sub.type === activeTool);
      if (activeSub) return activeSub.icon;
    }
    return tool.icon;
  };

  const handleToolSelect = (type: ToolType) => {
    setActiveTool(type);
  };

  return (
    <div className="w-[52px] h-full bg-gray-900 border-r border-gray-800 flex flex-col py-2 shrink-0">
      {/* Tool groups */}
      <div className="flex-1 flex flex-col gap-1">
        {TOOL_GROUPS.map((group, groupIndex) => (
          <div key={group.id}>
            {/* Divider between groups */}
            {groupIndex > 0 && (
              <div className="mx-2 my-2 border-t border-gray-800" />
            )}

            {/* Tools in group */}
            <div className="flex flex-col items-center gap-1 px-1.5">
              {group.tools.map((tool) => (
                <ToolButton
                  key={tool.type}
                  icon={getActiveIcon(tool)}
                  label={tool.label}
                  shortcut={tool.shortcut}
                  isActive={isToolActive(tool)}
                  hasSubmenu={!!tool.submenu}
                  onClick={() => handleToolSelect(tool.type)}
                  submenuContent={
                    tool.submenu && (
                      <>
                        {tool.submenu.map((subTool) => (
                          <SubmenuItem
                            key={subTool.type}
                            icon={subTool.icon}
                            label={subTool.label}
                            shortcut={subTool.shortcut}
                            isActive={activeTool === subTool.type}
                            onClick={() => handleToolSelect(subTool.type)}
                          />
                        ))}
                      </>
                    )
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
