const DEFAULT_TWILIO_VIDEO_BASE = '/twilio-video-embed.html?roomName={room}';

const LEGACY_PROVIDERS = new Set(['talky', 'meet', 'jitsi']);
const LEGACY_HOSTS = new Set(['video.twilio.com', 'twilio-video-demo-app.vercel.app', 'talky.io', 'meet.jit.si']);

export const getVideoCallBaseUrl = () =>
  String(
    process.env.REACT_APP_TWILIO_VIDEO_BASE_URL ||
      process.env.REACT_APP_VIDEO_CALL_BASE_URL ||
      DEFAULT_TWILIO_VIDEO_BASE
  ).trim();

export const normalizeVideoCallProvider = (provider?: string | null) => {
  const normalized = String(provider || '').trim().toLowerCase();
  if (!normalized || LEGACY_PROVIDERS.has(normalized)) {
    return 'twilio';
  }
  return normalized;
};

export const buildVideoCallUrl = (roomName: string) => {
  const base = getVideoCallBaseUrl();
  const room = encodeURIComponent(String(roomName || '').trim());
  if (!room) {
    return '';
  }

  if (!base) {
    return `/twilio-video-embed.html?roomName=${room}`;
  }

  if (base.includes('{room}') || base.includes('{identity}')) {
    return base
      .replace('{room}', room)
      .replace('{identity}', '');
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}roomName=${room}`;
};

const extractRoomFromUrl = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  try {
    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(raw, fallbackBase);
    const roomFromQuery = parsed.searchParams.get('roomName');
    if (roomFromQuery) {
      return roomFromQuery;
    }

    const firstPathSegment = parsed.pathname.replace(/^\/+/, '').split('/')[0] || '';
    return decodeURIComponent(firstPathSegment);
  } catch {
    return '';
  }
};

const isLegacyOrExternalVideoUrl = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) {
    return false;
  }

  if (/\/twilio-video-embed\.html/i.test(raw)) {
    return false;
  }

  try {
    const fallbackBase = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const parsed = new URL(raw, fallbackBase);
    if (LEGACY_HOSTS.has(parsed.hostname.toLowerCase())) {
      return true;
    }

    if (typeof window !== 'undefined') {
      return parsed.origin !== window.location.origin;
    }

    return false;
  } catch {
    return false;
  }
};

export const normalizeVideoCallUrl = (value?: string | null, roomName?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) {
    const fallbackRoom = String(roomName || '').trim();
    return fallbackRoom ? buildVideoCallUrl(fallbackRoom) : '';
  }

  if (!isLegacyOrExternalVideoUrl(raw)) {
    return raw;
  }

  const room = String(roomName || '').trim() || extractRoomFromUrl(raw);
  if (!room) {
    return raw;
  }

  return buildVideoCallUrl(room);
};
