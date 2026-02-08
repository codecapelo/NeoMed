const { Pool } = require('pg');

const DATA_TYPES = ['patients', 'prescriptions', 'appointments', 'medicalRecords'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

let pool;
let schemaReadyPromise;

const getPool = () => {
  if (pool) {
    return pool;
  }

  const connectionString =
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'Database URL not found. Configure NETLIFY_DATABASE_URL or NETLIFY_DATABASE_URL_UNPOOLED in Netlify.'
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
        CREATE TABLE IF NOT EXISTS neomed_user_data (
          user_id TEXT NOT NULL,
          data_type TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '[]'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, data_type)
        );
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

const getUserId = (event, body) => {
  const queryUserId = event.queryStringParameters && event.queryStringParameters.userId;
  const headerUserId = event.headers && (event.headers['x-user-id'] || event.headers['X-User-Id']);

  return body.userId || queryUserId || headerUserId || null;
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

    const method = event.httpMethod;
    const path = normalizePath(event);
    const body = readJsonBody(event);
    const userId = getUserId(event, body);

    if (method === 'GET' && path === '/health') {
      return jsonResponse(200, { ok: true });
    }

    if (!userId) {
      return jsonResponse(400, {
        success: false,
        message: 'Missing userId. Send userId in body, query param or X-User-Id header.',
      });
    }

    if (method === 'POST' && path === '/saveAll') {
      const payload = body || {};

      for (const dataType of DATA_TYPES) {
        if (payload[dataType] !== undefined) {
          await upsertData(userId, dataType, payload[dataType]);
        }
      }

      return jsonResponse(200, {
        success: true,
        message: 'All data saved successfully.',
      });
    }

    if (method === 'GET' && path === '/all') {
      const data = await loadAllData(userId);
      return jsonResponse(200, {
        success: true,
        ...data,
      });
    }

    const saveMatch = path.match(/^\/(patients|prescriptions|appointments|medicalRecords)\/save$/);
    if (method === 'POST' && saveMatch) {
      const dataType = saveMatch[1];
      const payload = body.data !== undefined ? body.data : body;
      await upsertData(userId, dataType, payload);

      return jsonResponse(200, {
        success: true,
        message: `${dataType} saved successfully.`,
      });
    }

    const getMatch = path.match(/^\/(patients|prescriptions|appointments|medicalRecords)$/);
    if (method === 'GET' && getMatch) {
      const dataType = getMatch[1];
      const payload = await loadDataType(userId, dataType);

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
    return jsonResponse(500, {
      success: false,
      message: 'Internal server error.',
      error: error.message,
    });
  }
};
