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
const LOCKED_ADMIN_EMAIL = String(process.env.NEOMED_ADMIN_EMAIL || 'admin@neomed.com').trim().toLowerCase();
const LOCKED_ADMIN_PASSWORD = String(process.env.NEOMED_ADMIN_PASSWORD || 'admin123');
const LOCKED_ADMIN_NAME = String(process.env.NEOMED_ADMIN_NAME || 'Administrador').trim();
const DEFAULT_MEVO_LOGIN_URL = 'https://receita.mevosaude.com.br';
const DEFAULT_MEVO_EMBED_URL = 'https://receita.mevosaude.com.br';
const DEFAULT_MEVO_BIRD_ID_AUTH_URL =
  'https://birdid-certificadodigital.com.br/?utm_source=birdid&utm_medium=birdid&utm_campaign=birdid&gad_source=1&gad_campaignid=22504060543&gbraid=0AAAAA_fzDabxDstFCrUKb_wWSc7srKVow&gclid=Cj0KCQiAhaHMBhD2ARIsAPAU_D4V4-EsbBH8bPgzzA49IcrviU-ZDzyjmvcrSoIDca2_OIK2Yj7Zv2EaAmEuEALw_wcB';
const DEFAULT_MEVO_VIDDAS_AUTH_URL =
  'https://validcertificadora.com.br/pages/certificado-em-nuvem/d36toyotas503341?utm_source=google&utm_medium=cpc&utm_campaign=%5BSearch%5D+%5BBrasil%5D+Certificado+Digital&utm_content=Certificado+Digital&utm_term=b_&gad_source=1&gad_campaignid=22325218706&gbraid=0AAAAADleBNm7VmqWk6O20qYtaRltq0XF_&gclid=Cj0KCQiAhaHMBhD2ARIsAPAU_D6it02PqENrLEPIoHiQsf5dij4kI8-GWeB6sEWFrsTDJFh_BKlKxUYaAteLEALw_wcB';
