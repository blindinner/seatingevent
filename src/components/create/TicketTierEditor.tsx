'use client';

import { nanoid } from 'nanoid';
import type { TicketTier, EventLanguage } from '@/types/event';
import { TicketTierCard } from './TicketTierCard';
import { CurrencySelector } from './CurrencySelector';
import { formatCurrencyRange } from '@/lib/currency';
import { useTranslation } from '@/lib/translations';

interface TicketTierEditorProps {
  tiers: TicketTier[];
  currency: string;
  onCurrencyChange: (currency: string) => void;
  onChange: (tiers: TicketTier[]) => void;
  isDarkMode?: boolean;
  language?: EventLanguage;
}

export function TicketTierEditor({ tiers, currency, onCurrencyChange, onChange, isDarkMode = true, language = 'en' }: TicketTierEditorProps) {
  const { t } = useTranslation(language);
  const handleTierChange = (index: number, updatedTier: TicketTier) => {
    const newTiers = [...tiers];
    newTiers[index] = updatedTier;
    onChange(newTiers);
  };

  const handleDeleteTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    onChange(newTiers);
  };

  const handleAddTier = () => {
    const newTier: TicketTier = {
      id: nanoid(),
      name: '',
      price: 0,
      quantity: -1,
    };
    onChange([...tiers, newTier]);
  };

  // Calculate summary
  const totalCapacity = tiers.reduce((sum, tier) => {
    if (tier.quantity === -1) return -1; // If any is unlimited, total is unlimited
    if (sum === -1) return -1;
    return sum + tier.quantity;
  }, 0);

  const priceRange = tiers.length > 0
    ? {
        min: Math.min(...tiers.map(t => t.price)),
        max: Math.max(...tiers.map(t => t.price)),
      }
    : { min: 0, max: 0 };

  const priceDisplay = formatCurrencyRange(priceRange.min, priceRange.max, currency);

  return (
    <div className={`rounded-2xl backdrop-blur-sm border border-transparent overflow-hidden ${isDarkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3.5 border-b ${isDarkMode ? 'border-white/[0.04]' : 'border-black/[0.04]'}`}>
        <div className="flex items-center gap-3">
          <svg className={`w-5 h-5 ${isDarkMode ? 'text-white/30' : 'text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
          <div>
            <span className={`text-[14px] ${isDarkMode ? 'text-white/70' : 'text-zinc-700'}`}>{t('ticketTiers')}</span>
            <span className={`text-[12px] ${language === 'he' ? 'mr-2' : 'ml-2'} ${isDarkMode ? 'text-white/40' : 'text-zinc-500'}`}>
              {tiers.length} {tiers.length !== 1 ? t('tiers') : t('tier')} · {priceDisplay}
            </span>
          </div>
        </div>
        <CurrencySelector value={currency} onChange={onCurrencyChange} isDarkMode={isDarkMode} />
      </div>

      {/* Tier List */}
      <div className="p-3 space-y-2">
        {tiers.map((tier, index) => (
          <TicketTierCard
            key={tier.id}
            tier={tier}
            currency={currency}
            onChange={(updated) => handleTierChange(index, updated)}
            onDelete={() => handleDeleteTier(index)}
            canDelete={tiers.length > 1}
            defaultExpanded={index === 0}
            isDarkMode={isDarkMode}
            language={language}
          />
        ))}

        {/* Add Tier Button */}
        <button
          type="button"
          onClick={handleAddTier}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed text-[13px] transition-colors ${
            isDarkMode
              ? 'border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
              : 'border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('addTicketTier')}
        </button>
      </div>
    </div>
  );
}
