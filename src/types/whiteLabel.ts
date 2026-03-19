export interface BackgroundElement {
  type: 'image' | 'text';
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  opacity?: number;
  zIndex?: number;
  // Image properties
  imageUrl?: string;
  width?: string;
  height?: string;
  blur?: number;
  // Text properties
  text?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  rotation?: number;
}

export interface BackgroundConfig {
  elements: BackgroundElement[];
}

export interface WhiteLabelTheme {
  id: string;
  name: string;
  slug: string;
  navLogoUrl: string;
  emailLogoUrl: string | null;
  backgroundConfig: BackgroundConfig;
  brandColor: string | null;
  defaultHostedBy: string | null;
  defaultLocation: string | null;
  allowedEmails: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