const DEFAULT_VIDEO_CALL_BASE_URL = 'https://meet.jit.si';

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
    process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
    process.env.NETLIFY_DATABASE_URL ||
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
          role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'patient')),
          doctor_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ
        );

        ALTER TABLE neomed_users
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

        ALTER TABLE neomed_users
        ADD COLUMN IF NOT EXISTS doctor_id TEXT;

        ALTER TABLE neomed_users
        DROP CONSTRAINT IF EXISTS neomed_users_role_check;

        ALTER TABLE neomed_users
        ADD CONSTRAINT neomed_users_role_check CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'patient'));

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

        CREATE TABLE IF NOT EXISTS neomed_emergency_requests (
          id TEXT PRIMARY KEY,
          patient_id TEXT NOT NULL REFERENCES neomed_users(id) ON DELETE CASCADE,
          doctor_id TEXT,
          patient_name TEXT NOT NULL,
          patient_email TEXT,
          patient_phone TEXT,
          message TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('open', 'resolved')) DEFAULT 'open',
          resolved_by TEXT,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_neomed_emergency_status
        ON neomed_emergency_requests (status);

        CREATE INDEX IF NOT EXISTS idx_neomed_emergency_patient_id
        ON neomed_emergency_requests (patient_id);

        ALTER TABLE neomed_emergency_requests
        ADD COLUMN IF NOT EXISTS attending_doctor_id TEXT;

        ALTER TABLE neomed_emergency_requests
        ADD COLUMN IF NOT EXISTS attending_doctor_name TEXT;

        ALTER TABLE neomed_emergency_requests
        ADD COLUMN IF NOT EXISTS attending_doctor_email TEXT;

        ALTER TABLE neomed_emergency_requests
        ADD COLUMN IF NOT EXISTS video_call_url TEXT;

        ALTER TABLE neomed_emergency_requests
        ADD COLUMN IF NOT EXISTS video_call_provider TEXT;

        ALTER TABLE neomed_emergency_requests
        ADD COLUMN IF NOT EXISTS video_call_started_at TIMESTAMPTZ;
      `)
      .catch((error) => {
        schemaReadyPromise = null;
        throw error;
      });
  }

  await schemaReadyPromise;
};

const ensureLockedAdminAccount = async () => {
  const db = getPool();
  const expectedName = LOCKED_ADMIN_NAME || LOCKED_ADMIN_EMAIL.split('@')[0];

  const existingResult = await db.query(
    `
      SELECT id, email, name, role, doctor_id, password_hash, created_at, last_seen_at
      FROM neomed_users
      WHERE email = $1
      LIMIT 1;
    `,
    [LOCKED_ADMIN_EMAIL]
  );

  if (!existingResult.rows[0]) {
    const passwordHash = await bcrypt.hash(LOCKED_ADMIN_PASSWORD, 10);
    await db.query(
      `
        INSERT INTO neomed_users (id, email, password_hash, name, role, doctor_id, last_seen_at)
        VALUES ($1, $2, $3, $4, 'admin', NULL, NOW());
      `,
      [randomUUID(), LOCKED_ADMIN_EMAIL, passwordHash, expectedName]
    );
    return;
  }

  const user = existingResult.rows[0];
  const passwordMatches = user.password_hash ? await bcrypt.compare(LOCKED_ADMIN_PASSWORD, user.password_hash) : false;
  const shouldUpdate =
    user.role !== 'admin' ||
    !!user.doctor_id ||
    !passwordMatches ||
    !String(user.name || '').trim();

  if (shouldUpdate) {
    const passwordHash = passwordMatches ? user.password_hash : await bcrypt.hash(LOCKED_ADMIN_PASSWORD, 10);
    await db.query(
      `
        UPDATE neomed_users
        SET role = 'admin',
            doctor_id = NULL,
            name = $2,
            password_hash = $3,
            last_seen_at = COALESCE(last_seen_at, NOW())
        WHERE id = $1;
      `,
      [user.id, String(user.name || '').trim() || expectedName, passwordHash]
    );
  }

  await db.query(
    `
      UPDATE neomed_users
      SET role = 'doctor',
          doctor_id = NULL
      WHERE role = 'admin' AND LOWER(email) <> $1;
    `,
    [LOCKED_ADMIN_EMAIL]
  );
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

const sanitizeDoctorForSignup = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
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
      RETURNING id, email, name, role, doctor_id, created_at, last_seen_at;
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
    `SELECT id, email, name, role, doctor_id, created_at, last_seen_at FROM neomed_users WHERE id = $1 LIMIT 1;`,
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

const isPatientUser = (user) => String(user?.role || '').toLowerCase() === 'patient';

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

const upsertLinkedPatientForDoctor = async ({ doctorId, patientProfile }) => {
  const existingPatients = await loadDataType(doctorId, 'patients');
  const patientList = Array.isArray(existingPatients) ? [...existingPatients] : [];
  const cpfDigits = onlyDigits(patientProfile.cpf || '');

  const existingIndex = patientList.findIndex((patient) => {
    if (!patient || typeof patient !== 'object') {
      return false;
    }

    if (String(patient.id || '') === patientProfile.id || String(patient.linkedUserId || '') === patientProfile.linkedUserId) {
      return true;
    }

    return cpfDigits && onlyDigits(patient.cpf || '') === cpfDigits;
  });

  if (existingIndex >= 0) {
    patientList[existingIndex] = {
      ...patientList[existingIndex],
      ...patientProfile,
      id: patientList[existingIndex].id || patientProfile.id,
      linkedUserId: patientProfile.linkedUserId,
      updatedAt: new Date().toISOString(),
    };
  } else {
    patientList.push(patientProfile);
  }

  await upsertData(doctorId, 'patients', patientList);
};

const findLinkedPatientProfile = (doctorData, authUser) => {
  const doctorPatients = Array.isArray(doctorData?.patients) ? doctorData.patients : [];
  const patientId = String(authUser.id || '');
  const patientEmail = String(authUser.email || '').toLowerCase();

  return (
    doctorPatients.find((patient) => {
      if (!patient || typeof patient !== 'object') {
        return false;
      }

      if (String(patient.id || '') === patientId || String(patient.linkedUserId || '') === patientId) {
        return true;
      }

      return patientEmail && String(patient.email || '').toLowerCase() === patientEmail;
    }) || null
  );
};

const buildPatientScopedData = async (authUser) => {
  const doctorId = String(authUser?.doctor_id || authUser?.doctorId || '').trim();
  if (!doctorId) {
    return {
      patients: [],
      prescriptions: [],
      appointments: [],
      medicalRecords: [],
    };
  }

  const doctorData = await loadAllData(doctorId);
  const patientId = String(authUser.id);
  const patientEmail = String(authUser.email || '').toLowerCase();
  const doctorPatients = Array.isArray(doctorData.patients) ? doctorData.patients : [];
  const doctorPrescriptions = Array.isArray(doctorData.prescriptions) ? doctorData.prescriptions : [];
  const doctorAppointments = Array.isArray(doctorData.appointments) ? doctorData.appointments : [];

  const patients = doctorPatients.filter((patient) => {
    if (!patient || typeof patient !== 'object') {
      return false;
    }

    if (String(patient.id || '') === patientId || String(patient.linkedUserId || '') === patientId) {
      return true;
    }

    return patientEmail && String(patient.email || '').toLowerCase() === patientEmail;
  });

  const prescriptions = doctorPrescriptions.filter((prescription) => {
    if (!prescription || typeof prescription !== 'object') {
      return false;
    }

    return String(prescription.patientId || '') === patientId;
  });

  const appointments = doctorAppointments.filter((appointment) => {
    if (!appointment || typeof appointment !== 'object') {
      return false;
    }

    return String(appointment.patientId || '') === patientId;
  });

  return {
    patients,
    prescriptions,
    appointments,
    medicalRecords: [],
  };
};

const createEmergencyRequest = async ({ patientId, doctorId, patientName, patientEmail, patientPhone, message }) => {
  const db = getPool();
  const now = new Date().toISOString();

  const existingResult = await db.query(
    `
      SELECT id, created_at
      FROM neomed_emergency_requests
      WHERE patient_id = $1 AND status = 'open'
      LIMIT 1;
    `,
    [patientId]
  );

  if (existingResult.rows[0]) {
    const existing = existingResult.rows[0];
    const updateResult = await db.query(
      `
        UPDATE neomed_emergency_requests
        SET doctor_id = $2,
            patient_name = $3,
            patient_email = $4,
            patient_phone = $5,
            message = $6,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [existing.id, doctorId || null, patientName, patientEmail || null, patientPhone || null, message]
    );

    return updateResult.rows[0];
  }

  const insertResult = await db.query(
    `
      INSERT INTO neomed_emergency_requests (
        id,
        patient_id,
        doctor_id,
        patient_name,
        patient_email,
        patient_phone,
        attending_doctor_id,
        attending_doctor_name,
        attending_doctor_email,
        video_call_url,
        video_call_provider,
        video_call_started_at,
        message,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL, NULL, NULL, NULL, NULL, $7, 'open', NOW(), NOW())
      RETURNING *;
    `,
    [randomUUID(), patientId, doctorId || null, patientName, patientEmail || null, patientPhone || null, message]
  );

  return insertResult.rows[0];
};

