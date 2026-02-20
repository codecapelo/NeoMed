const DEFAULT_TWILIO_VIDEO_BASE = 'https://twilio-video-demo-app.vercel.app/?roomName={room}';

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
  if (!room) {
    return '';
  }

  if (!base) {
    return `https://twilio-video-demo-app.vercel.app/?roomName=${room}`;
  }

  if (base.includes('{room}') || base.includes('{identity}')) {
    return base
      .replace('{room}', room)
      .replace('{identity}', '');
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}roomName=${room}`;
};
