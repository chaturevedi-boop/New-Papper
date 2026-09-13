// License key format: DNS-<DURATION>-<ISSUEDATE>-<CUSTOMER_NAME>-<SIGNATURE>
// e.g.  DNS-1Y-20260913-RAMESH_KIRANA_STORE-A1B2C3D4
//
// This is a client-side-only check (no backend), matching the trade-off already agreed
// for the free-trial system: it stops casual key fabrication/sharing, but a determined
// person could extract SECRET from the JS bundle and forge keys. Generate real keys with
// scripts/generate-license.cjs, which must stay in sync with the hash logic below.

export type LicenseDuration = '1Y' | '5Y' | 'LT';

const SECRET = 'DNS-2026-SECRET-CHANGE-ME';

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

export function encodeName(name: string): string {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'CUSTOMER';
}

export function decodeName(encoded: string): string {
  return encoded.replace(/_/g, ' ');
}

export function signParts(duration: LicenseDuration, issueDate: string, encodedName: string): string {
  return fnv1aHex(`${duration}|${issueDate}|${encodedName}|${SECRET}`);
}

export function buildLicenseKey(
  customerName: string,
  duration: LicenseDuration,
  issueDate: string = new Date().toISOString().slice(0, 10).replace(/-/g, '')
): string {
  const encodedName = encodeName(customerName);
  const signature = signParts(duration, issueDate, encodedName);
  return `DNS-${duration}-${issueDate}-${encodedName}-${signature}`;
}

export interface ParsedLicense {
  customerName: string;
  duration: LicenseDuration;
  issueDate: string; // YYYYMMDD
  expiry: Date | null; // null = lifetime
}

export type LicenseFailureReason = 'malformed' | 'signature' | 'expired';

// Not a discriminated union on purpose: this project's tsconfig doesn't enable
// strictNullChecks, and without it TS's narrowing on a `valid: true | false` tag is
// unreliable. `license`/`reason` are both optional instead - check `valid` and read
// whichever field applies, no narrowing required.
export interface LicenseCheckResult {
  valid: boolean;
  license?: ParsedLicense;
  reason?: LicenseFailureReason;
}

export function parseAndVerifyLicenseKey(key: string): LicenseCheckResult {
  const parts = key.trim().toUpperCase().split('-');
  if (parts.length !== 5 || parts[0] !== 'DNS') return { valid: false, reason: 'malformed' };

  const [, duration, issueDate, encodedName, signature] = parts;
  if (duration !== '1Y' && duration !== '5Y' && duration !== 'LT') return { valid: false, reason: 'malformed' };
  if (!/^\d{8}$/.test(issueDate)) return { valid: false, reason: 'malformed' };

  const expected = signParts(duration, issueDate, encodedName);
  if (expected !== signature) return { valid: false, reason: 'signature' };

  let expiry: Date | null = null;
  if (duration !== 'LT') {
    const y = parseInt(issueDate.slice(0, 4), 10);
    const m = parseInt(issueDate.slice(4, 6), 10);
    const d = parseInt(issueDate.slice(6, 8), 10);
    const years = duration === '1Y' ? 1 : 5;
    expiry = new Date(Date.UTC(y + years, m - 1, d));
  }

  if (expiry && expiry.getTime() < Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    license: { customerName: decodeName(encodedName), duration, issueDate, expiry }
  };
}