const listActiveEmergencyRequests = async () => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT
        er.*,
        u.last_seen_at AS patient_last_seen_at,
        (COALESCE(u.last_seen_at, '1970-01-01'::timestamptz) >= NOW() - INTERVAL '${ONLINE_WINDOW_SECONDS} seconds') AS patient_online
      FROM neomed_emergency_requests er
      JOIN neomed_users u ON u.id = er.patient_id
      WHERE er.status = 'open'
      ORDER BY er.updated_at DESC;
    `
  );

  return result.rows
    .filter((row) => Boolean(row.patient_online))
    .map((row) => ({
      id: row.id,
      patientId: row.patient_id,
      patientName: row.patient_name,
      patientEmail: row.patient_email,
      patientPhone: row.patient_phone,
      doctorId: row.doctor_id,
      attendingDoctorId: row.attending_doctor_id || null,
      attendingDoctorName: row.attending_doctor_name || null,
      attendingDoctorEmail: row.attending_doctor_email || null,
      videoCallUrl: row.video_call_url || null,
      videoCallProvider: row.video_call_provider || null,
      videoCallStartedAt: row.video_call_started_at || null,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isPatientOnline: Boolean(row.patient_online),
      patientLastSeenAt: row.patient_last_seen_at || null,
    }));
};

const getLatestEmergencyRequestByPatient = async ({ patientId }) => {
  const db = getPool();
  const result = await db.query(
    `
      SELECT *
      FROM neomed_emergency_requests
      WHERE patient_id = $1
      ORDER BY
        CASE WHEN status = 'open' THEN 0 ELSE 1 END ASC,
        updated_at DESC
      LIMIT 1;
    `,
    [patientId]
  );

  return result.rows[0] || null;
};

const startEmergencyVideoCall = async ({ requestId, doctorUser, callUrl }) => {
  const db = getPool();
  const currentResult = await db.query(
    `
      SELECT *
      FROM neomed_emergency_requests
      WHERE id = $1
      LIMIT 1;
    `,
    [requestId]
  );

  const current = currentResult.rows[0];
  if (!current) {
    return null;
  }

  if (String(current.status || '') === 'resolved') {
    throw appError(400, 'doctor/emergency-already-resolved', 'Emergency request is already resolved.');
  }

  const videoCallUrl = String(callUrl || '').trim() || current.video_call_url || buildEmergencyVideoCallUrl(requestId);

  const updateResult = await db.query(
    `
      UPDATE neomed_emergency_requests
      SET attending_doctor_id = $2,
          attending_doctor_name = $3,
          attending_doctor_email = $4,
          video_call_url = $5,
          video_call_provider = 'meet',
          video_call_started_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [requestId, doctorUser.id, doctorUser.name || doctorUser.email || 'Medico', doctorUser.email || null, videoCallUrl]
  );

  return updateResult.rows[0] || null;
};

