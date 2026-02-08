export interface Patient {
  id: string;
  name: string;
  cpf?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  email: string;
  phone: string;
  address: string;
  healthInsurance?: string;
  bloodType?: string;
  medicalHistory?: string;
  allergies?: string[];
  medications?: string[];
  cid10Code?: string;
  cid10Description?: string;
}

export interface ICD11 {
  code: string;
  title: string;
  description: string;
  suggestedGuidelines?: {
    american?: string;
    brazilian?: string;
  };
}

export interface Prescription {
  id: string;
  patientId: string;
  date: string;
  medications: Medication[];
  instructions?: string;
  doctorNotes?: string;
  validUntil?: string;
  prescriptionChannel?: 'system' | 'mevo';
  mevoDocuments?: MevoDocumentStatus[];
  mevoDigitalPrescription?: MevoDigitalPrescriptionAttachment;
}

export interface MevoDigitalPrescriptionAttachment {
  token?: string;
  pdfName?: string;
  pdfMimeType?: string;
  pdfDataUrl?: string;
  uploadedAt?: string;
  extractedMedicationsCount?: number;
  extractionStatus?: 'success' | 'failed';
  extractionMessage?: string;
}

export interface MevoDocumentStatus {
  documentType: 'prescription' | 'certificate';
  status: string;
  providerName?: string;
  providerDocumentId?: string | null;
  providerToken?: string | null;
  errorMessage?: string | null;
  updatedAt?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  sideEffects?: string[];
  contraindications?: string[];
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  date?: string;
  symptoms?: string;
  diagnosis?: string;
  icd11Code?: string;
  treatment?: string;
  notes?: string;
  attachments?: string[];
  consultations?: MedicalConsultation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalConsultation {
  id: string;
  date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  vitals?: {
    bloodPressure?: string;
    heartRate?: string;
    temperature?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
  };
  examTexts?: string[];
  examAttachments?: MedicalExamAttachment[];
}

export interface MedicalExamAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
} 
