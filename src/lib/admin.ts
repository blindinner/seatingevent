/**
 * Admin access control utilities
 */

/**
 * Check if an email is in the admin list
 * Uses NEXT_PUBLIC_ADMIN_EMAILS env var (comma-separated)
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;

  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
  const adminEmails = adminEmailsEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  return adminEmails.includes(email.toLowerCase());
}