const resolveEmergencyRequest = async ({ requestId, resolvedBy }) => {
  const db = getPool();
  const result = await db.query(
    `
      UPDATE neomed_emergency_requests
      SET status = 'resolved',
          resolved_by = $2,
          resolved_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    [requestId, resolvedBy]
  );

  return result.rows[0] || null;
};

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);
const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
const isDoctorRole = (role) => ['admin', 'doctor'].includes(String(role || '').toLowerCase());
const normalizeGender = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['male', 'female', 'other'].includes(normalized)) {
    return normalized;
  }
  return 'other';
};
const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcDigit = (base, factor) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor;
      factor -= 1;
    }
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const digit1 = calcDigit(cpf.slice(0, 9), 10);
  const digit2 = calcDigit(cpf.slice(0, 10), 11);
  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
};
const isValidMevoDocumentType = (documentType) => ['prescription', 'certificate'].includes(documentType);
const isValidMevoSignatureProvider = (provider) => ['bird_id', 'viddas'].includes(provider);

const buildPatientProfileFromPayload = ({ profile, fallbackName, fallbackEmail, linkedUserId }) => {
  const safeProfile = profile && typeof profile === 'object' ? profile : {};
  const dateOfBirth = String(safeProfile.dateOfBirth || safeProfile.birthDate || '').trim();
  const cpf = String(safeProfile.cpf || '').trim();
  const phone = String(safeProfile.phone || '').trim();

  return {
    id: linkedUserId,
    linkedUserId,
    name: String(safeProfile.name || fallbackName || '').trim(),
    cpf,
    email: String(safeProfile.email || fallbackEmail || '').trim(),
    phone,
    dateOfBirth,
    birthDate: dateOfBirth,
    gender: normalizeGender(safeProfile.gender),
    address: String(safeProfile.address || '').trim(),
    healthInsurance: String(safeProfile.healthInsurance || '').trim(),
    bloodType: String(safeProfile.bloodType || '').trim(),
    medicalHistory: String(safeProfile.medicalHistory || '').trim(),
    allergies: Array.isArray(safeProfile.allergies) ? safeProfile.allergies : [],
    medications: Array.isArray(safeProfile.medications) ? safeProfile.medications : [],
    cid10Code: String(safeProfile.cid10Code || '').trim(),
    cid10Description: String(safeProfile.cid10Description || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const getMevoSignatureProviderLabel = (provider) => (provider === 'bird_id' ? 'Bird ID' : 'Viddas');

const getMevoSignatureEmbedUrl = (provider) => {
  if (provider === 'bird_id') {
    return process.env.MEVO_BIRD_ID_EMBED_URL || process.env.MEVO_SIGNATURE_BIRD_ID_EMBED_URL || DEFAULT_MEVO_EMBED_URL;
  }

  return process.env.MEVO_VIDDAS_EMBED_URL || process.env.MEVO_SIGNATURE_VIDDAS_EMBED_URL || DEFAULT_MEVO_EMBED_URL;
};

const getMevoSignatureCallbackUrl = (provider) => {
  if (provider === 'bird_id') {
    return process.env.MEVO_BIRD_ID_CALLBACK_URL || process.env.MEVO_SIGNATURE_BIRD_ID_CALLBACK_URL || '';
  }

  return process.env.MEVO_VIDDAS_CALLBACK_URL || process.env.MEVO_SIGNATURE_VIDDAS_CALLBACK_URL || '';
};

const getMevoSignatureAuthUrl = (provider) => {
  if (provider === 'bird_id') {
    return process.env.MEVO_BIRD_ID_AUTH_URL || process.env.MEVO_BIRD_ID_URL || DEFAULT_MEVO_BIRD_ID_AUTH_URL;
  }

  return process.env.MEVO_VIDDAS_AUTH_URL || process.env.MEVO_VIDDAS_URL || DEFAULT_MEVO_VIDDAS_AUTH_URL;
};

const getMevoLoginUrl = () => process.env.MEVO_LOGIN_URL || DEFAULT_MEVO_LOGIN_URL;
const getVideoCallBaseUrl = () => String(process.env.NEOMED_VIDEO_CALL_BASE_URL || DEFAULT_VIDEO_CALL_BASE_URL).trim();

const buildEmergencyCallRoom = (requestId) => {
  const safeRequestId = String(requestId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '');
  return `neomed-emergencia-${safeRequestId || Date.now()}`;
};

const buildEmergencyVideoCallUrl = (requestId) => {
  const baseUrl = getVideoCallBaseUrl();
  const roomName = buildEmergencyCallRoom(requestId);

  if (!baseUrl) {
    return `https://meet.jit.si/${roomName}`;
  }

  if (baseUrl.includes('{room}')) {
    return baseUrl.replace('{room}', encodeURIComponent(roomName));
  }

  return `${baseUrl.replace(/\/+$/, '')}/${encodeURIComponent(roomName)}`;
};

