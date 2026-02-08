-- Script SQL para Criação do Banco de Dados do NeoMed
-- Este script cria todas as tabelas necessárias para o aplicativo NeoMed
-- incluindo tabelas para pacientes, medicamentos, prescrições e cálculos de dose pediátrica

-- Criação do banco de dados
CREATE DATABASE IF NOT EXISTS neomed_db;
USE neomed_db;

-- Tabela de usuários (médicos, enfermeiros, etc.)
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de pacientes
CREATE TABLE patients (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  health_insurance VARCHAR(100),
  blood_type VARCHAR(10),
  medical_history TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de alergias
CREATE TABLE allergies (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  allergy_name VARCHAR(100) NOT NULL,
  severity ENUM('mild', 'moderate', 'severe') DEFAULT 'moderate',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Tabela de medicamentos
CREATE TABLE medications (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  dosage VARCHAR(50) NOT NULL,
  form VARCHAR(50) NOT NULL,
  manufacturer VARCHAR(100),
  active_ingredient VARCHAR(100),
  therapeutic_class VARCHAR(100),
  administration_route VARCHAR(50),
  contraindications TEXT,
  side_effects TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de prescrições
CREATE TABLE prescriptions (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  valid_until DATE,
  instructions TEXT,
  doctor_notes TEXT,
  status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Tabela de itens da prescrição
CREATE TABLE prescription_items (
  id VARCHAR(36) PRIMARY KEY,
  prescription_id VARCHAR(36) NOT NULL,
  medication_id VARCHAR(36) NOT NULL,
  dosage VARCHAR(50) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (medication_id) REFERENCES medications(id)
);

-- Tabela de histórico médico
CREATE TABLE medical_records (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  record_type ENUM('consultation', 'examination', 'procedure', 'hospitalization') NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  icd_code VARCHAR(20),
  treatment TEXT,
  notes TEXT,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabela de consultas
CREATE TABLE appointments (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(36) NOT NULL,
  doctor_id VARCHAR(36) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  reason TEXT,
  status ENUM('scheduled', 'confirmed', 'cancelled', 'completed') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

-- Tabela de anexos
CREATE TABLE attachments (
  id VARCHAR(36) PRIMARY KEY,
  record_id VARCHAR(36) NOT NULL,
  record_type ENUM('medical_record', 'prescription') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INT NOT NULL,
  uploaded_by VARCHAR(36) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Tabela de cálculos de dose pediátrica
CREATE TABLE pediatric_dose_calculations (
  id VARCHAR(36) PRIMARY KEY,
  medication_name VARCHAR(100) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  maximum_dose VARCHAR(20),
  description TEXT,
  unit VARCHAR(10) NOT NULL,
  medication_group VARCHAR(100),
  is_group_header BOOLEAN DEFAULT FALSE,
  display_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de controle de acesso (roles)
CREATE TABLE user_roles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de permissões de usuário
CREATE TABLE user_permissions (
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE
);

-- Tabela de auditoria (logs)
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Inserir medicamentos de exemplo para cálculo de dose pediátrica
INSERT INTO pediatric_dose_calculations 
(id, medication_name, operation, maximum_dose, description, unit, medication_group, is_group_header, display_order)
VALUES
-- Grupo: Analgésicos e Antitérmicos
(UUID(), 'Analgésicos e Antitérmicos', '', '', '', '', 'analgesicos', TRUE, 1),
(UUID(), 'Dipirona Gotas 500mg/ml', '*1', '40', 'Tomar de 6/6 horas se febre ou dor', 'gts', 'analgesicos', FALSE, 2),
(UUID(), 'Dipirona Injetável', '*0.033', '2', 'Realizar IM ou EV', 'ml', 'analgesicos', FALSE, 3),
(UUID(), 'Dipirona Injetável (dose máxima)', '*0.04', '2', 'Realizar IM ou EV', 'ml', 'analgesicos', FALSE, 4),
(UUID(), 'Cetoprofeno Intramuscular', '*0.002', '2', 'Realizar IM', 'ml', 'analgesicos', FALSE, 5),
(UUID(), 'Cetoprofeno Endovenoso', '*1', '100', 'Realizar EV', 'mg', 'analgesicos', FALSE, 6),
(UUID(), 'Diclofenaco Intramuscular', '*0.032', '3', 'Realizar IM', 'ml', 'analgesicos', FALSE, 7),
(UUID(), 'Ibuprofeno Gotas 50mg/ml', '*2', '40', 'Tomar de 6/6 horas se febre ou dor', 'gts', 'analgesicos', FALSE, 8),
(UUID(), 'Ibuprofeno Gotas 100mg/ml', '*1', '40', 'Tomar de 6/6 horas se febre ou dor', 'gts', 'analgesicos', FALSE, 9),
(UUID(), 'Paracetamol Gotas 200mg/ml', '*1', '50', 'Tomar de 4/4 horas ou 6/6 horas se febre ou dor', 'gts', 'analgesicos', FALSE, 10),

-- Grupo: Anti-ácidos
(UUID(), 'Anti-ácidos', '', '', '', '', 'antiacidos', TRUE, 11),
(UUID(), 'Ranitidina Xarope', '*0.125', '10', 'Tomar de 8/8 horas ou 12/12 horas', 'ml', 'antiacidos', FALSE, 12),
(UUID(), 'Ranitidina Injetável', '*0.1', '2', 'Realizar EV', 'ml', 'antiacidos', FALSE, 13),

-- Grupo: Antialérgicos
(UUID(), 'Antialérgicos', '', '', '', '', 'antialergicos', TRUE, 14),
(UUID(), 'Polaramine Líquido', '*0.075', '5', 'Tomar de 6/6 horas se coceira ou alergia de pele', 'ml', 'antialergicos', FALSE, 15),
(UUID(), 'Polaramine Injetável', '*0.04', '1', 'Realizar IM ou EV', 'ml', 'antialergicos', FALSE, 16),
(UUID(), 'Prometazina Injetável', '*0.025', '1', 'Realizar IM - NÃO EV', 'ml', 'antialergicos', FALSE, 17),

-- Grupo: Antibióticos
(UUID(), 'Antibióticos', '', '', '', '', 'antibioticos', TRUE, 18),
(UUID(), 'Amoxicilina Suspensão 250mg/5ml', '*0.3', '15', 'Tomar de 8/8 horas por 7 dias', 'ml', 'antibioticos', FALSE, 19),
(UUID(), 'Amoxicilina Suspensão 400mg/5ml', '*0.187', '10', 'Tomar de 8/8 horas ou 12/12 horas por 7 dias', 'ml', 'antibioticos', FALSE, 20); 