import React, {
  createContext,
  useCallback,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
} from 'react';
import usePersistentState from '../hooks/usePersistentState';

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

const initialPatients: Patient[] = [
  {
    id: '1',
    name: 'Joao Silva',
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    birthDate: '1985-05-15',
    gender: 'male',
    address: 'Rua das Flores, 123 - Sao Paulo, SP',
    healthInsurance: 'Unimed',
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@email.com',
    phone: '(11) 91234-5678',
    birthDate: '1990-10-20',
    gender: 'female',
    address: 'Av. Paulista, 1578 - Sao Paulo, SP',
    healthInsurance: 'Bradesco Saude',
  },
];

const initialPrescriptions: Prescription[] = [
  {
    id: '1',
    patientId: '1',
    medication: 'Losartana',
    dosage: '50mg',
    frequency: '1x ao dia',
    startDate: '2023-03-15',
    endDate: '2023-06-15',
    observations: 'Tomar pela manha',
  },
  {
    id: '2',
    patientId: '2',
    medication: 'Metformina',
    dosage: '500mg',
    frequency: '2x ao dia',
    startDate: '2023-04-10',
    endDate: '2023-07-10',
    observations: 'Tomar apos as refeicoes',
  },
];

const initialAppointments: Appointment[] = [
  {
    id: '1',
    patientId: '1',
    date: '2023-05-20',
    time: '14:30',
    status: 'scheduled',
    notes: 'Consulta de rotina',
  },
  {
    id: '2',
    patientId: '2',
    date: '2023-05-22',
    time: '10:15',
    status: 'scheduled',
    notes: 'Acompanhamento de tratamento',
  },
];

const initialMedicalRecords: MedicalRecord[] = [
  {
    id: '1',
    patientId: '1',
    date: '2023-02-15',
    diagnosis: 'Hipertensao Arterial',
    treatment: 'Medicacao e mudanca de habitos',
    notes: 'Paciente apresentou melhora nos niveis pressoricos',
  },
  {
    id: '2',
    patientId: '2',
    date: '2023-03-10',
    diagnosis: 'Diabetes Tipo 2',
    treatment: 'Medicacao e dieta',
    notes: 'Necessario acompanhamento com nutricionista',
  },
];

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

export function DataProvider({ children }: DataProviderProps) {
  const [patients, setPatients] = usePersistentState<Patient[]>('patients', []);
  const [prescriptions, setPrescriptions] = usePersistentState<Prescription[]>('prescriptions', []);
  const [appointments, setAppointments] = usePersistentState<Appointment[]>('appointments', []);
  const [medicalRecords, setMedicalRecords] = usePersistentState<MedicalRecord[]>('medicalRecords', []);

  useEffect(() => {
    if (patients.length === 0) {
      setPatients(initialPatients);
    }

    if (prescriptions.length === 0) {
      setPrescriptions(initialPrescriptions);
    }

    if (appointments.length === 0) {
      setAppointments(initialAppointments);
    }

    if (medicalRecords.length === 0) {
      setMedicalRecords(initialMedicalRecords);
    }
  }, [
    appointments.length,
    medicalRecords.length,
    patients.length,
    prescriptions.length,
    setAppointments,
    setMedicalRecords,
    setPatients,
    setPrescriptions,
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
      setMedicalRecords((prev) => prev.map((record) => (record.id === id ? { ...record, ...recordUpdate } : record)));
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
