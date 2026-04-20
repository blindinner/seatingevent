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

export interface SocialLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  linkedin?: string;
  tiktok?: string;
  youtube?: string;
}

export interface EmbedSettings {
  primaryColor?: string;
  backgroundColor?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  buttonStyle?: 'rounded' | 'pill' | 'square';
  compact?: boolean;
  hideHeader?: boolean;
  hidePoweredBy?: boolean;
}

export interface WhiteLabelTheme {
  id: string;
  name: string;
  slug: string;
  navLogoUrl: string;
  logoDestinationUrl: string | null;
  emailLogoUrl: string | null;
  emailFromName: string | null;
  backgroundConfig: BackgroundConfig;
  brandColor: string | null;
  defaultHostedBy: string | null;
  defaultLocation: string | null;
  socialLinks: SocialLinks | null;
  embedSettings: EmbedSettings | null;
  allowedEmails: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
