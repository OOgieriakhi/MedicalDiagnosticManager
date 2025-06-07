# Data Migration Strategy: Access Intranet to ERP Database

## Migration Overview
This document outlines the complete process for migrating real operational data from Orient Medical Diagnostic Centre's Access intranet system to the new ERP database.

## Phase 1: Data Assessment & Extraction

### Step 1: Access Database Analysis
```sql
-- Connect to Access database and identify tables
-- Expected tables in Access system:
- Patients
- Tests_Performed  
- Laboratory_Results
- Radiology_Reports
- Financial_Transactions
- Staff_Records
- Equipment_Maintenance
- Supplier_Information
```

### Step 2: Data Export from Access
**Option A: Direct Database Connection**
```bash
# Install Access database drivers
# Connect using ODBC connection string
# Export to CSV/Excel format for processing
```

**Option B: Manual Export Process**
1. Export each table to CSV format from Access
2. Ensure data integrity during export
3. Verify column mappings and data types

## Phase 2: Data Mapping & Transformation

### Database Schema Mapping

#### Patients Table Mapping
```sql
-- Access Field -> ERP Field
PatientID -> patient_id
FirstName -> first_name  
LastName -> last_name
DateOfBirth -> date_of_birth
Gender -> gender
Phone -> phone
Email -> email
Address -> address
```

#### Tests/Procedures Mapping
```sql
-- Access Field -> ERP Field
TestID -> test_id
PatientID -> patient_id
TestDate -> scheduled_at
TestType -> test_name (lookup)
Results -> results
TechnicianID -> technician_id
```

#### Financial Records Mapping
```sql
-- Access Field -> ERP Field
TransactionID -> transaction_number
Amount -> amount
PaymentDate -> payment_date
PaymentMethod -> payment_method
```

## Phase 3: Data Validation & Cleanup

### Pre-Migration Validation
1. **Data Integrity Checks**
   - Verify all foreign key relationships
   - Check for duplicate records
   - Validate date formats and ranges
   - Ensure phone/email format consistency

2. **Business Rule Validation**
   - Patient ages within reasonable ranges
   - Test prices align with current pricing
   - Staff assignments match current roles

### Data Transformation Scripts
```python
# Python script for data transformation
import pandas as pd
import datetime

def transform_patient_data(access_df):
    # Clean phone numbers
    access_df['phone'] = access_df['phone'].str.replace(r'[^\d+]', '', regex=True)
    
    # Standardize dates
    access_df['date_of_birth'] = pd.to_datetime(access_df['date_of_birth'])
    
    # Generate patient_id if missing
    access_df['patient_id'] = access_df.apply(lambda x: f"OMD-{x.name:04d}", axis=1)
    
    return access_df
```

## Phase 4: Migration Execution

### Step 1: Create Migration Scripts
```sql
-- PostgreSQL migration script template
BEGIN;

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Import patients
COPY patients (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, tenant_id, created_at)
FROM '/path/to/patients.csv'
DELIMITER ','
CSV HEADER;

-- Import tests
COPY patient_tests (patient_id, test_id, status, scheduled_at, completed_at, results, tenant_id, created_at)
FROM '/path/to/patient_tests.csv'
DELIMITER ','
CSV HEADER;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

COMMIT;
```

### Step 2: Staged Migration Process
1. **Development Environment Migration**
   - Test migration with subset of data
   - Validate all relationships
   - Check application functionality

2. **Staging Environment Migration**
   - Full data migration to staging
   - User acceptance testing
   - Performance validation

3. **Production Migration**
   - Schedule maintenance window
   - Execute migration scripts
   - Validate data integrity
   - Go-live verification

## Phase 5: Data Validation Tools

### Migration Validation Queries
```sql
-- Patient count validation
SELECT 
    'Patients' as table_name,
    COUNT(*) as migrated_count,
    MIN(created_at) as earliest_record,
    MAX(created_at) as latest_record
FROM patients;

-- Test procedures validation
SELECT 
    department,
    COUNT(*) as procedure_count,
    SUM(CASE WHEN payment_verified THEN 1 ELSE 0 END) as verified_payments
FROM patient_tests pt
JOIN tests t ON pt.test_id = t.id
GROUP BY department;

-- Financial validation
SELECT 
    SUM(amount) as total_revenue,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT patient_id) as unique_patients
FROM patient_tests
WHERE payment_verified = true;
```

## Phase 6: Migration Tools & Scripts

### Automated Migration Tool
I'll create a comprehensive migration utility that handles:
- Access database connection
- Data validation and cleanup
- Incremental migration capability
- Error handling and rollback
- Progress monitoring and logging

### Required Software Components
1. **Database Connectivity**
   - Microsoft Access Database Engine
   - PostgreSQL client libraries
   - Python pandas for data processing

2. **Migration Utilities**
   - CSV processing tools
   - Data validation scripts
   - Database backup utilities

## Phase 7: Rollback & Recovery Plan

### Backup Strategy
```sql
-- Create complete database backup before migration
pg_dump orient_medical_erp > backup_pre_migration.sql

-- Create incremental backups during migration
pg_dump --schema-only orient_medical_erp > schema_backup.sql
```

### Rollback Procedures
1. **Data Rollback**
   - Restore from pre-migration backup
   - Verify system functionality
   - Communicate rollback to users

2. **Partial Migration Issues**
   - Identify problematic records
   - Fix data issues in source
   - Re-run migration for affected records

## Implementation Timeline

### Week 1: Assessment & Planning
- Access database analysis
- Schema mapping documentation
- Migration tool development

### Week 2: Development & Testing
- Create migration scripts
- Test with sample data
- Validate data transformations

### Week 3: Staging Migration
- Full staging environment migration
- User acceptance testing
- Performance optimization

### Week 4: Production Migration
- Schedule maintenance window
- Execute production migration
- Post-migration validation
- Go-live support

## Next Steps

Would you like me to:
1. Create the automated migration tool
2. Help you export data from Access
3. Develop specific transformation scripts
4. Set up the staging migration environment

This comprehensive approach ensures data integrity while minimizing downtime and operational disruption.