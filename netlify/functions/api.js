const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { issueDocumentWithMevo } = require('./providers/mevoClient');

const DATA_TYPES = ['patients', 'prescriptions', 'appointments', 'medicalRecords'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const JWT_SECRET = process.env.JWT_SECRET || process.env.NETLIFY_JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const ONLINE_WINDOW_SECONDS = 120;

let pool;
let schemaReadyPromise;

const appError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const getPool = () => {
  if (pool) {
    return pool;
  }

  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw appError(
      500,
      'config/database-missing',
      'Database URL not found. Configure NETLIFY_DATABASE_URL or NETLIFY_DATABASE_URL_UNPOOLED.'
    );
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  return pool;
};

const ensureSchema = async () => {
  const db = getPool();

  if (!schemaReadyPromise) {
    schemaReadyPromise = db
      .query(`
        CREATE TABLE IF NOT EXISTS neomed_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ
        );

        ALTER TABLE neomed_users
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS neomed_user_data (
          user_id TEXT NOT NULL REFERENCES neomed_users(id) ON DELETE CASCADE,
          data_type TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, data_type)
        );

        CREATE TABLE IF NOT EXISTS neomed_mevo_documents (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES neomed_users(id) ON DELETE CASCADE,
          prescription_id TEXT NOT NULL,
          patient_id TEXT,
          document_type TEXT NOT NULL CHECK (document_type IN ('prescription', 'certificate')),
          status TEXT NOT NULL,
          provider_name TEXT NOT NULL DEFAULT 'mevo',
          provider_document_id TEXT,
          provider_token TEXT,
          provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          raw_response JSONB,
          error_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_neomed_mevo_user_prescription_type
        ON neomed_mevo_documents (user_id, prescription_id, document_type);

        CREATE INDEX IF NOT EXISTS idx_neomed_mevo_user_id
        ON neomed_mevo_documents (user_id);

        CREATE INDEX IF NOT EXISTS idx_neomed_mevo_prescription_id
        ON neomed_mevo_documents (prescription_id);
      `)
      .catch((error) => {
        schemaReadyPromise = null;
        throw error;
      });
  }

  await schemaReadyPromise;
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const normalizePath = (event) => {
  const rawPath = event.path || '/';
  let path = rawPath;

  path = path.replace(/^\/\.netlify\/functions\/api/, '');
  path = path.replace(/^\/api/, '');

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return path === '' ? '/' : path;
};

const readJsonBody = (event) => {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const sanitizeUser = (user) => ({
  uid: user.id,
  email: user.email,
  displayName: user.name,
  role: user.role,
  createdAt: user.created_at,
  lastSeenAt: user.last_seen_at || null,
  isOnline: typeof user.is_online === 'boolean' ? user.is_online : false,
  photoURL: null,
});

const getAuthorizationHeader = (event) => {
  if (!event.headers) {
    return null;
  }

  return event.headers.authorization || event.headers.Authorization || null;
};

const getTokenFromEvent = (event) => {
  const header = getAuthorizationHeader(event);

  if (!header) {
    return null;
  }

  if (/^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, '').trim();
  }

  return header.trim();
};

const signToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'neomed',
    }
  );

