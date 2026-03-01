'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRightIcon } from './toolIcons';

interface ToolButtonProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  hasSubmenu?: boolean;
  onClick?: () => void;
  onSubmenuOpen?: () => void;
  submenuContent?: ReactNode;
  disabled?: boolean;
}

export function ToolButton({
  icon,
  label,
  shortcut,
  isActive = false,
  hasSubmenu = false,
  onClick,
  onSubmenuOpen,
  submenuContent,
  disabled = false,
}: ToolButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only show tooltip on hover (not submenu)
  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Handle click - toggle submenu or trigger onClick
  const handleClick = () => {
    if (hasSubmenu) {
      setShowSubmenu(!showSubmenu);
      if (!showSubmenu) {
        onSubmenuOpen?.();
      }
    } else {
      onClick?.();
    }
  };

  // Close submenu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSubmenu(false);
      }
    };

    if (showSubmenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSubmenu]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {icon}
        {hasSubmenu && (
          <span className="absolute bottom-1 right-1">
            <ChevronRightIcon className="w-2 h-2" />
          </span>
        )}
      </button>

      {/* Tooltip - only show when submenu is closed */}
      {showTooltip && !showSubmenu && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap flex items-center gap-2">
            <span>{label}</span>
            {shortcut && (
              <span className="text-gray-400 bg-gray-700 px-1 rounded text-[10px]">
                {shortcut}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Submenu - only opens on click */}
      {hasSubmenu && showSubmenu && submenuContent && (
        <div
          className="absolute left-full ml-1 top-0 z-50"
          onClick={() => setShowSubmenu(false)}
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
            {submenuContent}
          </div>
        </div>
      )}
    </div>
  );
}

interface SubmenuItemProps {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function SubmenuItem({
  icon,
  label,
  shortcut,
  isActive = false,
  onClick,
}: SubmenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 flex items-center gap-3 text-sm transition-colors',
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      )}
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-gray-500 text-xs">{shortcut}</span>
      )}
    </button>
  );
}
