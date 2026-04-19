'use client';

import { useState } from 'react';
import { InlineTicketWidget, TicketTier } from '@/components/embed/InlineTicketWidget';

// Demo ticket tiers (matching the screenshot)
const demoTiers: TicketTier[] = [
  {
    id: 'regular',
    name: 'כרטיס להקרנה',
    price: 40,
    available: -1,
  },
  {
    id: 'digital',
    name: 'הנחת דיגיטל',
    description: 'הנחה לחברי מועדון דיגיטל',
    price: 30,
    available: -1,
  },
];

// Theme variations to demonstrate
const themePresets = {
  light: {
    name: 'Light (Jaffa Cinema)',
    theme: {
      primaryColor: '#dc2626',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      borderRadius: '12px',
    },
    siteBg: '#f5f0e8',
  },
  dark: {
    name: 'Dark Cinema',
    theme: {
      primaryColor: '#ef4444',
      backgroundColor: '#18181b',
      textColor: '#ffffff',
      borderRadius: '16px',
    },
    siteBg: '#09090b',
  },
  elegant: {
    name: 'Elegant Theater',
    theme: {
      primaryColor: '#b91c1c',
      backgroundColor: '#1c1917',
      textColor: '#ffffff',
      borderRadius: '8px',
    },
    siteBg: '#0c0a09',
  },
  modern: {
    name: 'Modern',
    theme: {
      primaryColor: '#6366f1',
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      borderRadius: '20px',
    },
    siteBg: '#f8fafc',
  },
};

export default function CinemaEmbedDemoPage() {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof themePresets>('light');
  const preset = themePresets[selectedPreset];

  const handleCheckout = (selection: { tierId: string; quantity: number; price: number }[], promoCode?: string) => {
    console.log('Checkout:', { selection, promoCode });
    alert(`סה"כ: ₪${selection.reduce((sum, s) => sum + s.quantity * s.price, 0)}\n\nזה היה מעביר אותך לתשלום`);
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: preset.siteBg }}
    >
      {/* Demo Controls */}
      <div className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-white text-lg font-semibold">Cinema Widget Demo</h1>
              <p className="text-zinc-400 text-sm">Simulating Jaffa Cinema style</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-sm">Theme:</span>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value as keyof typeof themePresets)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700"
              >
                {Object.entries(themePresets).map(([key, { name }]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Cinema Website */}
      <div className="max-w-5xl mx-auto">
        {/* Fake Cinema Header */}
        <header
          className="py-6 px-6 text-center border-b"
          style={{
            backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#fff' : '#1a1a1a',
            borderColor: selectedPreset === 'light' || selectedPreset === 'modern' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="text-3xl font-bold mb-4"
            style={{
              fontFamily: 'serif',
              color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#1a1a1a' : '#fff',
            }}
          >
            קולנוע יפו
          </div>
          <nav className="flex items-center justify-center gap-6 text-sm" dir="rtl">
            {['לוח הקרנות', 'תפריט', 'אודות', 'צרו קשר'].map((item) => (
              <a
                key={item}
                href="#"
                className="hover:opacity-70 transition-opacity"
                style={{
                  color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#666' : 'rgba(255,255,255,0.7)',
                }}
              >
                {item}
              </a>
            ))}
          </nav>
        </header>

        {/* Page Content */}
        <div className="py-12 px-6">
          {/* Accessibility note placeholder */}
          <div className="text-center mb-6">
            <span
              className="inline-flex items-center gap-2 text-sm"
              style={{
                color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#666' : 'rgba(255,255,255,0.6)',
              }}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">♿</span>
              עזרי נגישות
            </span>
          </div>

          {/* Widget Container */}
          <div className="max-w-xl mx-auto">
            <InlineTicketWidget
              eventId="jaffa-cinema-demo"
              eventName="חשמלית ושמה תשוקה"
              venueName="אולם 2"
              date="2026-04-09"
              time="19:00"
              ticketTiers={demoTiers}
              currency="ILS"
              showPromoCode={true}
              showMemberLogin={true}
              memberLoginUrl="#"
              theme={preset.theme}
              language="he"
              onCheckout={handleCheckout}
            />
          </div>

          {/* Comparison Section */}
          <div className="mt-16 max-w-2xl mx-auto">
            <h2
              className="text-xl font-bold text-center mb-8"
              style={{
                color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#1a1a1a' : '#fff',
              }}
            >
              Before vs After
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Before - Competitor */}
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#fff' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedPreset === 'light' || selectedPreset === 'modern' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <div
                  className="text-sm font-medium mb-3 text-center"
                  style={{
                    color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#999' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  Competitor (Smarticket)
                </div>
                <div
                  className="aspect-[4/3] rounded-lg flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#f5f5f5' : 'rgba(255,255,255,0.05)',
                    color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#999' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  <ul className="space-y-1 text-center">
                    <li>✗ Dated design</li>
                    <li>✗ Basic inputs</li>
                    <li>✗ No visual feedback</li>
                    <li>✗ Generic styling</li>
                  </ul>
                </div>
              </div>

              {/* After - Your Widget */}
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#fff' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${selectedPreset === 'light' || selectedPreset === 'modern' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <div
                  className="text-sm font-medium mb-3 text-center"
                  style={{ color: '#10b981' }}
                >
                  Your Widget (Seated)
                </div>
                <div
                  className="aspect-[4/3] rounded-lg flex items-center justify-center text-sm"
                  style={{
                    backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#f0fdf4' : 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                  }}
                >
                  <ul className="space-y-1 text-center">
                    <li>✓ Modern, clean design</li>
                    <li>✓ Visual selection feedback</li>
                    <li>✓ Smooth animations</li>
                    <li>✓ Customizable theming</li>
                    <li>✓ Native RTL support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fake Footer */}
        <footer
          className="py-12 px-6 border-t"
          dir="rtl"
          style={{
            backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#fff' : '#1a1a1a',
            borderColor: selectedPreset === 'light' || selectedPreset === 'modern' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-right">
            <div>
              <h3
                className="font-bold mb-3"
                style={{
                  color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#1a1a1a' : '#fff',
                }}
              >
                שעות פתיחה.
              </h3>
              <p
                className="text-sm"
                style={{
                  color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#666' : 'rgba(255,255,255,0.6)',
                }}
              >
                ימים א-ה<br />
                00:00 - 18:00
              </p>
            </div>
            <div>
              <h3
                className="font-bold mb-3"
                style={{
                  color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#1a1a1a' : '#fff',
                }}
              >
                צרו קשר.
              </h3>
              <p
                className="text-sm"
                style={{
                  color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#666' : 'rgba(255,255,255,0.6)',
                }}
              >
                טל. 054-8708099<br />
                info@jaffacinema.com
              </p>
            </div>
            <div>
              <h3
                className="font-bold mb-3"
                style={{
                  color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#1a1a1a' : '#fff',
                }}
              >
                קבלו מייל פעם ב.
              </h3>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <input
                  type="email"
                  placeholder="אימייל"
                  className="px-3 py-2 text-sm rounded border"
                  style={{
                    backgroundColor: selectedPreset === 'light' || selectedPreset === 'modern' ? '#f5f5f5' : 'rgba(255,255,255,0.1)',
                    borderColor: selectedPreset === 'light' || selectedPreset === 'modern' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                    color: selectedPreset === 'light' || selectedPreset === 'modern' ? '#1a1a1a' : '#fff',
                  }}
                />
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
