const DEFAULT_TWILIO_VIDEO_BASE = 'https://video.twilio.com/{room}';

const LEGACY_PROVIDERS = new Set(['talky', 'meet', 'jitsi']);

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

  if (!base) {
    return `https://video.twilio.com/${room}`;
  }

  if (base.includes('{room}')) {
    return base.replace('{room}', room);
  }

  const normalizedBase = base.replace(/\/+$/, '');
  return `${normalizedBase}/${room}`;
};
