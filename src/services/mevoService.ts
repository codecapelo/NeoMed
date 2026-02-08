import { getAuthHeaders, getApiBaseUrl } from './authService';
import { Patient, Prescription } from '../types';

export type MevoDocumentType = 'prescription' | 'certificate';

export interface MevoDocumentRecord {
  id: string;
  userId: string;
  prescriptionId: string;
  patientId: string | null;
  documentType: MevoDocumentType;
  status: string;
  providerName: string;
  providerDocumentId: string | null;
  providerToken: string | null;
  errorMessage: string | null;
  providerPayload: Record<string, unknown>;
  rawResponse: unknown;
  createdAt: string;
  updatedAt: string;
}

interface EmitMevoDocumentPayload {
  documentType: MevoDocumentType;
  prescriptionId: string;
  patientId?: string;
  prescription: Partial<Prescription>;
  patient?: Partial<Patient>;
}

interface EmitMevoDocumentResponse {
  success: boolean;
  mode?: 'provider' | 'mock';
  code?: string;
  message?: string;
  document?: MevoDocumentRecord;
}

const parseApiError = async (response: Response): Promise<never> => {
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const error = new Error(payload?.message || `Request failed with status ${response.status}`) as Error & {
    code?: string;
    document?: MevoDocumentRecord;
  };

  error.code = payload?.code || undefined;
  error.document = payload?.document || undefined;
  throw error;
};

export const emitMevoDocument = async (payload: EmitMevoDocumentPayload): Promise<EmitMevoDocumentResponse> => {
  const response = await fetch(`${getApiBaseUrl()}/api/integrations/mevo/emit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  return response.json();
};

export const listMevoDocuments = async (
  prescriptionId?: string,
  documentType?: MevoDocumentType
): Promise<MevoDocumentRecord[]> => {
  const query = new URLSearchParams();
  if (prescriptionId) {
    query.set('prescriptionId', prescriptionId);
  }
  if (documentType) {
    query.set('documentType', documentType);
  }

  const querySuffix = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${getApiBaseUrl()}/api/integrations/mevo/documents${querySuffix}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    await parseApiError(response);
  }

  const payload = await response.json();
  return Array.isArray(payload.documents) ? (payload.documents as MevoDocumentRecord[]) : [];
};
