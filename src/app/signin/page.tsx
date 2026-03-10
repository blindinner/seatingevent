'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { sendOtp, verifyOtp, signInWithOAuth } from '@/lib/auth';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const redirect = searchParams.get('redirect') || '/';

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push(redirect);
    }
  }, [user, loading, router, redirect]);

  // Focus email input on mount
  useEffect(() => {
    if (!loading && !user && step === 'email') {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [loading, user, step]);

  // Focus first code input when switching to code step
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await sendOtp(email);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (fullCode: string) => {
    setError(null);
    setSubmitting(true);

    try {
      await verifyOtp(email, fullCode);
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
      // Clear code on error
      setCode(['', '', '', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < 7) {
      codeInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    const fullCode = newCode.join('');
    if (fullCode.length === 8 && newCode.every(d => d !== '')) {
      handleVerifyCode(fullCode);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 8);
    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);

      // Focus appropriate input
      if (pastedData.length < 8) {
        codeInputRefs.current[pastedData.length]?.focus();
      }

      // Auto-submit if complete
      if (pastedData.length === 8) {
        handleVerifyCode(pastedData);
      }
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode(['', '', '', '', '', '', '', '']);
    setError(null);
  };

  const handleResendCode = async () => {
    setError(null);
    try {
      await sendOtp(email);
      setCode(['', '', '', '', '', '', '', '']);
      codeInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    }
  };

  const handleOAuth = async () => {
    setError(null);
    try {
      await signInWithOAuth('google');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="group">
          <Image
            src="/logo.png"
            alt="Seated"
            width={168}
            height={168}
            className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
          />
        </Link>
      </header>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {step === 'email' ? (
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <Image
                  src="/logo.png"
                  alt="Seated"
                  width={120}
                  height={120}
                  className="h-12 w-auto"
                />
              </div>

              <h1 className="text-xl font-semibold text-white text-center mb-2">
                Sign in to Seated
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-8">
                Create events and manage your tickets
              </p>

              {/* Google OAuth - Primary option */}
              <button
                onClick={handleOAuth}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-medium transition-colors mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-zinc-900 text-zinc-500">or</span>
                </div>
              </div>

              {/* Email OTP */}
              <form onSubmit={handleSendCode}>
                <div className="mb-4">
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
                    required
                  />
                </div>

                {error && (
                  <div className="mb-4 text-sm text-red-400 text-center bg-red-400/10 px-4 py-2 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="w-full py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-zinc-700"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending code...
                    </span>
                  ) : (
                    'Continue with email'
                  )}
                </button>
              </form>

              <p className="mt-8 text-xs text-zinc-500 text-center">
                By continuing, you agree to our Terms of Service
              </p>
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 relative">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Email icon */}
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
              </div>

              <h1 className="text-xl font-semibold text-white text-center mb-2">
                Check your email
              </h1>
              <p className="text-sm text-zinc-400 text-center mb-8">
                We sent a code to <span className="text-zinc-300">{email}</span>
              </p>

              {/* Code inputs */}
              <div className="flex gap-1.5 justify-center mb-4">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { codeInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={handleCodePaste}
                    className="w-10 h-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-lg font-semibold text-center focus:outline-none focus:border-zinc-500 transition-colors"
                    disabled={submitting}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 text-sm text-red-400 text-center bg-red-400/10 px-4 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {submitting && (
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm mb-4">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </div>
              )}

              <button
                onClick={handleResendCode}
                disabled={submitting}
                className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
              >
                Didn&apos;t receive a code? <span className="underline">Resend</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
