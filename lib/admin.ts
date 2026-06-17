// Emails allowed to access the admin dashboard
export const ADMIN_EMAILS: string[] = [
  process.env.TODD_EMAIL_1,
  process.env.TODD_EMAIL_2,
].filter(Boolean).map((e) => (e as string).toLowerCase());

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
