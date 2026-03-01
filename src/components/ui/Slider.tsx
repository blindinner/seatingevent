'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = true, value, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {(label || showValue) && (
          <div className="flex justify-between items-center mb-1">
            {label && (
              <label htmlFor={id} className="text-sm font-medium text-gray-300">
                {label}
              </label>
            )}
            {showValue && (
              <span className="text-sm text-gray-400">{value}</span>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="range"
          id={id}
          value={value}
          className={cn(
            'w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:hover:bg-primary-400 [&::-webkit-slider-thumb]:cursor-pointer',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';