const buildPatientProfileFromEmergencyRequest = ({ request, patientUser, existingProfile }) => {
  const now = new Date().toISOString();
  const mergedDate = existingProfile?.dateOfBirth || existingProfile?.birthDate || '';
  const mergedPhone = String(existingProfile?.phone || request?.patient_phone || '').trim();
  const mergedEmail = String(existingProfile?.email || request?.patient_email || patientUser?.email || '').trim();
  const mergedName = String(existingProfile?.name || request?.patient_name || patientUser?.name || 'Paciente').trim();

  return {
    id: String(existingProfile?.id || request?.patient_id || patientUser?.id || '').trim(),
    linkedUserId: String(existingProfile?.linkedUserId || request?.patient_id || patientUser?.id || '').trim(),
    name: mergedName,
    cpf: String(existingProfile?.cpf || '').trim(),
    email: mergedEmail,
    phone: mergedPhone,
    dateOfBirth: mergedDate,
    birthDate: mergedDate,
    gender: normalizeGender(existingProfile?.gender),
    address: String(existingProfile?.address || '').trim(),
    healthInsurance: String(existingProfile?.healthInsurance || '').trim(),
    bloodType: String(existingProfile?.bloodType || '').trim(),
    medicalHistory: String(existingProfile?.medicalHistory || '').trim(),
    allergies: Array.isArray(existingProfile?.allergies) ? existingProfile.allergies : [],
    medications: Array.isArray(existingProfile?.medications) ? existingProfile.medications : [],
    cid10Code: String(existingProfile?.cid10Code || '').trim(),
    cid10Description: String(existingProfile?.cid10Description || '').trim(),
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
  };
};

