'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { OAuthProvider } from '@/lib/auth';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  onClose?: () => void;
  initialMode?: AuthMode;
}

export function AuthModal({ onClose, initialMode = 'signup' }: AuthModalProps) {
  const { signIn, signUp, signInWithOAuth } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Reset form when mode changes
  useEffect(() => {
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (mode === 'signup') {
      // Validate password
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      // Check passwords match
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        onClose?.();
      } else {
        const result = await signUp(email, password);
        if (result.needsEmailConfirmation) {
          setShowEmailConfirmation(true);
        } else {
          onClose?.();
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        // Friendlier error messages
        if (err.message.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else if (err.message.includes('User already registered')) {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account');
        } else {
          setError(err.message);
        }
      } else {
        setError(mode === 'signin' ? 'Failed to sign in' : 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    setError(null);
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign in with ' + provider);
      }
      setOauthLoading(null);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  // Email confirmation success screen
  if (showEmailConfirmation) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-gray-900 rounded-xl p-8 w-full max-w-md border border-gray-700 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 mb-6">
            We&apos;ve sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to activate your account.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-xl w-full max-w-md border border-gray-700 overflow-hidden">
        {/* Header with tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              mode === 'signup'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Create Account
            {mode === 'signup' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
            )}
          </button>
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
              mode === 'signin'
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Sign In
            {mode === 'signin' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
            )}
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={oauthLoading !== null}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 disabled:bg-gray-200 text-gray-800 rounded-lg font-medium transition-all flex items-center justify-center gap-3 border border-gray-300"
            >
              {oauthLoading === 'google' ? (
                <LoadingSpinner />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('github')}
              disabled={oauthLoading !== null}
              className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-3 border border-gray-700"
            >
              {oauthLoading === 'github' ? (
                <LoadingSpinner />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
              )}
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('azure')}
              disabled={oauthLoading !== null}
              className="w-full py-2.5 px-4 bg-[#2F2F2F] hover:bg-[#3F3F3F] disabled:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-3 border border-gray-700"
            >
              {oauthLoading === 'azure' ? (
                <LoadingSpinner />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
              )}
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-500">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="••••••••"
              required
            />
            {mode === 'signup' && password.length > 0 && (
              <PasswordStrength password={password} />
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </button>

          {mode === 'signin' && (
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign up
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Lowercase', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
  ];

  const metCount = checks.filter((c) => c.met).length;
  const strength = metCount === 4 ? 'strong' : metCount >= 2 ? 'medium' : 'weak';

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= metCount
                ? strength === 'strong'
                  ? 'bg-green-500'
                  : strength === 'medium'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {checks.map((check) => (
          <span
            key={check.label}
            className={`text-xs ${
              check.met ? 'text-green-400' : 'text-gray-500'
            }`}
          >
            {check.met ? '✓' : '○'} {check.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
