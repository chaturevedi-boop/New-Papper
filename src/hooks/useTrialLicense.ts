import { useCallback, useState } from 'react';
import { parseAndVerifyLicenseKey, type ParsedLicense, type LicenseFailureReason } from '../utils/licenseKey';

const TRIAL_DAYS = 15;
const INSTALL_DATE_KEY = 'dns_trial_install_date';
const LICENSE_KEY_STORAGE = 'dns_license_key';

export type UnlockError = LicenseFailureReason;

export interface TrialLicenseState {
  daysRemaining: number;
  isLicensed: boolean;
  isExpired: boolean;
  license: ParsedLicense | null;
  unlock: (code: string) => { success: boolean; error?: UnlockError };
}

function loadValidLicense(): ParsedLicense | null {
  const stored = localStorage.getItem(LICENSE_KEY_STORAGE);
  if (!stored) return null;
  const result = parseAndVerifyLicenseKey(stored);
  return result.valid && result.license ? result.license : null;
}

export function useTrialLicense(): TrialLicenseState {
  const [installDate] = useState<number>(() => {
    const saved = localStorage.getItem(INSTALL_DATE_KEY);
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem(INSTALL_DATE_KEY, String(now));
    return now;
  });

  // Re-validated (including expiry) fresh on every load, so a 1-year/5-year key that
  // has since lapsed naturally falls back to a locked state without extra bookkeeping.
  const [license, setLicense] = useState<ParsedLicense | null>(() => loadValidLicense());

  const daysElapsed = Math.floor((Date.now() - installDate) / 86400000);
  const daysRemaining = Math.max(0, TRIAL_DAYS - daysElapsed);
  const isLicensed = license !== null;
  const isExpired = daysRemaining <= 0 && !isLicensed;

  const unlock = useCallback((code: string) => {
    const result = parseAndVerifyLicenseKey(code);
    if (!result.valid || !result.license) {
      return { success: false, error: result.reason };
    }
    localStorage.setItem(LICENSE_KEY_STORAGE, code.trim().toUpperCase());
    setLicense(result.license);
    return { success: true };
  }, []);

  return { daysRemaining, isLicensed, isExpired, license, unlock };
}
