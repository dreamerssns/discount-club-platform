const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_DOMAINS = ['discountbnbclub.com', 'homestayclub.ca'];

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidDomain(domain: string): boolean {
  return VALID_DOMAINS.includes(domain);
}

export function isValidCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getDomainLabel(domain: string): string {
  if (domain === 'homestayclub.ca') return 'Homestay Club';
  return 'Discount BNB Club';
}
