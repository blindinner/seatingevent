'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { PublicEvent } from '@/types/event';

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: PublicEvent;
}

type EmbedType = 'iframe' | 'button';

interface EmbedSettings {
  primaryColor: string;
  backgroundColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  buttonStyle: 'rounded' | 'pill' | 'square';
  padding: 'sm' | 'md' | 'lg';
  language: 'en' | 'he';
  compact: boolean;
  hideHeader: boolean;
  hidePoweredBy: boolean;
  width: string;
  height: string;
}

const presets: Record<string, Partial<EmbedSettings>> = {
  light: {
    backgroundColor: '#ffffff',
    primaryColor: '#1a1a1a',
    borderRadius: 'lg',
    buttonStyle: 'rounded',
    compact: false,
    hideHeader: false,
  },
  dark: {
    backgroundColor: '#0a0a0a',
    primaryColor: '#ffffff',
    borderRadius: 'lg',
    buttonStyle: 'rounded',
    compact: false,
    hideHeader: false,
  },
  brand: {
    backgroundColor: '#0a0a0a',
    primaryColor: '#f59e0b',
    borderRadius: 'xl',
    buttonStyle: 'pill',
    compact: false,
    hideHeader: false,
  },
  minimal: {
    backgroundColor: '#ffffff',
    primaryColor: '#000000',
    borderRadius: 'sm',
    buttonStyle: 'square',
    compact: true,
    hideHeader: true,
    hidePoweredBy: true,
  },
};