const markUserSeen = async (userId) => {
  const db = getPool();
  const result = await db.query(
    `
      UPDATE neomed_users
      SET last_seen_at = NOW()
      WHERE id = $1
      RETURNING id, email, name, role, created_at, last_seen_at;
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const requireAuth = async (event) => {
  const token = getTokenFromEvent(event);
  if (!token) {
    throw appError(401, 'auth/unauthorized', 'Authentication token is required.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { issuer: 'neomed' });
  } catch {
    throw appError(401, 'auth/invalid-token', 'Invalid or expired authentication token.');
  }

  const db = getPool();
  const userResult = await db.query(
    `SELECT id, email, name, role, created_at, last_seen_at FROM neomed_users WHERE id = $1 LIMIT 1;`,
    [decoded.sub]
  );

  if (!userResult.rows[0]) {
    throw appError(401, 'auth/user-not-found', 'User not found for this session.');
  }

  return userResult.rows[0];
};

const resolveTargetUserId = (authUser, event, body) => {
  const queryUserId = event.queryStringParameters && event.queryStringParameters.userId;
  const bodyUserId = body.userId || body.targetUserId;
  const headerUserId = event.headers && (event.headers['x-user-id'] || event.headers['X-User-Id']);
  const requestedUserId = bodyUserId || queryUserId || headerUserId;

  if (authUser.role === 'admin') {
    return requestedUserId || authUser.id;
  }

  if (requestedUserId && requestedUserId !== authUser.id) {
    throw appError(403, 'auth/forbidden', 'Only administrators can access other users data.');
  }

  return authUser.id;
};

const upsertData = async (userId, dataType, payload) => {
  const db = getPool();
  await db.query(
    `
      INSERT INTO neomed_user_data (user_id, data_type, payload, updated_at)
      VALUES ($1, $2, $3::jsonb, NOW())
      ON CONFLICT (user_id, data_type)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW();
    `,
    [userId, dataType, JSON.stringify(payload)]
  );
};

const loadAllData = async (userId) => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT data_type, payload
      FROM neomed_user_data
      WHERE user_id = $1;
    `,
    [userId]
  );

  const data = {
    patients: [],
    prescriptions: [],
    appointments: [],
    medicalRecords: [],
  };

  for (const row of result.rows) {
    if (DATA_TYPES.includes(row.data_type)) {
      data[row.data_type] = row.payload;
    }
  }

  return data;
};

