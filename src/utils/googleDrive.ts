import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Google Drive backup using OAuth 2.0 Authorization Code + PKCE.
//
// PKCE (rather than the older implicit flow) is what Google requires for "installed app"
// clients, and crucially it needs NO client secret - which matters because anything shipped
// inside an APK is readable by anyone who unzips it. The user supplies their own OAuth client
// ID (see DriveBackupModal); we never embed credentials in the build.
//
// Scope is drive.appdata only: the backup lives in a hidden per-app folder, so this can
// neither see nor touch the rest of the user's Drive.

const CLIENT_ID_KEY = 'papertrack_drive_client_id';
const REFRESH_TOKEN_KEY = 'papertrack_drive_refresh_token';
const ACCESS_TOKEN_KEY = 'papertrack_drive_access_token';
const ACCESS_EXPIRY_KEY = 'papertrack_drive_access_expiry';
const VERIFIER_KEY = 'papertrack_drive_pkce_verifier';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'papertrack-backup.json';

// Must match the Android client's registered custom scheme (and the intent filter in
// AndroidManifest.xml). On web we come back to the app's own origin instead.
export const NATIVE_REDIRECT_URI = 'com.papertrack.app:/oauth2redirect';
export const webRedirectUri = () => `${window.location.origin}${window.location.pathname}`;

export const redirectUri = () => (Capacitor.isNativePlatform() ? NATIVE_REDIRECT_URI : webRedirectUri());

export function getClientId(): string | null {
  return localStorage.getItem(CLIENT_ID_KEY);
}

export function setClientId(clientId: string): void {
  localStorage.setItem(CLIENT_ID_KEY, clientId.trim());
}

export function isDriveConnected(): boolean {
  return !!localStorage.getItem(REFRESH_TOKEN_KEY);
}

// True while a beginAuth() round-trip is in flight (the PKCE verifier is stored right before
// leaving for Google's consent screen, and cleared once completeAuth() finishes). Used to tell
// a plain page load apart from a redirect back from Google on web.
export function hasPendingAuth(): boolean {
  return !!localStorage.getItem(VERIFIER_KEY);
}

export function disconnectDrive(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(ACCESS_EXPIRY_KEY);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const verifier = base64UrlEncode(random);

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64UrlEncode(new Uint8Array(digest)) };
}

export class DriveError extends Error {}

// Step 1: send the user to Google's consent screen. Native opens the system browser (Google
// blocks OAuth inside embedded WebViews), web navigates in place; either way Google redirects
// back to redirectUri() with a one-time code that completeAuth() exchanges.
export async function beginAuth(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new DriveError('Add your Google OAuth Client ID first.');

  const { verifier, challenge } = await createPkcePair();
  localStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // asks for a refresh token so later backups don't re-prompt
    prompt: 'consent'
  });

  const url = `${AUTH_ENDPOINT}?${params.toString()}`;

  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.location.href = url;
}

// Step 2: swap the one-time code for tokens. Called with the full redirect URL - on native
// that arrives through the appUrlOpen deep-link listener, on web from the page's own query
// string after Google navigates back.
export async function completeAuth(redirectUrl: string): Promise<void> {
  const clientId = getClientId();
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!clientId || !verifier) throw new DriveError('Authorization session expired. Try connecting again.');

  const url = new URL(redirectUrl);
  const error = url.searchParams.get('error');
  if (error) throw new DriveError(`Google returned "${error}".`);

  const code = url.searchParams.get('code');
  if (!code) throw new DriveError('No authorization code came back from Google.');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri()
    })
  });

  const data = await response.json();
  if (!response.ok) throw new DriveError(data.error_description || data.error || 'Token exchange failed.');

  localStorage.removeItem(VERIFIER_KEY);
  if (data.refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  storeAccessToken(data.access_token, data.expires_in);

  if (Capacitor.isNativePlatform()) await Browser.close().catch(() => undefined);
}

function storeAccessToken(token: string, expiresInSeconds: number): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  // Expire a minute early so a request never starts with an almost-dead token
  localStorage.setItem(ACCESS_EXPIRY_KEY, String(Date.now() + (expiresInSeconds - 60) * 1000));
}

async function getAccessToken(): Promise<string> {
  const cached = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = parseInt(localStorage.getItem(ACCESS_EXPIRY_KEY) || '0', 10);
  if (cached && Date.now() < expiry) return cached;

  const clientId = getClientId();
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!clientId || !refreshToken) throw new DriveError('Not connected to Google Drive.');

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (!response.ok) {
    // A revoked or expired grant can't be recovered by retrying - force a reconnect
    disconnectDrive();
    throw new DriveError(data.error_description || 'Google sign-in expired. Connect again.');
  }

  storeAccessToken(data.access_token, data.expires_in);
  return data.access_token;
}

async function findBackupFileId(token: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${BACKUP_FILENAME}'`,
    fields: 'files(id,name,modifiedTime)'
  });

  const response = await fetch(`${DRIVE_FILES}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new DriveError('Could not search Drive for an existing backup.');

  const data = await response.json();
  return data.files?.[0]?.id ?? null;
}

export interface DriveBackupInfo {
  modifiedTime: string;
  size: number;
}

export async function getBackupInfo(): Promise<DriveBackupInfo | null> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name = '${BACKUP_FILENAME}'`,
    fields: 'files(id,modifiedTime,size)'
  });

  const response = await fetch(`${DRIVE_FILES}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;

  const file = (await response.json()).files?.[0];
  return file ? { modifiedTime: file.modifiedTime, size: parseInt(file.size || '0', 10) } : null;
}

// Writes (or overwrites) the single backup file in the app's private Drive folder.
export async function uploadBackup(serializedState: string): Promise<void> {
  const token = await getAccessToken();
  const existingId = await findBackupFileId(token);

  const boundary = `papertrack${Date.now()}`;
  const metadata = existingId
    ? { name: BACKUP_FILENAME }
    : { name: BACKUP_FILENAME, parents: ['appDataFolder'] };

  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${serializedState}\r\n` +
    `--${boundary}--`;

  const url = existingId
    ? `${DRIVE_UPLOAD}/${existingId}?uploadType=multipart`
    : `${DRIVE_UPLOAD}?uploadType=multipart`;

  const response = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new DriveError(`Drive rejected the upload: ${detail.slice(0, 200)}`);
  }
}

export async function downloadBackup(): Promise<string> {
  const token = await getAccessToken();
  const fileId = await findBackupFileId(token);
  if (!fileId) throw new DriveError('No PaperTrack backup found in this Google account.');

  const response = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new DriveError('Could not download the backup from Drive.');

  return response.text();
}