export function EmbedModal({ isOpen, onClose, event }: EmbedModalProps) {
  const [mounted, setMounted] = useState(false);
  const [embedType, setEmbedType] = useState<EmbedType>('iframe');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'customize' | 'code'>('customize');

  // Settings state
  const [settings, setSettings] = useState<EmbedSettings>({
    primaryColor: event.accentColor || '#10b981',
    backgroundColor: '#ffffff',
    borderRadius: 'lg',
    buttonStyle: 'rounded',
    padding: 'md',
    language: event.language || 'en',
    compact: false,
    hideHeader: false,
    hidePoweredBy: false,
    width: '100%',
    height: '550',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Build embed URL with all parameters
  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (settings.backgroundColor !== '#ffffff') {
      params.set('bgColor', settings.backgroundColor.replace('#', ''));
    }
    if (settings.primaryColor !== '#10b981') {
      params.set('primaryColor', settings.primaryColor.replace('#', ''));
    }
    if (settings.borderRadius !== 'lg') {
      params.set('borderRadius', settings.borderRadius);
    }
    if (settings.buttonStyle !== 'rounded') {
      params.set('buttonStyle', settings.buttonStyle);
    }
    if (settings.padding !== 'md') {
      params.set('padding', settings.padding);
    }
    if (settings.language !== 'en') {
      params.set('lang', settings.language);
    }
    if (settings.compact) {
      params.set('compact', 'true');
    }
    if (settings.hideHeader) {
      params.set('hideHeader', 'true');
    }
    if (settings.hidePoweredBy) {
      params.set('hidePoweredBy', 'true');
    }

    const queryString = params.toString();
    return `${baseUrl}/embed/${event.id}${queryString ? `?${queryString}` : ''}`;
  }, [baseUrl, event.id, settings]);

  // Generate embed code
  const getEmbedCode = (): string => {
    if (embedType === 'button') {
      return `<!-- Seated Buy Tickets Button -->
<a href="${baseUrl}/event/${event.shortId || event.id}"
   target="_blank"
   style="display: inline-block; padding: 12px 24px; background: ${settings.primaryColor}; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-family: system-ui, sans-serif;">
  Buy Tickets
</a>`;
    }

    return `<!-- Seated Ticket Widget -->
<iframe
  src="${embedUrl}"
  width="${settings.width}"
  height="${settings.height}"
  frameborder="0"
  style="border: none; border-radius: 12px; max-width: 100%;"
  allow="payment"
></iframe>`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const applyPreset = (presetName: string) => {
    const preset = presets[presetName];
    if (preset) {
      setSettings(prev => ({ ...prev, ...preset }));
    }
  };

  const updateSetting = <K extends keyof EmbedSettings>(key: K, value: EmbedSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="absolute inset-4 md:inset-6 lg:inset-8 bg-zinc-900 rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold text-white">Embed Widget</h2>
                <p className="text-sm text-white/50 mt-0.5">{event.name}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Left - Configuration */}
              <div className="lg:w-[340px] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto">
                {/* Tabs */}
                <div className="flex border-b border-white/10">
                  <button
                    onClick={() => setActiveTab('customize')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'customize' ? 'text-white bg-white/5' : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    Customize
                  </button>
                  <button
                    onClick={() => setActiveTab('code')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'code' ? 'text-white bg-white/5' : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    Get Code
                  </button>
                </div>

                {activeTab === 'customize' ? (
                  <div className="p-5 space-y-6">
                    {/* Presets */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                        Quick Presets
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.keys(presets).map((preset) => (
                          <button
                            key={preset}
                            onClick={() => applyPreset(preset)}
                            className="py-2 px-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors capitalize"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-3 block">
                        Colors
                      </label>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-white/60 mb-1 block">Background</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.backgroundColor}
                              onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white/10"
                            />
                            <input
                              type="text"
                              value={settings.backgroundColor}
                              onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-white/60 mb-1 block">Button / Accent</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={settings.primaryColor}
                              onChange={(e) => updateSetting('primaryColor', e.target.value)}
                              className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white/10"
                            />
                            <input
                              type="text"
                              value={settings.primaryColor}
                              onChange={(e) => updateSetting('primaryColor', e.target.value)}
                              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Style Options */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-3 block">
                        Style
                      </label>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-white/60 mb-1 block">Corners</label>
                          <div className="flex gap-1">
                            {(['none', 'sm', 'md', 'lg', 'xl'] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => updateSetting('borderRadius', r)}
                                className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                                  settings.borderRadius === r
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                              >
                                {r === 'none' ? '▢' : r.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-white/60 mb-1 block">Button Style</label>
                          <div className="flex gap-1">
                            {(['rounded', 'pill', 'square'] as const).map((s) => (
                              <button
                                key={s}
                                onClick={() => updateSetting('buttonStyle', s)}
                                className={`flex-1 py-1.5 text-xs rounded transition-colors capitalize ${
                                  settings.buttonStyle === s
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-white/60 mb-1 block">Spacing</label>
                          <div className="flex gap-1">
                            {(['sm', 'md', 'lg'] as const).map((p) => (
                              <button
                                key={p}
                                onClick={() => updateSetting('padding', p)}
                                className={`flex-1 py-1.5 text-xs rounded transition-colors ${
                                  settings.padding === p
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                              >
                                {p === 'sm' ? 'Compact' : p === 'md' ? 'Normal' : 'Spacious'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Options */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-3 block">
                        Options
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.compact}
                            onChange={(e) => {
                              const isCompact = e.target.checked;
                              setSettings(prev => ({
                                ...prev,
                                compact: isCompact,
                                height: isCompact ? '350' : '550',
                              }));
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-white/70">Compact mode</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.hideHeader}
                            onChange={(e) => updateSetting('hideHeader', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-white/70">Hide event header</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.hidePoweredBy}
                            onChange={(e) => updateSetting('hidePoweredBy', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                          />
                          <span className="text-sm text-white/70">Hide &quot;Powered by&quot;</span>
                        </label>
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                        Language
                      </label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateSetting('language', 'en')}
                          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                            settings.language === 'en'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          English
                        </button>
                        <button
                          onClick={() => updateSetting('language', 'he')}
                          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                            settings.language === 'he'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          עברית (RTL)
                        </button>
                      </div>
                    </div>

                    {/* Size */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                        Dimensions
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-white/40 mb-1 block">Width</label>
                          <input
                            type="text"
                            value={settings.width}
                            onChange={(e) => updateSetting('width', e.target.value)}
                            placeholder="100% or 400px"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-white/40 mb-1 block">Height</label>
                          <input
                            type="text"
                            value={settings.height}
                            onChange={(e) => updateSetting('height', e.target.value)}
                            placeholder="550"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 space-y-4">
                    {/* Embed Type */}
                    <div>
                      <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">
                        Embed Type
                      </label>
                      <div className="space-y-2">
                        <button
                          onClick={() => setEmbedType('iframe')}
                          className={`w-full text-left p-3 rounded-xl transition-all ${
                            embedType === 'iframe'
                              ? 'bg-white/10 border-2 border-emerald-500/50'
                              : 'bg-white/5 border-2 border-transparent hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-sm font-medium text-white">iFrame Embed</div>
                          <div className="text-xs text-white/50 mt-0.5">Full widget with all customizations</div>
                        </button>
                        <button
                          onClick={() => setEmbedType('button')}
                          className={`w-full text-left p-3 rounded-xl transition-all ${
                            embedType === 'button'
                              ? 'bg-white/10 border-2 border-emerald-500/50'
                              : 'bg-white/5 border-2 border-transparent hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-sm font-medium text-white">Button Link</div>
                          <div className="text-xs text-white/50 mt-0.5">Simple button that opens event page</div>
                        </button>
                      </div>
                    </div>

                    {/* Code */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-white/50 uppercase tracking-wider">HTML Code</label>
                        <button
                          onClick={handleCopy}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            copied
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {copied ? (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="bg-black/50 rounded-xl p-4 overflow-auto text-xs font-mono text-emerald-400 whitespace-pre-wrap max-h-64">
                        {getEmbedCode()}
                      </pre>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-white/5 rounded-xl">
                      <h4 className="text-sm font-medium text-white mb-2">How to use</h4>
                      <ol className="text-xs text-white/60 space-y-1 list-decimal list-inside">
                        <li>Copy the code above</li>
                        <li>Paste it into your website HTML</li>
                        <li>The widget will display your tickets</li>
                      </ol>
                    </div>

                    {/* External ID Integration */}
                    {event.whiteLabelTheme && (
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <h4 className="text-sm font-medium text-amber-300 mb-2">Template Integration</h4>
                        <p className="text-xs text-amber-200/70 mb-2">
                          For CMS templates, use this URL pattern:
                        </p>
                        <code className="block text-xs text-amber-400 font-mono bg-black/30 p-2 rounded break-all">
                          {baseUrl}/embed/match/{event.whiteLabelTheme.slug}/{'{page_id}'}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right - Live Preview */}
              <div className="flex-1 flex flex-col overflow-hidden bg-zinc-800">
                <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs text-white/50 uppercase tracking-wider">Live Preview</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Only the widget appears on your site
                    </span>
                  </div>
                </div>
                {/* Checkered background to indicate transparency */}
                <div
                  className="flex-1 p-6 overflow-auto flex items-start justify-center"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #1a1a1a 25%, transparent 25%),
                      linear-gradient(-45deg, #1a1a1a 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #1a1a1a 75%),
                      linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    backgroundColor: '#252525',
                  }}
                >
                  {/* Website Mockup Frame */}
                  <div className="w-full max-w-3xl">
                    {/* Browser Chrome */}
                    <div className="bg-zinc-700 rounded-t-lg px-3 py-2 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <div className="flex-1 bg-zinc-600 rounded px-3 py-1 text-xs text-white/50 font-mono truncate">
                        yourwebsite.com/events/tickets
                      </div>
                    </div>

                    {/* Website Content */}
                    <div className="bg-white rounded-b-lg overflow-hidden">
                      {/* Fake website header */}
                      <div className="bg-zinc-100 px-6 py-4 border-b border-zinc-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-300 rounded" />
                            <div className="w-24 h-3 bg-zinc-300 rounded" />
                          </div>
                          <div className="flex gap-4">
                            <div className="w-12 h-2 bg-zinc-300 rounded" />
                            <div className="w-12 h-2 bg-zinc-300 rounded" />
                            <div className="w-12 h-2 bg-zinc-300 rounded" />
                          </div>
                        </div>
                      </div>

                      {/* Website content area */}
                      <div className="p-6">
                        {/* Fake heading */}
                        <div className="mb-4">
                          <div className="w-48 h-4 bg-zinc-200 rounded mb-2" />
                          <div className="w-72 h-2 bg-zinc-100 rounded" />
                        </div>

                        {/* The actual embed preview - highlighted */}
                        <div className="relative">
                          {/* Indicator arrow and label */}
                          <div className="absolute -top-8 left-0 flex items-center gap-2 text-emerald-500">
                            <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span className="text-xs font-medium">Your embedded widget</span>
                          </div>

                          {/* Embed container with highlight border */}
                          <div
                            className="relative rounded-xl overflow-hidden ring-2 ring-emerald-500 ring-offset-2 ring-offset-white"
                            style={{
                              width: settings.width === '100%' ? '100%' : settings.width,
                              maxWidth: '100%',
                              backgroundColor: settings.backgroundColor,
                            }}
                          >
                            {embedType === 'button' ? (
                              <div className="p-8 bg-zinc-50 flex items-center justify-center">
                                <a
                                  href="#"
                                  onClick={(e) => e.preventDefault()}
                                  style={{
                                    display: 'inline-block',
                                    padding: '12px 24px',
                                    background: settings.primaryColor,
                                    color: '#fff',
                                    textDecoration: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    fontFamily: 'system-ui, sans-serif',
                                  }}
                                >
                                  Buy Tickets
                                </a>
                              </div>
                            ) : (
                              <iframe
                                key={embedUrl}
                                src={embedUrl}
                                width="100%"
                                height={settings.height}
                                frameBorder="0"
                                style={{ border: 'none', display: 'block' }}
                              />
                            )}
                          </div>
                        </div>

                        {/* More fake content below */}
                        <div className="mt-6 space-y-2">
                          <div className="w-full h-2 bg-zinc-100 rounded" />
                          <div className="w-3/4 h-2 bg-zinc-100 rounded" />
                          <div className="w-1/2 h-2 bg-zinc-100 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
