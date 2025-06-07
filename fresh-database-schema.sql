-- Orient Medical Centre - Clean Database Schema
-- Designed specifically for medical diagnostic center operations

-- Drop existing tables to start fresh
DROP TABLE IF EXISTS patient_tests CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS referral_providers CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS test_categories CASCADE;

-- 1. Test Categories (Laboratory departments)
CREATE TABLE test_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Medical Tests Catalog
CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    category_id INTEGER REFERENCES test_categories(id),
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    requires_fasting BOOLEAN DEFAULT FALSE,
    sample_type VARCHAR(50), -- blood, urine, stool, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Referral Providers (Hospitals, Clinics)
CREATE TABLE referral_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0.00, -- percentage
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Patients (Clean registration only)
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) DEFAULT '',
    phone VARCHAR(20),
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Patient Tests (Service records)
CREATE TABLE patient_tests (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES tests(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    scheduled_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP NULL,
    results TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Financial Transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    patient_test_id INTEGER REFERENCES patient_tests(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash', -- cash, card, transfer, insurance
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, cancelled
    referral_provider_id INTEGER REFERENCES referral_providers(id) NULL, -- NULL for self-pay
    transaction_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert essential test categories
INSERT INTO test_categories (name, description) VALUES
('Hematology', 'Blood cell analysis and coagulation studies'),
('Clinical Chemistry', 'Biochemical analysis of blood and body fluids'),
('Microbiology', 'Bacterial, viral, and parasitic infections'),
('Immunology', 'Immune system and antibody testing'),
('Radiology', 'Medical imaging services'),
('Cardiology', 'Heart function and cardiovascular tests');

-- Insert common medical tests with realistic Nigerian pricing
INSERT INTO tests (name, code, category_id, price, sample_type) VALUES
-- Hematology
('Full Blood Count', 'FBC', 1, 2500.00, 'blood'),
('Malaria Parasite', 'MP', 1, 1500.00, 'blood'),
('Blood Group & Genotype', 'BGG', 1, 2000.00, 'blood'),
('Widal Test', 'WIDAL', 1, 2500.00, 'blood'),

-- Clinical Chemistry  
('Blood Glucose (Fasting)', 'FBS', 2, 1200.00, 'blood'),
('Blood Glucose (Random)', 'RBS', 2, 1000.00, 'blood'),
('Lipid Profile', 'LIPID', 2, 5000.00, 'blood'),
('Liver Function Test', 'LFT', 2, 4500.00, 'blood'),
('Kidney Function Test', 'KFT', 2, 3500.00, 'blood'),
('Thyroid Function Test', 'TFT', 2, 7500.00, 'blood'),

-- Microbiology
('Urinalysis', 'URINE', 3, 1000.00, 'urine'),
('Stool Examination', 'STOOL', 3, 1200.00, 'stool'),
('Blood Culture', 'BC', 3, 4000.00, 'blood'),
('Sputum Examination', 'SPUTUM', 3, 2000.00, 'sputum'),

-- Immunology
('HIV Screening', 'HIV', 4, 2000.00, 'blood'),
('Hepatitis B Surface Antigen', 'HBsAg', 4, 3500.00, 'blood'),
('Pregnancy Test', 'PREG', 4, 1500.00, 'urine'),

-- Radiology
('Chest X-Ray', 'CXR', 5, 4000.00, 'imaging'),
('Abdominal Ultrasound', 'AUS', 5, 8000.00, 'imaging'),
('Pelvic Ultrasound', 'PUS', 5, 6000.00, 'imaging'),

-- Cardiology
('Electrocardiogram', 'ECG', 6, 3000.00, 'electrical');

-- Insert sample referral providers
INSERT INTO referral_providers (name, contact_person, phone, commission_rate) VALUES
('University of Benin Teaching Hospital', 'Dr. Adebayo', '08012345678', 15.00),
('Central Hospital Benin', 'Dr. Emeka', '08023456789', 12.00),
('Stella Obasanjo Hospital', 'Dr. Fatima', '08034567890', 10.00),
('New Era Hospital', 'Dr. Ibrahim', '08045678901', 8.00),
('Life Care Hospital', 'Dr. Chioma', '08056789012', 10.00);

-- Create indexes for performance
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_names ON patients(first_name, last_name);
CREATE INDEX idx_patient_tests_patient ON patient_tests(patient_id);
CREATE INDEX idx_patient_tests_status ON patient_tests(status);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_payment_status ON transactions(payment_status);

-- Sample patient data matching your actual records
INSERT INTO patients (patient_id, first_name, last_name, middle_name, phone, date_of_birth, created_at) VALUES
('OMC-2024-6305', 'ANDREW', 'UGWUEGBU', '', '09039720785', '1990-01-01', '2024-11-29'),
('OMC-UGWU-001', 'JANE', 'UGWUEGBU', '', '07059865481', '1985-01-01', '2024-01-01'),
('OMC-REAL-001', 'OMOKARO', 'FELIX', '', '08012345678', '1975-01-01', '2023-01-15'),
('OMC-REAL-002', 'ADAORA', 'OMOKARO', '', '08023456789', '1980-01-01', '2023-02-20'),
('OMC-REAL-003', 'EMEKA', 'OMOKARO', '', '08034567890', '1985-01-01', '2023-03-25');

COMMENT ON TABLE patients IS 'Patient registration - basic demographics only';
COMMENT ON TABLE patient_tests IS 'Medical services provided to patients';
COMMENT ON TABLE transactions IS 'Financial records with optional referral tracking';
COMMENT ON COLUMN transactions.referral_provider_id IS 'NULL for self-pay patients, ID for referred patients';