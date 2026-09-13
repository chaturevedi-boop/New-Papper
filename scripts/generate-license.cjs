#!/usr/bin/env node
// Generates a license key to hand out to a customer after their 15-day trial.
// Usage: node scripts/generate-license.cjs "Customer Name" <1Y|5Y|LT>
//
// Must stay in sync with src/utils/licenseKey.ts (same SECRET + hash algorithm) -
// if you change one, change the other.

const SECRET = 'DNS-2026-SECRET-CHANGE-ME';

function fnv1aHex(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function encodeName(name) {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'CUSTOMER';
}

function signParts(duration, issueDate, encodedName) {
  return fnv1aHex(`${duration}|${issueDate}|${encodedName}|${SECRET}`);
}

function buildLicenseKey(customerName, duration, issueDate) {
  const encodedName = encodeName(customerName);
  const signature = signParts(duration, issueDate, encodedName);
  return `DNS-${duration}-${issueDate}-${encodedName}-${signature}`;
}

const [, , customerName, durationArg] = process.argv;
const duration = (durationArg || '').toUpperCase();

if (!customerName || !['1Y', '5Y', 'LT'].includes(duration)) {
  console.error('Usage: node scripts/generate-license.cjs "Customer Name" <1Y|5Y|LT>');
  console.error('  1Y = 1 year, 5Y = 5 years, LT = lifetime');
  process.exit(1);
}

const issueDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const key = buildLicenseKey(customerName, duration, issueDate);

const labels = { '1Y': '1 year', '5Y': '5 years', LT: 'lifetime' };
console.log(`\nCustomer:  ${customerName}`);
console.log(`Plan:      ${labels[duration]}`);
console.log(`Issued:    ${issueDate.slice(0, 4)}-${issueDate.slice(4, 6)}-${issueDate.slice(6, 8)}`);
console.log(`\nLicense key:\n  ${key}\n`);
