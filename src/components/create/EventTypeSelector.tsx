'use client';

import type { EventType } from '@/types/event';

interface EventTypeSelectorProps {
  value: EventType;
  onChange: (value: EventType) => void;
}

export function EventTypeSelector({ value, onChange }: EventTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* General Admission Card */}
      <button
        type="button"
        onClick={() => onChange('ga')}
        className={`relative p-4 rounded-2xl text-left transition-all duration-200 ${
          value === 'ga'
            ? 'bg-white/[0.1] border border-white'
            : 'bg-white/[0.06] border border-transparent hover:bg-white/[0.08]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            value === 'ga' ? 'bg-white/20' : 'bg-white/[0.06]'
          }`}>
            <svg
              className={`w-5 h-5 transition-colors ${value === 'ga' ? 'text-white' : 'text-white/40'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-medium transition-colors ${
              value === 'ga' ? 'text-white' : 'text-white/70'
            }`}>
              General Admission
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">
              Tickets without assigned seats
            </p>
          </div>
        </div>
        {value === 'ga' && (
          <div className="absolute top-3 right-3">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </button>

      {/* Seated Event Card */}
      <button
        type="button"
        onClick={() => onChange('seated')}
        className={`relative p-4 rounded-2xl text-left transition-all duration-200 ${
          value === 'seated'
            ? 'bg-white/[0.1] border border-white'
            : 'bg-white/[0.06] border border-transparent hover:bg-white/[0.08]'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            value === 'seated' ? 'bg-white/20' : 'bg-white/[0.06]'
          }`}>
            <svg
              className={`w-5 h-5 transition-colors ${value === 'seated' ? 'text-white' : 'text-white/40'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-medium transition-colors ${
              value === 'seated' ? 'text-white' : 'text-white/70'
            }`}>
              Seated Event
            </p>
            <p className="text-[12px] text-white/40 mt-0.5">
              Let guests pick their seats
            </p>
          </div>
        </div>
        {value === 'seated' && (
          <div className="absolute top-3 right-3">
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
