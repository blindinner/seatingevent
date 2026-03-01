import { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const iconProps: IconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// Selection Tools
export function SelectIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 4l8 12-3-4-4 1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SelectSeatsIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="7" cy="7" r="3" />
      <circle cx="13" cy="7" r="3" />
      <circle cx="7" cy="13" r="3" />
      <circle cx="13" cy="13" r="3" />
      <path d="M2 2l4 4M14 2l4 4" strokeWidth="1" />
    </svg>
  );
}

export function BrushSelectIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M15 3l2 2-10 10H5v-2L15 3z" />
      <path d="M13 5l2 2" />
    </svg>
  );
}

export function SelectSameTypeIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="14" cy="6" r="3" />
      <circle cx="6" cy="14" r="3" />
      <circle cx="14" cy="14" r="3" />
    </svg>
  );
}

export function NodeIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 16L10 4L16 16" />
      <circle cx="4" cy="16" r="2" fill="currentColor" />
      <circle cx="10" cy="4" r="2" fill="currentColor" />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

// Seating Tools
export function RowIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="4" cy="10" r="2.5" />
      <circle cx="10" cy="10" r="2.5" />
      <circle cx="16" cy="10" r="2.5" />
    </svg>
  );
}

export function RowSegmentedIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="3" cy="10" r="2" />
      <circle cx="8" cy="10" r="2" />
      <line x1="11" y1="10" x2="13" y2="10" strokeDasharray="1 1" />
      <circle cx="16" cy="10" r="2" />
    </svg>
  );
}

export function MultipleRowsIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="4" cy="5" r="2" />
      <circle cx="10" cy="5" r="2" />
      <circle cx="16" cy="5" r="2" />
      <circle cx="4" cy="10" r="2" />
      <circle cx="10" cy="10" r="2" />
      <circle cx="16" cy="10" r="2" />
      <circle cx="4" cy="15" r="2" />
      <circle cx="10" cy="15" r="2" />
      <circle cx="16" cy="15" r="2" />
    </svg>
  );
}

export function RoundTableIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="10" cy="10" r="5" />
      <circle cx="10" cy="3" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="15" cy="14" r="1.5" />
      <circle cx="10" cy="17" r="1.5" />
      <circle cx="5" cy="14" r="1.5" />
      <circle cx="5" cy="6" r="1.5" />
    </svg>
  );
}

export function RectTableIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="5" y="6" width="10" height="8" rx="1" />
      <circle cx="5" cy="10" r="1.5" />
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  );
}

export function BoothIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 6h12v8H4z" />
      <circle cx="7" cy="10" r="2" />
      <circle cx="13" cy="10" r="2" />
    </svg>
  );
}

export function BoothRowIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      {/* Three booths in a row */}
      <rect x="1" y="7" width="5" height="6" rx="0.5" />
      <rect x="7.5" y="7" width="5" height="6" rx="0.5" />
      <rect x="14" y="7" width="5" height="6" rx="0.5" />
    </svg>
  );
}

// Area Tools
export function RectAreaIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="5" width="14" height="10" rx="1" strokeDasharray="2 1" />
      <text x="10" y="12" fontSize="6" fill="currentColor" textAnchor="middle" stroke="none">GA</text>
    </svg>
  );
}

export function EllipseAreaIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <ellipse cx="10" cy="10" rx="7" ry="5" strokeDasharray="2 1" />
      <text x="10" y="12" fontSize="6" fill="currentColor" textAnchor="middle" stroke="none">GA</text>
    </svg>
  );
}

export function PolyAreaIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M10 3L17 8L14 17H6L3 8Z" strokeDasharray="2 1" />
      <text x="10" y="12" fontSize="6" fill="currentColor" textAnchor="middle" stroke="none">GA</text>
    </svg>
  );
}

// Shape Tools
export function RectangleIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="5" width="14" height="10" rx="1" />
    </svg>
  );
}

export function EllipseIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <ellipse cx="10" cy="10" rx="7" ry="5" />
    </svg>
  );
}

export function PolygonIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M10 3L17 8L14 17H6L3 8Z" />
    </svg>
  );
}

// Other Tools
export function LineIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <line x1="4" y1="16" x2="16" y2="4" />
      <circle cx="4" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="4" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 6h12M10 6v10M7 16h6" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="4" width="14" height="12" rx="1" />
      <circle cx="7" cy="8" r="1.5" />
      <path d="M3 14l4-4 3 3 3-3 4 4" />
    </svg>
  );
}

export function IconIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M10 3l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z" />
    </svg>
  );
}

export function PanIcon(props: IconProps) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M8 14V6a2 2 0 114 0v4" />
      <path d="M12 10V8a2 2 0 114 0v6c0 3-2 4-4 4H9c-3 0-5-2-5-5v-2a2 2 0 114 0" />
    </svg>
  );
}

// Submenu indicator
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...iconProps} width="8" height="8" viewBox="0 0 8 8" {...props}>
      <path d="M2 1l3 3-3 3" />
    </svg>
  );
}
