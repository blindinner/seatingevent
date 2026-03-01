'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ColorPickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ className, label, value, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={ref}
            type="color"
            id={id}
            value={value}
            className={cn(
              'w-10 h-10 rounded-lg cursor-pointer border border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-500',
              className
            )}
            {...props}
          />
          <span className="text-sm text-gray-400 font-mono uppercase">
            {value}
          </span>
        </div>
      </div>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';
