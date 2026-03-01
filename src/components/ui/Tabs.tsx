'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex border-b border-gray-800', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-3 text-sm font-medium transition-colors relative',
            activeTab === tab.id
              ? 'text-white'
              : 'text-gray-400 hover:text-gray-200'
          )}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full',
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-800 text-gray-400'
                )}
              >
                {tab.count}
              </span>
            )}
          </span>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
          )}
        </button>
      ))}
    </div>
  );
}
