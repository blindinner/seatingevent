'use client';

import type { WhiteLabelTheme, BackgroundElement } from '@/types/whiteLabel';

interface BackgroundImageProps {
  element: BackgroundElement;
}

function BackgroundImage({ element }: BackgroundImageProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    ...element.position,
    width: element.width || 'auto',
    height: element.height || 'auto',
    opacity: element.opacity ?? 0.1,
    zIndex: element.zIndex ?? 0,
    filter: element.blur ? `blur(${element.blur}px)` : undefined,
  };

  return (
    <img
      src={element.imageUrl}
      alt=""
      style={style}
      className="pointer-events-none select-none"
    />
  );
}

interface BackgroundTextProps {
  element: BackgroundElement;
}

function BackgroundText({ element }: BackgroundTextProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    ...element.position,
    fontSize: element.fontSize || '14px',
    fontWeight: element.fontWeight || 'normal',
    color: element.color || 'rgba(255,255,255,0.1)',
    opacity: element.opacity ?? 0.1,
    zIndex: element.zIndex ?? 0,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    whiteSpace: 'nowrap',
  };

  return (
    <span style={style} className="pointer-events-none select-none">
      {element.text}
    </span>
  );
}

function DefaultAmbientGlow() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px] bg-white/[0.03]" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-[100px] bg-white/[0.02]" />
    </div>
  );
}

interface BackgroundDecorationsProps {
  theme?: WhiteLabelTheme;
}

export function BackgroundDecorations({ theme }: BackgroundDecorationsProps) {
  // If no theme or no elements, render default ambient glow
  if (!theme?.backgroundConfig?.elements?.length) {
    return <DefaultAmbientGlow />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {theme.backgroundConfig.elements.map((element, idx) => {
        if (element.type === 'image' && element.imageUrl) {
          return <BackgroundImage key={idx} element={element} />;
        }
        if (element.type === 'text' && element.text) {
          return <BackgroundText key={idx} element={element} />;
        }
        return null;
      })}
    </div>
  );
}
