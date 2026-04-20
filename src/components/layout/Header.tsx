'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ProfileDropdown } from './ProfileDropdown';

interface HeaderProps {
  variant?: 'default' | 'transparent';
  backgroundColor?: string;
}

export function Header({ variant = 'default', backgroundColor }: HeaderProps) {
  const navClasses = variant === 'transparent'
    ? 'fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0a0a09]/80'
    : 'sticky top-0 z-50 backdrop-blur-xl border-b border-white/[0.04]';

  const navStyle = backgroundColor
    ? { backgroundColor: `${backgroundColor}cc` }
    : undefined;

  return (
    <nav className={navClasses} style={navStyle}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="group">
          <Image
            src="/logo.png"
            alt="Seated"
            width={168}
            height={168}
            className="max-h-10 w-auto group-hover:scale-105 transition-all duration-300"
          />
        </Link>

        <div className="flex items-center gap-4">
          <ProfileDropdown variant="dark" />
        </div>
      </div>
    </nav>
  );
}
