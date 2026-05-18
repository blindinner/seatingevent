'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HostVideoMessageProps {
  videoUrl: string;
  hostName: string;
  hostImageUrl?: string;
  variant: 'thumbnail' | 'avatar' | 'icon';
  isDarkMode: boolean;
  accentColor?: string;
}

// Video Modal Component
function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  hostName,
}: {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  hostName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />

      {/* Video Container */}
      <div
        className="relative w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 sm:top-0 sm:-right-12 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-3 text-center">
          <p className="text-white/60 text-sm">Message from</p>
          <p className="text-white font-semibold">{hostName}</p>
        </div>

        {/* Video */}
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            className="w-full aspect-[9/16] sm:aspect-video object-cover"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// Option A: Thumbnail Style
function ThumbnailVariant({
  videoUrl,
  hostName,
  isDarkMode,
  onPlay,
}: {
  videoUrl: string;
  hostName: string;
  isDarkMode: boolean;
  onPlay: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Preview on hover (desktop)
  useEffect(() => {
    if (videoRef.current) {
      if (isHovered) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovered]);

  return (
    <button
      onClick={onPlay}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        w-full mt-4 rounded-xl overflow-hidden transition-all duration-300
        ${isDarkMode ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-black/[0.03] hover:bg-black/[0.06]'}
        group relative
      `}
    >
      {/* Video Thumbnail / Preview */}
      <div className="relative aspect-video overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Overlay */}
        <div className={`
          absolute inset-0 flex items-center justify-center transition-opacity duration-300
          ${isHovered ? 'opacity-0' : 'opacity-100'}
          bg-gradient-to-t from-black/60 via-black/20 to-transparent
        `}>
          {/* Play Button */}
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Label */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm font-medium text-left">
            A message from {hostName}
          </p>
        </div>
      </div>
    </button>
  );
}

// Option B: Icon Style (replaces the host icon in the layout)
function IconVariant({
  videoUrl,
  isDarkMode,
  accentColor,
  onPlay,
}: {
  videoUrl: string;
  isDarkMode: boolean;
  accentColor?: string;
  onPlay: () => void;
}) {
  const ringColor = accentColor || (isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)');

  return (
    <button
      onClick={onPlay}
      className="relative group flex-shrink-0"
    >
      {/* Animated Ring */}
      <div
        className="absolute -inset-1 rounded-xl opacity-60"
        style={{
          background: `conic-gradient(from 0deg, ${ringColor}, transparent, ${ringColor})`,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -inset-1 rounded-xl"
        style={{
          background: `conic-gradient(from 180deg, transparent 60%, ${accentColor || (isDarkMode ? '#fff' : '#000')} 100%)`,
          animation: 'spin 4s linear infinite',
        }}
      />

      {/* Video Square - matches the host icon size, autoplays */}
      <div className={`relative w-16 h-16 rounded-xl overflow-hidden ${isDarkMode ? 'bg-white/[0.08]' : 'bg-black/[0.05]'}`}>
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Subtle play hint on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-200">
          <svg className="w-6 h-6 text-white drop-shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// Option C: Circular Avatar Style
function AvatarVariant({
  videoUrl,
  hostName,
  hostImageUrl,
  isDarkMode,
  accentColor,
  onPlay,
}: {
  videoUrl: string;
  hostName: string;
  hostImageUrl?: string;
  isDarkMode: boolean;
  accentColor?: string;
  onPlay: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Preview on hover (desktop)
  useEffect(() => {
    if (videoRef.current) {
      if (isHovered) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovered]);

  const ringColor = accentColor || (isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)');

  return (
    <div className="flex items-center gap-4 mt-4">
      {/* Circular Video Avatar */}
      <button
        onClick={onPlay}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative group flex-shrink-0"
      >
        {/* Animated Ring */}
        <div
          className="absolute -inset-1 rounded-full animate-pulse"
          style={{
            background: `conic-gradient(from 0deg, ${ringColor}, transparent, ${ringColor})`,
          }}
        />
        <div
          className="absolute -inset-1 rounded-full animate-spin"
          style={{
            background: `conic-gradient(from 180deg, transparent 70%, ${accentColor || '#fff'} 100%)`,
            animationDuration: '3s',
          }}
        />

        {/* Video Circle */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/20">
          <video
            ref={videoRef}
            src={videoUrl}
            muted
            loop
            playsInline
            poster={hostImageUrl}
            className="w-full h-full object-cover"
          />

          {/* Play Icon Overlay */}
          <div className={`
            absolute inset-0 flex items-center justify-center
            bg-black/40 transition-opacity duration-200
            ${isHovered ? 'opacity-0' : 'opacity-100'}
          `}>
            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>
          Tap to hear from
        </p>
        <p className={`text-[15px] font-medium truncate ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
          {hostName}
        </p>
      </div>
    </div>
  );
}

export function HostVideoMessage({
  videoUrl,
  hostName,
  hostImageUrl,
  variant,
  isDarkMode,
  accentColor,
}: HostVideoMessageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const renderVariant = () => {
    switch (variant) {
      case 'thumbnail':
        return (
          <ThumbnailVariant
            videoUrl={videoUrl}
            hostName={hostName}
            isDarkMode={isDarkMode}
            onPlay={() => setIsModalOpen(true)}
          />
        );
      case 'icon':
        return (
          <IconVariant
            videoUrl={videoUrl}
            isDarkMode={isDarkMode}
            accentColor={accentColor}
            onPlay={() => setIsModalOpen(true)}
          />
        );
      case 'avatar':
      default:
        return (
          <AvatarVariant
            videoUrl={videoUrl}
            hostName={hostName}
            hostImageUrl={hostImageUrl}
            isDarkMode={isDarkMode}
            accentColor={accentColor}
            onPlay={() => setIsModalOpen(true)}
          />
        );
    }
  };

  return (
    <>
      {renderVariant()}

      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoUrl={videoUrl}
        hostName={hostName}
      />
    </>
  );
}

// Demo component to toggle between variants
export function HostVideoMessageDemo({
  videoUrl,
  hostName,
  hostImageUrl,
  isDarkMode,
  accentColor,
}: Omit<HostVideoMessageProps, 'variant'>) {
  const [variant, setVariant] = useState<'thumbnail' | 'avatar'>('avatar');

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setVariant('avatar')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            variant === 'avatar'
              ? 'bg-white text-black'
              : isDarkMode
              ? 'bg-white/10 text-white/70 hover:bg-white/20'
              : 'bg-black/10 text-zinc-700 hover:bg-black/20'
          }`}
        >
          Avatar Style
        </button>
        <button
          onClick={() => setVariant('thumbnail')}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            variant === 'thumbnail'
              ? 'bg-white text-black'
              : isDarkMode
              ? 'bg-white/10 text-white/70 hover:bg-white/20'
              : 'bg-black/10 text-zinc-700 hover:bg-black/20'
          }`}
        >
          Thumbnail Style
        </button>
      </div>

      <HostVideoMessage
        videoUrl={videoUrl}
        hostName={hostName}
        hostImageUrl={hostImageUrl}
        variant={variant}
        isDarkMode={isDarkMode}
        accentColor={accentColor}
      />
    </div>
  );
}
