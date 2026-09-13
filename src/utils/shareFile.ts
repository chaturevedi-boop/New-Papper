import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// Shares or downloads a generated file (CSV/JSON/text), working correctly both in a
// desktop browser and inside a Capacitor Android app.
//
// On native platforms, the Android System WebView often does NOT implement the Web
// Share API at all (navigator.share is undefined) - and even when it does, a plain
// `<a download>` blob click and window.print() are always no-ops inside a WebView (no
// download manager or PrintManager wired up). So on native we go through Capacitor's
// real native plugins instead: write the file with @capacitor/filesystem, then hand its
// on-device URI to @capacitor/share, which opens Android's actual native share sheet
// via Intent.createChooser (this also sidesteps Android 11+ package-visibility
// restrictions entirely, since createChooser is exempt from them).
//
// On web, the Web Share API is tried first (desktop browsers with the OS share sheet),
// falling back to the classic blob-download for browsers without it (e.g. Firefox).
export type ShareOrDownloadResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

export async function shareOrDownloadFile(
  content: string,
  filename: string,
  mimeType: string,
  shareTitle?: string
): Promise<ShareOrDownloadResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const written = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({ title: shareTitle, url: written.uri, dialogTitle: shareTitle });
      return 'shared';
    } catch (err) {
      const message = String((err as Error)?.message || '').toLowerCase();
      if (message.includes('cancel')) return 'cancelled';
      return 'failed';
    }
  }

  const file = new File([content], filename, { type: mimeType });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: shareTitle });
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'cancelled';
        // Fall through to blob-download below on any other share failure
      }
    }
  }

  try {
    const element = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

// Shares text (e.g. a WhatsApp-style message) alongside an attached file, when the
// platform's share mechanism supports combining both (native Android does).
export async function shareTextAndFile(
  text: string,
  content: string,
  filename: string,
  shareTitle?: string
): Promise<ShareOrDownloadResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const written = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({ title: shareTitle, text, url: written.uri, dialogTitle: shareTitle });
      return 'shared';
    } catch (err) {
      const message = String((err as Error)?.message || '').toLowerCase();
      if (message.includes('cancel')) return 'cancelled';
      return 'failed';
    }
  }

  const file = new File([content], filename, { type: 'text/plain' });
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    try {
      await navigator.share(canShareFiles ? { title: shareTitle, text, files: [file] } : { title: shareTitle, text });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      return 'failed';
    }
  }

  return shareOrDownloadFile(content, filename, 'text/plain', shareTitle);
}

// Downloads/saves a real binary PDF (as opposed to the text-file helpers above).
// On native, Android's scoped storage means an app can't silently drop a file into the
// public Downloads folder without extra permissions - handing it to the native share
// sheet (which includes a "Save to device/Drive/Files" target) is the standard,
// permission-free way apps let users save an arbitrary file on modern Android.
// On web, this is a genuine browser download (or the Web Share API where available).
export async function sharePdf(
  base64: string,
  blob: Blob,
  filename: string,
  shareTitle?: string
): Promise<ShareOrDownloadResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      const written = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({ title: shareTitle, url: written.uri, dialogTitle: shareTitle });
      return 'shared';
    } catch (err) {
      const message = String((err as Error)?.message || '').toLowerCase();
      if (message.includes('cancel')) return 'cancelled';
      return 'failed';
    }
  }

  const file = new File([blob], filename, { type: 'application/pdf' });
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: shareTitle });
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'cancelled';
        // Fall through to blob-download below on any other share failure
      }
    }
  }

  try {
    const element = document.createElement('a');
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
