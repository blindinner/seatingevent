'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSession } from '@/lib/auth';
import { Header } from '@/components/layout/Header';

type OrganizerTier = 'free' | 'branded';

interface ProfileData {
  tier: OrganizerTier;
  tier_updated_at: string | null;
  email: string;
  verification_status: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/signin?redirect=/account/settings');
      return;
    }

    async function fetchProfile() {
      try {
        const session = await getSession();
        if (!session?.access_token) return;

        const res = await fetch('/api/account/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, authLoading, router]);

  const handleTierChange = async (newTier: OrganizerTier) => {
    if (!profile || profile.tier === newTier) return;

    setUpdating(true);
    setMessage(null);

    try {
      const session = await getSession();
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Please sign in again' });
        return;
      }

      const res = await fetch('/api/account/tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(prev => prev ? { ...prev, tier: newTier, tier_updated_at: new Date().toISOString() } : null);
        setMessage({
          type: 'success',
          text: newTier === 'branded'
            ? 'Upgraded to Branded! You now have access to Brand Settings.'
            : 'Switched to Free tier.'
        });

        // If upgraded to branded, redirect to brand settings after a moment
        if (newTier === 'branded' && data.themeId) {
          setTimeout(() => {
            router.push('/brand/settings');
          }, 1500);
        }
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update tier' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a09]">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a09] text-white">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/my-events"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to My Events
        </Link>

        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-white/50 mb-10">Manage your account and subscription</p>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-8 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <p className={`text-[14px] ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          </div>
        )}

        {/* Current Plan Section */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Your Plan</h2>
              <p className="text-white/50 text-sm mt-1">Choose the plan that fits your needs</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              profile?.tier === 'branded'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-white/10 text-white/70'
            }`}>
              {profile?.tier === 'branded' ? 'Branded' : 'Free'}
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free Tier */}
            <div
              className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer ${
                profile?.tier === 'free'
                  ? 'border-white/30 bg-white/[0.04]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20'
              }`}
              onClick={() => !updating && handleTierChange('free')}
            >
              {profile?.tier === 'free' && (
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              <h3 className="text-lg font-semibold mb-1">Free</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold">5%</span>
                <span className="text-white/50 text-sm">platform fee</span>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/70">Unlimited events</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/70">Seat map editor</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/70">Event dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-white/30 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-white/40">&quot;Powered by&quot; branding shown</span>
                </li>
              </ul>
            </div>

            {/* Branded Tier */}
            <div
              className={`relative rounded-xl p-5 border-2 transition-all cursor-pointer ${
                profile?.tier === 'branded'
                  ? 'border-amber-500/50 bg-amber-500/[0.08]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-amber-500/30'
              }`}
              onClick={() => !updating && handleTierChange('branded')}
            >
              {profile?.tier === 'branded' && (
                <div className="absolute top-3 right-3">
                  <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">Branded</h3>
                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-400 rounded-full">
                  PRO
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold">8%</span>
                <span className="text-white/50 text-sm">platform fee</span>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/70">Everything in Free</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/90">Your logo on event pages</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/90">Custom email sender name</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/90">Custom URL slug</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/90">No &quot;Powered by&quot; branding</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Updating indicator */}
          {updating && (
            <div className="flex items-center justify-center gap-2 mt-6 text-white/60">
              <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full" />
              <span className="text-sm">Updating your plan...</span>
            </div>
          )}
        </section>

        {/* Brand Settings Link (only for branded tier) */}
        {profile?.tier === 'branded' && (
          <section className="rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-amber-400">Brand Settings</h2>
                <p className="text-white/50 text-sm mt-1">
                  Customize your logo, colors, and email templates
                </p>
              </div>
              <Link
                href="/brand/settings"
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
                Configure Brand
              </Link>
            </div>
          </section>
        )}

        {/* Account Info */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-white/50">Email</span>
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-white/50">Verification Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                profile?.verification_status === 'verified'
                  ? 'bg-green-500/20 text-green-400'
                  : profile?.verification_status === 'pending_review'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-white/10 text-white/60'
              }`}>
                {profile?.verification_status || 'Unverified'}
              </span>
            </div>
            {profile?.tier_updated_at && (
              <div className="flex items-center justify-between py-2">
                <span className="text-white/50">Plan Updated</span>
                <span className="text-white/70 text-sm">
                  {new Date(profile.tier_updated_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
