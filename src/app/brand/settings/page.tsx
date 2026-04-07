'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSession } from '@/lib/auth';
import { SocialLinks as SocialLinksComponent } from '@/components/ui/SocialLinks';
import type { WhiteLabelTheme, SocialLinks } from '@/types/whiteLabel';

export default function BrandSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [themes, setThemes] = useState<WhiteLabelTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<WhiteLabelTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [navLogoUrl, setNavLogoUrl] = useState('');
  const [logoDestinationUrl, setLogoDestinationUrl] = useState('');
  const [emailLogoUrl, setEmailLogoUrl] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [brandColor, setBrandColor] = useState('');
  const [defaultHostedBy, setDefaultHostedBy] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  // Track if initial load is complete to prevent auto-save on mount
  const [isInitialized, setIsInitialized] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Upload state
  const [uploadingNav, setUploadingNav] = useState(false);
  const [uploadingEmail, setUploadingEmail] = useState(false);
  const navLogoInputRef = useRef<HTMLInputElement>(null);
  const emailLogoInputRef = useRef<HTMLInputElement>(null);

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

  // Fetch available themes
  useEffect(() => {
    if (authLoading) return;
    if (!user?.email) {
      router.push('/signin');
      return;
    }

    async function fetchThemes() {
      try {
        const res = await fetch(`/api/white-label/themes?email=${encodeURIComponent(user!.email!)}`);
        if (res.ok) {
          const data = await res.json();
          setThemes(data.themes || []);
          if (data.themes?.length > 0) {
            selectTheme(data.themes[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch themes:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchThemes();
  }, [user, authLoading, router]);

  const selectTheme = (theme: WhiteLabelTheme) => {
    setIsInitialized(false); // Prevent auto-save during theme switch
    setSelectedTheme(theme);
    setNavLogoUrl(theme.navLogoUrl || '');
    setLogoDestinationUrl(theme.logoDestinationUrl || '');
    setEmailLogoUrl(theme.emailLogoUrl || '');
    setEmailFromName(theme.emailFromName || '');
    setBrandColor(theme.brandColor || '');
    setDefaultHostedBy(theme.defaultHostedBy || '');
    setDefaultLocation(theme.defaultLocation || '');
    setSocialLinks(theme.socialLinks || {});
    // Allow auto-save after state settles
    setTimeout(() => setIsInitialized(true), 100);
  };

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!selectedTheme) return;

    setAutoSaveStatus('saving');

    try {
      const session = await getSession();
      if (!session?.access_token) {
        setAutoSaveStatus('error');
        return;
      }

      const res = await fetch(`/api/white-label/themes/${selectedTheme.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          navLogoUrl,
          logoDestinationUrl: logoDestinationUrl || null,
          emailLogoUrl: emailLogoUrl || null,
          emailFromName: emailFromName || null,
          brandColor: brandColor || null,
          defaultHostedBy: defaultHostedBy || null,
          defaultLocation: defaultLocation || null,
          socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
        }),
      });

      if (res.ok) {
        setAutoSaveStatus('saved');
        const data = await res.json();
        if (data.theme) {
          setThemes(prev => prev.map(t =>
            t.id === selectedTheme.id ? { ...t, ...data.theme } : t
          ));
        }
        // Clear "saved" status after 2 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('error');
      }
    } catch {
      setAutoSaveStatus('error');
    }
  }, [selectedTheme, navLogoUrl, logoDestinationUrl, emailLogoUrl, emailFromName, brandColor, defaultHostedBy, defaultLocation, socialLinks]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!isInitialized || !selectedTheme) return;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (debounce 1 second)
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isInitialized, selectedTheme, navLogoUrl, logoDestinationUrl, emailLogoUrl, emailFromName, brandColor, defaultHostedBy, defaultLocation, socialLinks, performAutoSave]);

  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value || undefined,
    }));
  };

  const handleLogoUpload = async (file: File, type: 'nav' | 'email') => {
    if (!selectedTheme) return;

    const setUploading = type === 'nav' ? setUploadingNav : setUploadingEmail;
    const setUrl = type === 'nav' ? setNavLogoUrl : setEmailLogoUrl;

    setUploading(true);
    setMessage(null);

    try {
      // Get access token for API auth
      const session = await getSession();
      if (!session?.access_token) {
        setMessage({ type: 'error', text: 'Please sign in again' });
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('themeId', selectedTheme.id);
      formData.append('type', type);

      const res = await fetch('/api/white-label/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUrl(data.url);

        // Immediately save the logo URL to the database
        const updateBody = type === 'nav'
          ? { navLogoUrl: data.url }
          : { emailLogoUrl: data.url };

        const saveRes = await fetch(`/api/white-label/themes/${selectedTheme.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(updateBody),
        });

        if (saveRes.ok) {
          const saveData = await saveRes.json();
          // Update the themes array with the saved data
          if (saveData.theme) {
            setThemes(prev => prev.map(t =>
              t.id === selectedTheme.id ? { ...t, ...saveData.theme } : t
            ));
          }
          setMessage({ type: 'success', text: `${type === 'nav' ? 'Navigation' : 'Email'} logo saved!` });
        } else {
          setMessage({ type: 'success', text: `Logo uploaded. Click "Save Changes" to persist.` });
        }
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to upload logo' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="min-h-screen bg-stone-950 text-white">
        <div className="max-w-2xl mx-auto px-6 py-16">
          <h1 className="text-2xl font-bold mb-4">Brand Settings</h1>
          <div className="rounded-2xl bg-white/[0.06] p-8 text-center">
            <p className="text-white/60 mb-4">You don&apos;t have access to any brand themes yet.</p>
            <Link href="/" className="text-amber-400 hover:underline">
              Go back home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/60 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">Brand Settings</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-save status indicator */}
            <div className="flex items-center gap-2 text-[13px]">
              {autoSaveStatus === 'saving' && (
                <>
                  <div className="animate-spin w-3 h-3 border border-white/30 border-t-white/60 rounded-full" />
                  <span className="text-white/40">Saving...</span>
                </>
              )}
              {autoSaveStatus === 'saved' && (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400/80">Saved</span>
                </>
              )}
              {autoSaveStatus === 'error' && (
                <>
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-400/80">Save failed</span>
                </>
              )}
            </div>
            {selectedTheme && (
              <div className="flex items-center gap-3">
                {selectedTheme.navLogoUrl && (
                  <img src={selectedTheme.navLogoUrl} alt="" className="h-8 w-auto" />
                )}
                <span className="text-white/60">{selectedTheme.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Theme Selector (if multiple themes) */}
        {themes.length > 1 && (
          <div className="mb-8">
            <label className="block text-[13px] text-white/60 mb-2">Select Brand</label>
            <select
              value={selectedTheme?.id || ''}
              onChange={(e) => {
                const theme = themes.find(t => t.id === e.target.value);
                if (theme) selectTheme(theme);
              }}
              className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-white/[0.06] text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {themes.map(theme => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
            <p className={`text-[14px] ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          </div>
        )}

        <div className="space-y-8">
          {/* Logos Section */}
          <section className="rounded-2xl bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">Logos</h2>

            <div className="space-y-6">
              {/* Navigation Logo */}
              <div>
                <label className="block text-[13px] text-white/60 mb-3">Navigation Logo</label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-32 h-20 rounded-xl bg-white/[0.04] border border-dashed border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {navLogoUrl ? (
                      <img src={navLogoUrl} alt="Nav logo" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={navLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, 'nav');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => navLogoInputRef.current?.click()}
                      disabled={uploadingNav}
                      className="h-10 px-4 text-[14px] font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white disabled:opacity-50 transition-colors"
                    >
                      {uploadingNav ? 'Uploading...' : navLogoUrl ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {navLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setNavLogoUrl('')}
                        className="ml-2 h-10 px-3 text-[14px] text-white/40 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[12px] text-white/40 mt-2">Shown in the navigation bar on event pages. Max 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Logo Destination URL */}
              <div>
                <label className="block text-[13px] text-white/60 mb-2">Logo Click Destination URL</label>
                <input
                  type="url"
                  value={logoDestinationUrl}
                  onChange={(e) => setLogoDestinationUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-transparent text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <p className="text-[12px] text-white/40 mt-1">Where users go when clicking your logo (leave empty for homepage)</p>
              </div>

              {/* Email Logo */}
              <div>
                <label className="block text-[13px] text-white/60 mb-3">Email Logo</label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-32 h-20 rounded-xl bg-white/[0.04] border border-dashed border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {emailLogoUrl ? (
                      <img src={emailLogoUrl} alt="Email logo" className="max-w-full max-h-full object-contain p-2" />
                    ) : navLogoUrl ? (
                      <div className="text-center">
                        <img src={navLogoUrl} alt="Using nav logo" className="max-w-full max-h-12 object-contain p-1 opacity-50" />
                        <span className="text-[10px] text-white/30">Using nav logo</span>
                      </div>
                    ) : (
                      <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={emailLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file, 'email');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => emailLogoInputRef.current?.click()}
                      disabled={uploadingEmail}
                      className="h-10 px-4 text-[14px] font-medium rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white disabled:opacity-50 transition-colors"
                    >
                      {uploadingEmail ? 'Uploading...' : emailLogoUrl ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {emailLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setEmailLogoUrl('')}
                        className="ml-2 h-10 px-3 text-[14px] text-white/40 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                    <p className="text-[12px] text-white/40 mt-2">Shown in confirmation emails. Leave empty to use navigation logo.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Email Settings Section */}
          <section className="rounded-2xl bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">Email Settings</h2>

            <div>
              <label className="block text-[13px] text-white/60 mb-2">Email Sender Name</label>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                placeholder="Your Brand Name"
                className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-transparent text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <p className="text-[12px] text-white/40 mt-1">Confirmation emails will be sent as &quot;from {emailFromName || 'Your Brand Name'}&quot;</p>
            </div>
          </section>

          {/* Branding Section */}
          <section className="rounded-2xl bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">Branding</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-[13px] text-white/60 mb-2">Brand Color</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={brandColor || '#1c1917'}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-12 h-12 rounded-xl cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#1c1917"
                    className="flex-1 h-12 px-4 rounded-xl bg-white/[0.08] border border-transparent text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
                <p className="text-[12px] text-white/40 mt-1">Used as the background color for events</p>
              </div>
            </div>
          </section>

          {/* Default Values Section */}
          <section className="rounded-2xl bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">Default Values</h2>
            <p className="text-[14px] text-white/60 mb-5">These values will be pre-filled when creating new events</p>

            <div className="space-y-5">
              <div>
                <label className="block text-[13px] text-white/60 mb-2">Default &quot;Hosted By&quot; Name</label>
                <input
                  type="text"
                  value={defaultHostedBy}
                  onChange={(e) => setDefaultHostedBy(e.target.value)}
                  placeholder="Your Organization Name"
                  className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-transparent text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              <div>
                <label className="block text-[13px] text-white/60 mb-2">Default Location</label>
                <input
                  type="text"
                  value={defaultLocation}
                  onChange={(e) => setDefaultLocation(e.target.value)}
                  placeholder="123 Main St, City"
                  className="w-full h-12 px-4 rounded-xl bg-white/[0.08] border border-transparent text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>
          </section>

          {/* Social Links Section */}
          <section className="rounded-2xl bg-white/[0.06] p-6">
            <h2 className="text-lg font-semibold mb-6">Social Links</h2>
            <p className="text-[14px] text-white/60 mb-5">Displayed on event pages and after checkout</p>

            <div className="space-y-4">
              {[
                { key: 'website', label: 'Website', placeholder: 'https://yourwebsite.com' },
                { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
                { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/yourhandle' },
                { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
                { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourcompany' },
                { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
                { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-24 text-[13px] text-white/60 flex-shrink-0">{label}</label>
                  <input
                    type="url"
                    value={socialLinks[key as keyof SocialLinks] || ''}
                    onChange={(e) => updateSocialLink(key as keyof SocialLinks, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 h-10 px-4 rounded-lg bg-white/[0.08] border border-transparent text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-[13px] text-white/40">
              Changes are saved automatically
            </p>
            <div className="flex gap-4">
              <Link
                href="/"
                className="h-12 px-6 flex items-center justify-center text-[15px] font-medium text-white/60 hover:text-white transition-colors"
              >
                Done
              </Link>
              <button
                onClick={() => setShowPreview(true)}
                className="h-12 px-6 text-[15px] font-semibold rounded-full border border-white/20 text-white hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <BrandPreviewModal
          navLogoUrl={navLogoUrl}
          logoDestinationUrl={logoDestinationUrl}
          brandColor={brandColor}
          defaultHostedBy={defaultHostedBy}
          socialLinks={socialLinks}
          themeName={selectedTheme?.name || 'Your Brand'}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// Preview Modal Component - Full Page with Device Switcher
function BrandPreviewModal({
  navLogoUrl,
  logoDestinationUrl,
  brandColor,
  defaultHostedBy,
  socialLinks,
  themeName,
  onClose,
}: {
  navLogoUrl: string;
  logoDestinationUrl: string;
  brandColor: string;
  defaultHostedBy: string;
  socialLinks: SocialLinks;
  themeName: string;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const themeColor = brandColor || '#1c1917';

  // Sample event data for preview
  const sampleEvent = {
    name: 'Summer Jazz Night',
    month: 'JUL',
    day: '15',
    fullDate: 'Saturday, July 15, 2026',
    time: '7:00 PM - 10:00 PM',
    location: '123 Main Street',
    locationDetails: 'New York, NY',
    description: 'Join us for an evening of smooth jazz, great company, and unforgettable memories. This is a preview of how your branded event page will appear to attendees.',
    coverImage: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
  };

  const isMobile = viewMode === 'mobile';

  return (
    <div className="fixed inset-0 z-50">
      {/* Floating Toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-2 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 shadow-xl">
        {/* Device Switcher */}
        <div className="flex items-center bg-black/50 rounded-full p-1">
          <button
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'desktop'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Desktop
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              viewMode === 'mobile'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Mobile
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>

      {/* Preview Container */}
      <div className={`h-full w-full overflow-auto flex justify-center ${isMobile ? 'bg-zinc-900 pt-16 pb-4' : ''}`}>
        <div
          className={`transition-all duration-300 ${
            isMobile
              ? 'w-[375px] mx-4 my-4 rounded-[2.5rem] border-[14px] border-zinc-800 shadow-2xl overflow-hidden'
              : 'w-full h-full'
          }`}
          style={{
            backgroundColor: themeColor,
            maxHeight: isMobile ? 'calc(100vh - 120px)' : undefined,
          }}
        >
          {/* Mobile notch */}
          {isMobile && (
            <div className="relative h-7 bg-zinc-800 flex items-center justify-center">
              <div className="w-20 h-5 bg-black rounded-full" />
            </div>
          )}

          {/* Scrollable content */}
          <div
            className={`overflow-y-auto ${isMobile ? 'h-[calc(100vh-180px)]' : 'min-h-screen'}`}
            style={{ backgroundColor: themeColor }}
          >
            {/* Navigation */}
            <nav
              className={`sticky top-0 z-20 backdrop-blur-xl border-b border-white/[0.04]`}
              style={{ backgroundColor: `${themeColor}cc` }}
            >
              <div className={`mx-auto h-16 flex items-center justify-between ${isMobile ? 'px-4' : 'max-w-6xl px-6 lg:px-8'}`}>
                {navLogoUrl ? (
                  <div className="group cursor-pointer">
                    <img
                      src={navLogoUrl}
                      alt={themeName}
                      className={`w-auto group-hover:scale-105 transition-all duration-300 ${isMobile ? 'max-h-8' : 'max-h-10'}`}
                    />
                  </div>
                ) : (
                  <div className="text-white/40 text-sm italic">No logo uploaded</div>
                )}
              </div>
            </nav>

            {/* Main Content */}
            <main className={`relative ${isMobile ? 'px-4 py-6' : 'max-w-6xl mx-auto px-6 lg:px-8 py-8 lg:py-12'}`}>
              <div className={`flex gap-8 ${isMobile ? 'flex-col' : 'flex-col lg:flex-row lg:gap-12'}`}>
                {/* Left Column - Cover Image */}
                <div className={isMobile ? 'w-full' : 'w-full lg:w-[340px] flex-shrink-0'}>
                  <div className="relative rounded-3xl overflow-hidden bg-white/[0.06] backdrop-blur-sm border border-transparent">
                    <div className={isMobile ? 'aspect-[4/5]' : 'aspect-[4/5]'}>
                      <img
                        src={sampleEvent.coverImage}
                        alt="Event cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className={`flex-1 ${isMobile ? 'space-y-5' : 'space-y-6'}`}>
                  {/* Event Name */}
                  <h1 className={`font-bold text-white tracking-tight leading-tight ${isMobile ? 'text-[1.75rem]' : 'text-[2.5rem] lg:text-[3rem]'}`}>
                    {sampleEvent.name}
                  </h1>

                  {/* Date/Time */}
                  <div className={`flex items-start ${isMobile ? 'gap-4' : 'gap-5'}`}>
                    <div className={`rounded-xl bg-white/[0.08] backdrop-blur-sm flex flex-col items-center justify-center flex-shrink-0 ${isMobile ? 'w-14 h-14' : 'w-16 h-16'}`}>
                      <span className={`text-white/50 uppercase tracking-wider font-medium ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>{sampleEvent.month}</span>
                      <span className={`font-bold text-white leading-none ${isMobile ? 'text-[20px]' : 'text-[24px]'}`}>{sampleEvent.day}</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-white font-medium ${isMobile ? 'text-[15px]' : 'text-[17px]'}`}>{sampleEvent.fullDate}</p>
                      <p className={`text-white/60 mt-1 ${isMobile ? 'text-[13px]' : 'text-[15px]'}`}>{sampleEvent.time}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className={`flex items-start ${isMobile ? 'gap-4' : 'gap-5'}`}>
                    <div className={`rounded-xl bg-white/[0.08] backdrop-blur-sm flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-14 h-14' : 'w-16 h-16'}`}>
                      <svg className={`text-white/60 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-white font-medium ${isMobile ? 'text-[15px]' : 'text-[17px]'}`}>{sampleEvent.location}</p>
                      <p className={`text-white/60 mt-1 ${isMobile ? 'text-[13px]' : 'text-[15px]'}`}>{sampleEvent.locationDetails}</p>
                    </div>
                  </div>

                  {/* Hosted By */}
                  <div className={`flex items-start ${isMobile ? 'gap-4' : 'gap-5'}`}>
                    <div className={`rounded-xl bg-white/[0.08] backdrop-blur-sm flex items-center justify-center flex-shrink-0 ${isMobile ? 'w-14 h-14' : 'w-16 h-16'}`}>
                      <svg className={`text-white/60 ${isMobile ? 'w-5 h-5' : 'w-6 h-6'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={`text-white/40 uppercase tracking-wider font-medium ${isMobile ? 'text-[11px]' : 'text-[13px]'}`}>Hosted by</p>
                      <p className={`text-white font-medium mt-1 ${isMobile ? 'text-[15px]' : 'text-[17px]'}`}>{defaultHostedBy || themeName}</p>
                      {Object.keys(socialLinks).some(k => socialLinks[k as keyof SocialLinks]) && (
                        <div className="mt-3">
                          <SocialLinksComponent links={socialLinks} iconSize="sm" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="rounded-2xl bg-white/[0.06] backdrop-blur-sm border border-transparent overflow-hidden">
                    <div className={isMobile ? 'px-4 py-4' : 'px-6 py-5'}>
                      <h3 className={`text-white/40 uppercase tracking-wider font-medium mb-3 ${isMobile ? 'text-[11px]' : 'text-[13px]'}`}>About Event</h3>
                      <p className={`text-white/90 leading-relaxed ${isMobile ? 'text-[14px]' : 'text-[16px]'}`}>{sampleEvent.description}</p>
                    </div>
                  </div>

                  {/* Get Tickets Button */}
                  <button className={`w-full font-semibold rounded-full bg-white text-black hover:bg-white/90 transition-colors ${isMobile ? 'py-3 text-[14px]' : 'py-4 text-[15px]'}`}>
                    Get Tickets
                  </button>
                </div>
              </div>
            </main>

            {/* Info bar - only show on desktop */}
            {!isMobile && (
              <div className="border-t border-white/10 px-6 py-4 text-center">
                <p className="text-white/40 text-sm">
                  This is a preview of how your event pages will look with current branding settings
                </p>
                {logoDestinationUrl && (
                  <p className="text-white/30 text-xs mt-1">
                    Logo will link to: {logoDestinationUrl}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mobile home indicator */}
          {isMobile && (
            <div className="h-8 flex items-center justify-center" style={{ backgroundColor: themeColor }}>
              <div className="w-32 h-1 bg-white/30 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