const loadDataType = async (userId, dataType) => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT payload
      FROM neomed_user_data
      WHERE user_id = $1 AND data_type = $2;
    `,
    [userId, dataType]
  );

  if (!result.rows[0]) {
    return [];
  }

  return result.rows[0].payload;
};

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const isValidMevoDocumentType = (documentType) => ['prescription', 'certificate'].includes(documentType);

const sanitizeMevoDocument = (row) => ({
  id: row.id,
  userId: row.user_id,
  prescriptionId: row.prescription_id,
  patientId: row.patient_id || null,
  documentType: row.document_type,
  status: row.status,
  providerName: row.provider_name,
  providerDocumentId: row.provider_document_id || null,
  providerToken: row.provider_token || null,
  errorMessage: row.error_message || null,
  providerPayload: row.provider_payload || {},
  rawResponse: row.raw_response || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const upsertMevoDocument = async ({
  userId,
  prescriptionId,
  patientId,
  documentType,
  status,
  providerDocumentId,
  providerToken,
  providerPayload,
  rawResponse,
  errorMessage,
}) => {
  const db = getPool();
  const documentId = randomUUID();
  const result = await db.query(
    `
      INSERT INTO neomed_mevo_documents (
        id,
        user_id,
        prescription_id,
        patient_id,
        document_type,
        status,
        provider_name,
        provider_document_id,
        provider_token,
        provider_payload,
        raw_response,
        error_message,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'mevo', $7, $8, $9::jsonb, $10::jsonb, $11, NOW(), NOW())
      ON CONFLICT (user_id, prescription_id, document_type)
      DO UPDATE SET
        status = EXCLUDED.status,
        provider_document_id = EXCLUDED.provider_document_id,
        provider_token = EXCLUDED.provider_token,
        provider_payload = EXCLUDED.provider_payload,
        raw_response = EXCLUDED.raw_response,
        error_message = EXCLUDED.error_message,
        updated_at = NOW()
      RETURNING *;
    `,
    [
      documentId,
      userId,
      prescriptionId,
      patientId || null,
      documentType,
      status,
      providerDocumentId || null,
      providerToken || null,
      JSON.stringify(providerPayload || {}),
      JSON.stringify(rawResponse || null),
      errorMessage || null,
    ]
  );

  return result.rows[0];
};

const listMevoDocuments = async ({ userId, prescriptionId, documentType }) => {
  const db = getPool();
  const filters = ['user_id = $1'];
  const values = [userId];

  if (prescriptionId) {
    filters.push(`prescription_id = $${values.length + 1}`);
    values.push(prescriptionId);
  }

  if (documentType) {
    filters.push(`document_type = $${values.length + 1}`);
    values.push(documentType);
  }

  const result = await db.query(
    `
      SELECT *
      FROM neomed_mevo_documents
      WHERE ${filters.join(' AND ')}
      ORDER BY updated_at DESC;
    `,
    values
  );

  return result.rows;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  try {
    await ensureSchema();

    const db = getPool();
    const method = event.httpMethod;
    const path = normalizePath(event);
    const body = readJsonBody(event);

    if (method === 'GET' && path === '/health') {
      return jsonResponse(200, { ok: true });
    }

    if (method === 'POST' && path === '/auth/register') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.name || '').trim();

      if (!email || !isValidEmail(email)) {
        throw appError(400, 'auth/invalid-email', 'Email is invalid.');
      }

      if (password.length < 6) {
        throw appError(400, 'auth/weak-password', 'Password must have at least 6 characters.');
      }

      const existingUser = await db.query('SELECT id FROM neomed_users WHERE email = $1 LIMIT 1;', [email]);
      if (existingUser.rows.length > 0) {
        throw appError(409, 'auth/email-already-in-use', 'This email is already in use.');
      }

      const usersCountResult = await db.query('SELECT COUNT(*)::int AS count FROM neomed_users;');
      const usersCount = Number(usersCountResult.rows[0].count || 0);
      const role = usersCount === 0 ? 'admin' : 'doctor';
      const id = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      const insertResult = await db.query(
        `
          INSERT INTO neomed_users (id, email, password_hash, name, role, last_seen_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id, email, name, role, created_at, last_seen_at;
        `,
        [id, email, passwordHash, displayName || email.split('@')[0], role]
      );

      const user = insertResult.rows[0];
      const token = signToken(user);

      return jsonResponse(201, {
        success: true,
        user: sanitizeUser(user),
        token,
      });
    }

    if (method === 'POST' && path === '/auth/login') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password) {
        throw appError(400, 'auth/invalid-credentials', 'Email and password are required.');
      }

      const userResult = await db.query(
        `
          SELECT id, email, name, role, created_at, password_hash, last_seen_at
          FROM neomed_users
          WHERE email = $1
          LIMIT 1;
        `,
        [email]
      );

      const user = userResult.rows[0];
      if (!user) {
        throw appError(401, 'auth/invalid-credentials', 'Invalid email or password.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw appError(401, 'auth/invalid-credentials', 'Invalid email or password.');
      }

      const seenUser = await markUserSeen(user.id);
      const token = signToken(user);

      return jsonResponse(200, {
        success: true,
        user: sanitizeUser(seenUser || user),
        token,
      });
    }

    if (method === 'GET' && path === '/auth/me') {
      const authUser = await requireAuth(event);
      const seenUser = await markUserSeen(authUser.id);
      return jsonResponse(200, {
        success: true,
        user: sanitizeUser(seenUser || authUser),
      });
    }

    if (method === 'POST' && path === '/auth/ping') {
      const authUser = await requireAuth(event);
      const seenUser = await markUserSeen(authUser.id);
      return jsonResponse(200, {
        success: true,
        user: sanitizeUser(seenUser || authUser),
        serverTime: new Date().toISOString(),
      });
    }

    if (method === 'POST' && path === '/auth/logout') {
      return jsonResponse(200, {
        success: true,
      });
    }

    if (method === 'GET' && path === '/admin/users/count') {
      const authUser = await requireAuth(event);
      if (authUser.role !== 'admin') {
        throw appError(403, 'auth/forbidden', 'Only admin can access this endpoint.');
      }

      const countResult = await db.query('SELECT COUNT(*)::int AS count FROM neomed_users;');
      return jsonResponse(200, {
        success: true,
        count: Number(countResult.rows[0].count || 0),
      });
    }

    if (method === 'GET' && path === '/admin/users') {
      const authUser = await requireAuth(event);
      if (authUser.role !== 'admin') {
        throw appError(403, 'auth/forbidden', 'Only admin can access this endpoint.');
      }

      const usersResult = await db.query(
        `
          SELECT
            id,
            email,
            name,
            role,
            created_at,
            last_seen_at,
            (COALESCE(last_seen_at, '1970-01-01'::timestamptz) >= NOW() - INTERVAL '${ONLINE_WINDOW_SECONDS} seconds') AS is_online
          FROM neomed_users
          ORDER BY created_at DESC;
        `
      );

      return jsonResponse(200, {
        success: true,
        users: usersResult.rows.map(sanitizeUser),
      });
    }

    if (method === 'POST' && path === '/integrations/mevo/emit') {
      const authUser = await requireAuth(event);
      const targetUserId = resolveTargetUserId(authUser, event, body);
      const documentType = String(body.documentType || '').trim().toLowerCase();
      const prescriptionId = String(body.prescriptionId || '').trim();
      const patientId = body.patientId ? String(body.patientId).trim() : null;

      if (!prescriptionId) {
        throw appError(400, 'integration/mevo-invalid-payload', 'prescriptionId is required.');
      }

      if (!isValidMevoDocumentType(documentType)) {
        throw appError(
          400,
          'integration/mevo-invalid-document-type',
          'documentType must be "prescription" or "certificate".'
        );
      }

      const providerPayload = {
        documentType,
        prescriptionId,
        patientId,
        prescription: body.prescription || null,
        patient: body.patient || null,
        issuedBy: {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
        },
      };

      try {
        const providerResult = await issueDocumentWithMevo(providerPayload);
        const savedDocument = await upsertMevoDocument({
          userId: targetUserId,
          prescriptionId,
          patientId,
          documentType,
          status: providerResult.status || 'processing',
          providerDocumentId: providerResult.providerDocumentId,
          providerToken: providerResult.providerToken,
          providerPayload,
          rawResponse: providerResult.rawResponse,
          errorMessage: null,
        });

        return jsonResponse(200, {
          success: true,
          mode: providerResult.mode || 'provider',
          document: sanitizeMevoDocument(savedDocument),
        });
      } catch (integrationError) {
        const savedDocument = await upsertMevoDocument({
          userId: targetUserId,
          prescriptionId,
          patientId,
          documentType,
          status: 'failed',
          providerDocumentId: null,
          providerToken: null,
          providerPayload,
          rawResponse: integrationError.providerResponse || null,
          errorMessage: integrationError.message || 'Failed to send document to Mevo.',
        });

        return jsonResponse(502, {
          success: false,
          code: integrationError.code || 'integration/mevo-provider-error',
          message: integrationError.message || 'Failed to send document to Mevo.',
          document: sanitizeMevoDocument(savedDocument),
        });
      }
    }

    if (method === 'GET' && path === '/integrations/mevo/documents') {
      const authUser = await requireAuth(event);
      const targetUserId = resolveTargetUserId(authUser, event, body);
      const query = event.queryStringParameters || {};
      const prescriptionId = query.prescriptionId ? String(query.prescriptionId).trim() : null;
      const documentType = query.documentType ? String(query.documentType).trim().toLowerCase() : null;

      if (documentType && !isValidMevoDocumentType(documentType)) {
        throw appError(
          400,
          'integration/mevo-invalid-document-type',
          'documentType must be "prescription" or "certificate".'
        );
      }

      const documents = await listMevoDocuments({
        userId: targetUserId,
        prescriptionId,
        documentType,
      });

      return jsonResponse(200, {
        success: true,
        documents: documents.map(sanitizeMevoDocument),
      });
    }

    // Data endpoints (require auth)
    const authUser = await requireAuth(event);
    const targetUserId = resolveTargetUserId(authUser, event, body);

    if (method === 'POST' && path === '/saveAll') {
      const payload = body || {};

      for (const dataType of DATA_TYPES) {
        if (payload[dataType] !== undefined) {
          await upsertData(targetUserId, dataType, payload[dataType]);
        }
      }

      return jsonResponse(200, {
        success: true,
        message: 'All data saved successfully.',
      });
    }

    if (method === 'GET' && path === '/all') {
      const data = await loadAllData(targetUserId);
      return jsonResponse(200, {
        success: true,
        ...data,
      });
    }

    const saveMatch = path.match(/^\/(patients|prescriptions|appointments|medicalRecords)\/save$/);
    if (method === 'POST' && saveMatch) {
      const dataType = saveMatch[1];
      const payload = body.data !== undefined ? body.data : body;
      await upsertData(targetUserId, dataType, payload);

      return jsonResponse(200, {
        success: true,
        message: `${dataType} saved successfully.`,
      });
    }

    const getMatch = path.match(/^\/(patients|prescriptions|appointments|medicalRecords)$/);
    if (method === 'GET' && getMatch) {
      const dataType = getMatch[1];
      const payload = await loadDataType(targetUserId, dataType);

      return jsonResponse(200, {
        success: true,
        data: payload,
      });
    }

    return jsonResponse(404, {
      success: false,
      message: `Route not found: ${method} ${path}`,
    });
  } catch (error) {
    return jsonResponse(error.statusCode || 500, {
      success: false,
      code: error.code || 'server/error',
      message: error.message || 'Internal server error.',
    });
  }
};
