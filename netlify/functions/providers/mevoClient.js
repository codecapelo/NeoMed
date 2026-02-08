const DEFAULT_TIMEOUT_MS = 15000;

const readMevoConfig = () => {
  const baseUrl = process.env.MEVO_API_URL || process.env.MEVO_BASE_URL || '';
  const issuePath = process.env.MEVO_ISSUE_PATH || '/v1/documents/issue';
  const apiToken = process.env.MEVO_API_TOKEN || '';
  const apiKey = process.env.MEVO_API_KEY || '';
  const clientId = process.env.MEVO_CLIENT_ID || '';
  const clientSecret = process.env.MEVO_CLIENT_SECRET || '';

  const isConfigured = Boolean(baseUrl && (apiToken || apiKey || (clientId && clientSecret)));

  return {
    baseUrl,
    issuePath,
    apiToken,
    apiKey,
    clientId,
    clientSecret,
    isConfigured,
  };
};

const withTimeout = async (promise, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Request timeout.')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildHeaders = (config) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (config.apiToken) {
    headers.Authorization = `Bearer ${config.apiToken}`;
  }

  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  if (config.clientId) {
    headers['x-client-id'] = config.clientId;
  }

  if (config.clientSecret) {
    headers['x-client-secret'] = config.clientSecret;
  }

  return headers;
};

const createMockDocument = (payload) => {
  const timestamp = Date.now();
  const normalizedType = payload.documentType === 'certificate' ? 'certificate' : 'prescription';

  return {
    status: 'pending_configuration',
    providerDocumentId: `mevo_mock_${normalizedType}_${timestamp}`,
    providerToken: `mevo_mock_token_${timestamp}`,
    mode: 'mock',
    rawResponse: {
      simulated: true,
      reason: 'mevo-not-configured',
      advice: 'Configure MEVO_API_URL and credentials to send documents to Mevo.',
    },
  };
};

const issueDocumentWithMevo = async (payload) => {
  const config = readMevoConfig();

  if (!config.isConfigured) {
    return createMockDocument(payload);
  }

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}${config.issuePath.startsWith('/') ? '' : '/'}${
    config.issuePath
  }`;

  const response = await withTimeout(
    fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(payload),
    })
  );

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.message || `Mevo provider request failed with status ${response.status}.`;
    const error = new Error(message);
    error.code = 'integration/mevo-provider-error';
    error.httpStatus = response.status;
    error.providerResponse = body;
    throw error;
  }

  return {
    status: body?.status || 'emitted',
    providerDocumentId: body?.documentId || body?.id || null,
    providerToken: body?.token || body?.accessToken || null,
    mode: 'provider',
    rawResponse: body,
  };
};

module.exports = {
  issueDocumentWithMevo,
};
