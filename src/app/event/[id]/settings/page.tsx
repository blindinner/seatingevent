'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseClient } from '@/lib/auth';

interface EmailSettings {
  subject?: string;
  greeting?: string;
  bodyText?: string;
  footerText?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [eventName, setEventName] = useState('');
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch event data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push(`/signin?redirect=/event/${eventId}/settings`);
      return;
    }

    async function fetchEvent() {
      try {
        const supabase = getSupabaseClient();
        const { data: event, error: fetchError } = await supabase
          .from('events')
          .select('name, user_id, email_settings')
          .eq('id', eventId)
          .single();

        if (fetchError || !event) {
          setError('Event not found');
          setLoading(false);
          return;
        }

        if (event.user_id !== user!.id) {
          router.push(`/event/${eventId}`);
          return;
        }

        setEventName(event.name);
        setEmailSettings(event.email_settings || {});
        setLoading(false);
      } catch (err) {
        setError('Failed to load event');
        setLoading(false);
      }
    }

    fetchEvent();
  }, [authLoading, user, eventId, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('events')
        .update({
          email_settings: Object.keys(emailSettings).length > 0 ? emailSettings : null,
        })
        .eq('id', eventId);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !eventName) {
    return (
      <div className="min-h-screen bg-[#0a0a09] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">{error}</p>
          <Link href="/" className="text-white hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a09]">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/event/${eventId}/dashboard`}
                className="text-white/50 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-white">Settings</h1>
                <p className="text-sm text-white/50">{eventName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Email Settings */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-[16px] font-medium text-white">Ticket Email Template</h2>
                <p className="text-[13px] text-white/50">Customize the confirmation email sent to attendees</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-[12px] text-white/40 bg-white/[0.04] px-3 py-2 rounded-lg">
              Use <code className="text-white/60">{'{{customerName}}'}</code> and <code className="text-white/60">{'{{eventName}}'}</code> as placeholders
            </p>

            <div>
              <label className="block text-[13px] text-white/60 mb-2">Email Subject</label>
              <input
                type="text"
                value={emailSettings.subject || ''}
                onChange={(e) => setEmailSettings({ ...emailSettings, subject: e.target.value })}
                placeholder="Your tickets for {{eventName}}"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] text-white/60 mb-2">Greeting</label>
              <input
                type="text"
                value={emailSettings.greeting || ''}
                onChange={(e) => setEmailSettings({ ...emailSettings, greeting: e.target.value })}
                placeholder="You're going!"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] text-white/60 mb-2">Body Text</label>
              <input
                type="text"
                value={emailSettings.bodyText || ''}
                onChange={(e) => setEmailSettings({ ...emailSettings, bodyText: e.target.value })}
                placeholder="Your tickets are confirmed"
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13px] text-white/60 mb-2">Footer Text</label>
              <textarea
                value={emailSettings.footerText || ''}
                onChange={(e) => setEmailSettings({ ...emailSettings, footerText: e.target.value })}
                placeholder="Questions? Reply to this email or contact the event organizer."
                rows={2}
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/10 rounded-xl text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            {(emailSettings.subject || emailSettings.greeting || emailSettings.bodyText || emailSettings.footerText) && (
              <button
                type="button"
                onClick={() => setEmailSettings({})}
                className="text-[13px] text-white/40 hover:text-white/60 transition-colors"
              >
                Reset to defaults
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 text-[14px] font-semibold rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-[13px] text-green-400 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
