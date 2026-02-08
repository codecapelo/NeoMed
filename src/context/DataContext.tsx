import React, {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { useAuth } from './AuthContext';

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  [key: string]: any;
}

interface Prescription {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  observations?: string;
  [key: string]: any;
}

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  [key: string]: any;
}

interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  notes?: string;
  [key: string]: any;
}

interface DataContextType {
  patients: Patient[];
  addPatient: (patient: Patient) => void;
  updatePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;

  prescriptions: Prescription[];
  addPrescription: (prescription: Omit<Prescription, 'id'>) => void;
  updatePrescription: (id: string, prescription: Partial<Prescription>) => void;
  deletePrescription: (id: string) => void;
  getPatientPrescriptions: (patientId: string) => Prescription[];

  appointments: Appointment[];
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getPatientAppointments: (patientId: string) => Appointment[];

  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => void;
  updateMedicalRecord: (id: string, record: Partial<MedicalRecord>) => void;
  deleteMedicalRecord: (id: string) => void;
  getPatientMedicalRecords: (patientId: string) => MedicalRecord[];
}

const DataContext = createContext<DataContextType | null>(null);

const getApiBase = () => {
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }

  return '';
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
}

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [patients, setPatients] = usePersistentState<Patient[]>('patients', []);
  const [prescriptions, setPrescriptions] = usePersistentState<Prescription[]>('prescriptions', []);
  const [appointments, setAppointments] = usePersistentState<Appointment[]>('appointments', []);
  const [medicalRecords, setMedicalRecords] = usePersistentState<MedicalRecord[]>('medicalRecords', []);

  const [isHydratedFromServer, setIsHydratedFromServer] = useState(false);
  const skipNextServerSync = useRef(true);

  const { currentUser } = useAuth();
  const apiBase = useMemo(() => getApiBase(), []);

  const userId = useMemo(() => {
    if (!currentUser || typeof currentUser !== 'object') {
      return null;
    }

    if ('uid' in currentUser && currentUser.uid) {
      return String(currentUser.uid);
    }

    return null;
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async () => {
      skipNextServerSync.current = true;
      setIsHydratedFromServer(false);

      if (!userId) {
        if (!cancelled) {
          setIsHydratedFromServer(true);
        }
        return;
      }

      try {
        const response = await fetch(`${apiBase}/api/all?userId=${encodeURIComponent(userId)}`);
        if (!response.ok) {
          throw new Error(`Failed to load remote data: ${response.status}`);
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setPatients(Array.isArray(payload.patients) ? payload.patients : []);
        setPrescriptions(Array.isArray(payload.prescriptions) ? payload.prescriptions : []);
        setAppointments(Array.isArray(payload.appointments) ? payload.appointments : []);
        setMedicalRecords(Array.isArray(payload.medicalRecords) ? payload.medicalRecords : []);
      } catch {
        // Keep local persisted values when server is unavailable.
      } finally {
        if (!cancelled) {
          setIsHydratedFromServer(true);
        }
      }
    };

    hydrateFromServer();

    return () => {
      cancelled = true;
    };
  }, [apiBase, userId, setAppointments, setMedicalRecords, setPatients, setPrescriptions]);

  useEffect(() => {
    if (!userId || !isHydratedFromServer) {
      return;
    }

    if (skipNextServerSync.current) {
      skipNextServerSync.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        await fetch(`${apiBase}/api/saveAll`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            patients,
            prescriptions,
            appointments,
            medicalRecords,
          }),
        });
      } catch {
        // Local persistence still works even if remote sync fails.
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [
    apiBase,
    userId,
    isHydratedFromServer,
    patients,
    prescriptions,
    appointments,
    medicalRecords,
  ]);

  const addPatient = useCallback(
    (patientData: Patient) => {
      const newPatient: Patient = {
        ...patientData,
        id: patientData.id || generateId(),
      };
      setPatients((prev) => [...prev, newPatient]);
    },
    [setPatients]
  );

  const updatePatient = useCallback(
    (updatedPatient: Patient) => {
      setPatients((prev) => prev.map((patient) => (patient.id === updatedPatient.id ? updatedPatient : patient)));
    },
    [setPatients]
  );

  const deletePatient = useCallback(
    (id: string) => {
      setPatients((prev) => prev.filter((patient) => patient.id !== id));
    },
    [setPatients]
  );

  const getPatient = useCallback(
    (id: string) => patients.find((patient) => patient.id === id),
    [patients]
  );

  const addPrescription = useCallback(
    (prescriptionData: Omit<Prescription, 'id'>) => {
      const newPrescription = {
        ...prescriptionData,
        id: generateId(),
      } as Prescription;
      setPrescriptions((prev) => [...prev, newPrescription]);
    },
    [setPrescriptions]
  );

  const updatePrescription = useCallback(
    (id: string, prescriptionUpdate: Partial<Prescription>) => {
      setPrescriptions((prev) =>
        prev.map((prescription) =>
          prescription.id === id ? { ...prescription, ...prescriptionUpdate } : prescription
        )
      );
    },
    [setPrescriptions]
  );

  const deletePrescription = useCallback(
    (id: string) => {
      setPrescriptions((prev) => prev.filter((prescription) => prescription.id !== id));
    },
    [setPrescriptions]
  );

  const getPatientPrescriptions = useCallback(
    (patientId: string) => prescriptions.filter((prescription) => prescription.patientId === patientId),
    [prescriptions]
  );

  const addAppointment = useCallback(
    (appointmentData: Omit<Appointment, 'id'>) => {
      const newAppointment = {
        ...appointmentData,
        id: generateId(),
      } as Appointment;
      setAppointments((prev) => [...prev, newAppointment]);
    },
    [setAppointments]
  );

  const updateAppointment = useCallback(
    (id: string, appointmentUpdate: Partial<Appointment>) => {
      setAppointments((prev) =>
        prev.map((appointment) =>
          appointment.id === id ? { ...appointment, ...appointmentUpdate } : appointment
        )
      );
    },
    [setAppointments]
  );

  const deleteAppointment = useCallback(
    (id: string) => {
      setAppointments((prev) => prev.filter((appointment) => appointment.id !== id));
    },
    [setAppointments]
  );

  const getPatientAppointments = useCallback(
    (patientId: string) => appointments.filter((appointment) => appointment.patientId === patientId),
    [appointments]
  );

  const addMedicalRecord = useCallback(
    (recordData: Omit<MedicalRecord, 'id'>) => {
      const newRecord = {
        ...recordData,
        id: generateId(),
      } as MedicalRecord;
      setMedicalRecords((prev) => [...prev, newRecord]);
    },
    [setMedicalRecords]
  );

  const updateMedicalRecord = useCallback(
    (id: string, recordUpdate: Partial<MedicalRecord>) => {
      setMedicalRecords((prev) =>
        prev.map((record) => (record.id === id ? { ...record, ...recordUpdate } : record))
      );
    },
    [setMedicalRecords]
  );

  const deleteMedicalRecord = useCallback(
    (id: string) => {
      setMedicalRecords((prev) => prev.filter((record) => record.id !== id));
    },
    [setMedicalRecords]
  );

  const getPatientMedicalRecords = useCallback(
    (patientId: string) => medicalRecords.filter((record) => record.patientId === patientId),
    [medicalRecords]
  );

  const value = useMemo(
    () => ({
      patients,
      addPatient,
      updatePatient,
      deletePatient,
      getPatient,
      prescriptions,
      addPrescription,
      updatePrescription,
      deletePrescription,
      getPatientPrescriptions,
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
      getPatientAppointments,
      medicalRecords,
      addMedicalRecord,
      updateMedicalRecord,
      deleteMedicalRecord,
      getPatientMedicalRecords,
    }),
    [
      addAppointment,
      addMedicalRecord,
      addPatient,
      addPrescription,
      appointments,
      deleteAppointment,
      deleteMedicalRecord,
      deletePatient,
      deletePrescription,
      getPatient,
      getPatientAppointments,
      getPatientMedicalRecords,
      getPatientPrescriptions,
      medicalRecords,
      patients,
      prescriptions,
      updateAppointment,
      updateMedicalRecord,
      updatePatient,
      updatePrescription,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
