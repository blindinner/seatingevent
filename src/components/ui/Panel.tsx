'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function Panel({
  children,
  className,
  title,
}: PanelProps) {
  return (
    <div
      className={cn(
        'bg-gray-900 border border-gray-800 rounded-lg overflow-hidden',
        className
      )}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <h3 className="text-sm font-medium text-gray-200">{title}</h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