const createMevoSignatureSession = ({ provider }) => {
  const authUrl = getMevoSignatureAuthUrl(provider);
  const loginUrl = getMevoLoginUrl();
  const embedUrl = getMevoSignatureEmbedUrl(provider) || process.env.MEVO_EMBED_URL || '';
  const callbackUrl = getMevoSignatureCallbackUrl(provider) || process.env.MEVO_SIGNATURE_CALLBACK_URL || '';
  const mode = authUrl || loginUrl || embedUrl ? 'provider' : 'mock';
  const authenticated = mode === 'provider';
  const providerLabel = getMevoSignatureProviderLabel(provider);

  return {
    provider,
    authenticated,
    mode,
    message:
      mode === 'provider'
        ? `Assinatura digital ${providerLabel} autenticada com sucesso.`
        : `Integração ${providerLabel} não configurada. Defina as URLs da Mevo, Bird ID e/ou Viddas.`,
    signatureId: `${provider}_${randomUUID()}`,
    authUrl: authUrl || null,
    loginUrl: loginUrl || null,
    embedUrl: embedUrl || null,
    callbackUrl: callbackUrl || null,
    createdAt: new Date().toISOString(),
  };
};

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
    await ensureLockedAdminAccount();

    const db = getPool();
    const method = event.httpMethod;
    const path = normalizePath(event);
    const body = readJsonBody(event);

    if (method === 'GET' && path === '/health') {
      return jsonResponse(200, { ok: true });
    }

    if (method === 'GET' && path === '/public/doctors') {
      const doctorsResult = await db.query(
        `
          SELECT id, email, name, role
          FROM neomed_users
          WHERE role IN ('admin', 'doctor')
          ORDER BY name ASC;
        `
      );

      return jsonResponse(200, {
        success: true,
        doctors: doctorsResult.rows.map(sanitizeDoctorForSignup),
      });
    }

    if (method === 'POST' && path === '/auth/register') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.name || '').trim();
      const requestedRole = String(body.role || 'doctor')
        .trim()
        .toLowerCase();
      const doctorId = String(body.doctorId || '').trim();
      const patientProfilePayload = body.patientProfile;

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
      const shouldCreatePatient = usersCount > 0 && requestedRole === 'patient';

      let targetDoctor = null;
      if (shouldCreatePatient) {
        if (!doctorId) {
          throw appError(400, 'auth/doctor-required', 'doctorId is required for patient registrations.');
        }

        const doctorResult = await db.query(
          `
            SELECT id, email, name, role
            FROM neomed_users
            WHERE id = $1 AND role IN ('admin', 'doctor')
            LIMIT 1;
          `,
          [doctorId]
        );

        targetDoctor = doctorResult.rows[0] || null;
        if (!targetDoctor || !isDoctorRole(targetDoctor.role)) {
          throw appError(404, 'auth/doctor-not-found', 'Selected doctor was not found or is not allowed.');
        }
      }

      const patientProfile = shouldCreatePatient
        ? buildPatientProfileFromPayload({
            profile: patientProfilePayload,
            fallbackName: displayName || email.split('@')[0],
            fallbackEmail: email,
            linkedUserId: randomUUID(),
          })
        : null;

      if (shouldCreatePatient) {
        if (!patientProfile.name) {
          throw appError(400, 'auth/invalid-patient-name', 'Patient name is required.');
        }

        if (!patientProfile.cpf) {
          throw appError(400, 'auth/invalid-cpf', 'Patient CPF is required.');
        }

        if (!isValidCpf(patientProfile.cpf)) {
          throw appError(400, 'auth/invalid-cpf', 'Patient CPF is invalid.');
        }

        if (!patientProfile.phone) {
          throw appError(400, 'auth/invalid-phone', 'Patient phone is required.');
        }

        if (!patientProfile.dateOfBirth) {
          throw appError(400, 'auth/invalid-date-of-birth', 'Patient date of birth is required.');
        }
      }

      const role = usersCount === 0 ? 'admin' : shouldCreatePatient ? 'patient' : 'doctor';
      const id = shouldCreatePatient && patientProfile ? patientProfile.linkedUserId : randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);

      const insertResult = await db.query(
        `
          INSERT INTO neomed_users (id, email, password_hash, name, role, doctor_id, last_seen_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING id, email, name, role, created_at, last_seen_at;
        `,
        [id, email, passwordHash, displayName || email.split('@')[0], role, shouldCreatePatient ? doctorId : null]
      );

      const user = insertResult.rows[0];

      if (shouldCreatePatient && targetDoctor && patientProfile) {
        await upsertLinkedPatientForDoctor({
          doctorId: targetDoctor.id,
          patientProfile,
        });
      }

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

    if (method === 'POST' && path === '/integrations/mevo/signature/session') {
      const authUser = await requireAuth(event);
      resolveTargetUserId(authUser, event, body);
      const provider = String(body.provider || '').trim().toLowerCase();

      if (!isValidMevoSignatureProvider(provider)) {
        throw appError(
          400,
          'integration/mevo-invalid-signature-provider',
          'provider must be "bird_id" or "viddas".'
        );
      }

      const session = createMevoSignatureSession({ provider });
      return jsonResponse(200, {
        success: true,
        session,
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

    if (method === 'POST' && path === '/patient/appointments/request') {
      const authUser = await requireAuth(event);
      if (!isPatientUser(authUser)) {
        throw appError(403, 'auth/forbidden', 'Only patients can request appointments from this endpoint.');
      }

      const doctorId = String(authUser.doctor_id || authUser.doctorId || '').trim();
      if (!doctorId) {
        throw appError(400, 'patient/doctor-not-linked', 'Patient account is not linked to a doctor.');
      }

      const date = String(body.date || '').trim();
      const time = String(body.time || '').trim();
      const notes = String(body.notes || '').trim();
      const reason = String(body.reason || 'Consulta solicitada pelo paciente').trim();

      if (!date || !time) {
        throw appError(400, 'patient/invalid-appointment', 'date and time are required.');
      }

      const doctorResult = await db.query(
        `
          SELECT id, email, name, role
          FROM neomed_users
          WHERE id = $1 AND role IN ('admin', 'doctor')
          LIMIT 1;
        `,
        [doctorId]
      );

      if (!doctorResult.rows[0]) {
        throw appError(404, 'patient/doctor-not-found', 'Linked doctor was not found.');
      }

      const doctorData = await loadAllData(doctorId);
      const linkedPatient = findLinkedPatientProfile(doctorData, authUser);
      const doctorAppointments = Array.isArray(doctorData.appointments) ? [...doctorData.appointments] : [];

      const appointment = {
        id: `apt_${randomUUID()}`,
        patientId: authUser.id,
        date,
        time,
        status: 'scheduled',
        reason,
        notes,
        requestedAt: new Date().toISOString(),
        requestedByPatient: true,
        patientName: linkedPatient?.name || authUser.name || authUser.email || 'Paciente',
        patientEmail: authUser.email || '',
        source: 'patient_portal',
      };

      doctorAppointments.push(appointment);
      await upsertData(doctorId, 'appointments', doctorAppointments);

      return jsonResponse(201, {
        success: true,
        appointment,
        doctor: sanitizeDoctorForSignup(doctorResult.rows[0]),
      });
    }

    if (method === 'POST' && path === '/patient/emergency/request') {
      const authUser = await requireAuth(event);
      if (!isPatientUser(authUser)) {
        throw appError(403, 'auth/forbidden', 'Only patients can request emergency support.');
      }

      const doctorId = String(authUser.doctor_id || authUser.doctorId || '').trim();
      if (!doctorId) {
        throw appError(400, 'patient/doctor-not-linked', 'Patient account is not linked to a doctor.');
      }

      const message = String(body.message || '').trim() || 'Paciente solicitou atendimento de emergencia.';
      const doctorData = await loadAllData(doctorId);
      const linkedPatient = findLinkedPatientProfile(doctorData, authUser);

      const request = await createEmergencyRequest({
        patientId: authUser.id,
        doctorId,
        patientName: linkedPatient?.name || authUser.name || authUser.email || 'Paciente',
        patientEmail: authUser.email || '',
        patientPhone: String(linkedPatient?.phone || '').trim(),
        message,
      });

      return jsonResponse(200, {
        success: true,
        request: {
          id: request.id,
          patientId: request.patient_id,
          patientName: request.patient_name,
          patientEmail: request.patient_email,
          patientPhone: request.patient_phone,
          doctorId: request.doctor_id,
          attendingDoctorId: request.attending_doctor_id || null,
          attendingDoctorName: request.attending_doctor_name || null,
          attendingDoctorEmail: request.attending_doctor_email || null,
          videoCallUrl: request.video_call_url || null,
          videoCallProvider: request.video_call_provider || null,
          videoCallStartedAt: request.video_call_started_at || null,
          message: request.message,
          status: request.status,
          createdAt: request.created_at,
          updatedAt: request.updated_at,
        },
      });
    }

    if (method === 'GET' && path === '/patient/emergency/latest') {
      const authUser = await requireAuth(event);
      if (!isPatientUser(authUser)) {
        throw appError(403, 'auth/forbidden', 'Only patients can access this endpoint.');
      }

      const latest = await getLatestEmergencyRequestByPatient({ patientId: authUser.id });
      if (!latest) {
        return jsonResponse(200, { success: true, request: null });
      }

      return jsonResponse(200, {
        success: true,
        request: {
          id: latest.id,
          patientId: latest.patient_id,
          patientName: latest.patient_name,
          patientEmail: latest.patient_email,
          patientPhone: latest.patient_phone,
          doctorId: latest.doctor_id,
          attendingDoctorId: latest.attending_doctor_id || null,
          attendingDoctorName: latest.attending_doctor_name || null,
          attendingDoctorEmail: latest.attending_doctor_email || null,
          videoCallUrl: latest.video_call_url || null,
          videoCallProvider: latest.video_call_provider || null,
          videoCallStartedAt: latest.video_call_started_at || null,
          message: latest.message,
          status: latest.status,
          createdAt: latest.created_at,
          updatedAt: latest.updated_at,
          resolvedAt: latest.resolved_at || null,
          resolvedBy: latest.resolved_by || null,
        },
      });
    }

    if (method === 'GET' && path === '/doctor/emergency/requests') {
      const authUser = await requireAuth(event);
      if (!isDoctorRole(authUser.role)) {
        throw appError(403, 'auth/forbidden', 'Only doctors and admins can view emergency requests.');
      }

      const requests = await listActiveEmergencyRequests();
      return jsonResponse(200, {
        success: true,
        requests,
      });
    }

    const startVideoMatch = path.match(/^\/doctor\/emergency\/([^/]+)\/start-video$/);
    if (method === 'POST' && startVideoMatch) {
      const authUser = await requireAuth(event);
      if (!isDoctorRole(authUser.role)) {
        throw appError(403, 'auth/forbidden', 'Only doctors and admins can start emergency video calls.');
      }

      const requestId = String(startVideoMatch[1] || '').trim();
      if (!requestId) {
        throw appError(400, 'doctor/invalid-emergency-request', 'requestId is required.');
      }

      const started = await startEmergencyVideoCall({
        requestId,
        doctorUser: authUser,
        callUrl: body.callUrl ? String(body.callUrl) : '',
      });

      if (!started) {
        throw appError(404, 'doctor/emergency-request-not-found', 'Emergency request not found.');
      }

      const patientResult = await db.query(
        `
          SELECT id, email, name
          FROM neomed_users
          WHERE id = $1
          LIMIT 1;
        `,
        [started.patient_id]
      );
      const patientUser = patientResult.rows[0] || null;

      const attendingDoctorData = await loadAllData(authUser.id);
      const sourceDoctorData = started.doctor_id ? await loadAllData(started.doctor_id) : { patients: [] };
      const patientLookupAuth = {
        id: started.patient_id,
        email: started.patient_email || patientUser?.email || '',
      };

      const existingInAttending = findLinkedPatientProfile(attendingDoctorData, patientLookupAuth);
      const existingInSource = findLinkedPatientProfile(sourceDoctorData, patientLookupAuth);
      const profileToLink = buildPatientProfileFromEmergencyRequest({
        request: started,
        patientUser,
        existingProfile: existingInAttending || existingInSource,
      });

      await upsertLinkedPatientForDoctor({
        doctorId: authUser.id,
        patientProfile: profileToLink,
      });

      return jsonResponse(200, {
        success: true,
        request: {
          id: started.id,
          patientId: started.patient_id,
          patientName: started.patient_name,
          patientEmail: started.patient_email,
          patientPhone: started.patient_phone,
          doctorId: started.doctor_id,
          attendingDoctorId: started.attending_doctor_id || null,
          attendingDoctorName: started.attending_doctor_name || null,
          attendingDoctorEmail: started.attending_doctor_email || null,
          videoCallUrl: started.video_call_url || null,
          videoCallProvider: started.video_call_provider || null,
          videoCallStartedAt: started.video_call_started_at || null,
          message: started.message,
          status: started.status,
          createdAt: started.created_at,
          updatedAt: started.updated_at,
        },
      });
    }

    const resolveEmergencyMatch = path.match(/^\/doctor\/emergency\/([^/]+)\/resolve$/);
    if (method === 'POST' && resolveEmergencyMatch) {
      const authUser = await requireAuth(event);
      if (!isDoctorRole(authUser.role)) {
        throw appError(403, 'auth/forbidden', 'Only doctors and admins can resolve emergency requests.');
      }

      const requestId = String(resolveEmergencyMatch[1] || '').trim();
      if (!requestId) {
        throw appError(400, 'doctor/invalid-emergency-request', 'requestId is required.');
      }

      const resolved = await resolveEmergencyRequest({ requestId, resolvedBy: authUser.id });
      if (!resolved) {
        throw appError(404, 'doctor/emergency-request-not-found', 'Emergency request not found.');
      }

      return jsonResponse(200, {
        success: true,
        request: {
          id: resolved.id,
          patientId: resolved.patient_id,
          patientName: resolved.patient_name,
          patientEmail: resolved.patient_email,
          patientPhone: resolved.patient_phone,
          doctorId: resolved.doctor_id,
          attendingDoctorId: resolved.attending_doctor_id || null,
          attendingDoctorName: resolved.attending_doctor_name || null,
          attendingDoctorEmail: resolved.attending_doctor_email || null,
          videoCallUrl: resolved.video_call_url || null,
          videoCallProvider: resolved.video_call_provider || null,
          videoCallStartedAt: resolved.video_call_started_at || null,
          message: resolved.message,
          status: resolved.status,
          createdAt: resolved.created_at,
          updatedAt: resolved.updated_at,
          resolvedAt: resolved.resolved_at,
          resolvedBy: resolved.resolved_by,
        },
      });
    }

    // Data endpoints (require auth)
    const authUser = await requireAuth(event);

    if (method === 'POST' && path === '/saveAll') {
      if (isPatientUser(authUser)) {
        throw appError(403, 'auth/patient-readonly', 'Patients cannot modify global clinic data.');
      }

      const targetUserId = resolveTargetUserId(authUser, event, body);
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
      const data = isPatientUser(authUser) ? await buildPatientScopedData(authUser) : await loadAllData(resolveTargetUserId(authUser, event, body));
      return jsonResponse(200, {
        success: true,
        ...data,
      });
    }

    const saveMatch = path.match(/^\/(patients|prescriptions|appointments|medicalRecords)\/save$/);
    if (method === 'POST' && saveMatch) {
      if (isPatientUser(authUser)) {
        throw appError(403, 'auth/patient-readonly', 'Patients cannot modify global clinic data.');
      }

      const dataType = saveMatch[1];
      const payload = body.data !== undefined ? body.data : body;
      const targetUserId = resolveTargetUserId(authUser, event, body);
      await upsertData(targetUserId, dataType, payload);

      return jsonResponse(200, {
        success: true,
        message: `${dataType} saved successfully.`,
      });
    }

    const getMatch = path.match(/^\/(patients|prescriptions|appointments|medicalRecords)$/);
    if (method === 'GET' && getMatch) {
      const dataType = getMatch[1];
      const payload = isPatientUser(authUser)
        ? (await buildPatientScopedData(authUser))[dataType] || []
        : await loadDataType(resolveTargetUserId(authUser, event, body), dataType);

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
