import { defaultPoster } from '../data/widgetTypes';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodePosterConfig(config: unknown) {
  const json = JSON.stringify(config);
  const bytes = encoder.encode(json);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodePosterConfig(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return JSON.parse(decoder.decode(bytes));
  } catch {
    return null;
  }
}

export function cloneDefaultPoster() {
  return structuredClone(defaultPoster);
}

export function uid(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
