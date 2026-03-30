'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SUPPORTED_CURRENCIES, getCurrency } from '@/lib/currency';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  isDarkMode?: boolean;
}

export function CurrencySelector({ value, onChange, isDarkMode = true }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  const currentCurrency = getCurrency(value);

  // Filter currencies based on search
  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Update dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Use viewport-relative coordinates for fixed positioning
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 240),
      });
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
          isDarkMode
            ? 'bg-white/[0.06] border-white/[0.06] hover:bg-white/[0.08]'
            : 'bg-black/[0.04] border-black/[0.06] hover:bg-black/[0.08]'
        }`}
      >
        <span className={`text-[14px] font-medium ${isDarkMode ? 'text-white/90' : 'text-zinc-900'}`}>{currentCurrency.code}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isDarkMode ? 'text-white/40' : 'text-zinc-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed z-[9999] rounded-xl shadow-2xl border overflow-hidden ${
            isDarkMode
              ? 'bg-[#1c1917] border-white/10'
              : 'bg-white border-zinc-200'
          }`}
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {/* Search input */}
          <div className={`p-2 border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-zinc-100'}`}>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency..."
              className={`w-full px-3 py-2 text-[13px] rounded-lg focus:outline-none ${
                isDarkMode
                  ? 'text-white/90 placeholder:text-white/30 bg-white/[0.06] border border-white/[0.06] focus:border-white/20'
                  : 'text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 focus:border-zinc-400'
              }`}
            />
          </div>

          {/* Currency list */}
          <div className="max-h-[280px] overflow-y-auto">
            {filteredCurrencies.map(currency => (
              <button
                key={currency.code}
                type="button"
                onClick={() => handleSelect(currency.code)}
                className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors ${
                  currency.code === value
                    ? isDarkMode ? 'bg-white/10 text-white' : 'bg-zinc-100 text-zinc-900'
                    : isDarkMode ? 'text-white/70 hover:bg-white/[0.06]' : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-10 text-[13px] font-medium ${isDarkMode ? 'text-white/90' : 'text-zinc-900'}`}>{currency.code}</span>
                  <span className={`text-[13px] ${isDarkMode ? 'text-white/50' : 'text-zinc-500'}`}>{currency.name}</span>
                </div>
                <span className={`text-[13px] ${isDarkMode ? 'text-white/40' : 'text-zinc-400'}`}>{currency.symbol}</span>
              </button>
            ))}
            {filteredCurrencies.length === 0 && (
              <div className={`px-4 py-6 text-center text-[13px] ${isDarkMode ? 'text-white/40' : 'text-zinc-400'}`}>
                No currencies found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
