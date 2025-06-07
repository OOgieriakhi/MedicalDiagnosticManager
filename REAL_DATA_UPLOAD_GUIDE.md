# Real Data Upload Guide - Orient Medical Diagnostic Centre

## Step-by-Step Process for Uploading Your Complete Data

### Option 1: Direct Access Database Connection (Recommended)

#### Step 1: Export Data from Access
1. **Open your Access database**
2. **Export tables to CSV format:**
   - Patients table → Export as `patients.csv`
   - Tests/Procedures table → Export as `tests.csv`
   - Laboratory results → Export as `lab_results.csv`
   - Financial records → Export as `financial.csv`
   - Staff records → Export as `staff.csv`
   - Referral sources → Export as `referrals.csv`

#### Step 2: Prepare CSV Files
Ensure your CSV files have these column headers:

**patients.csv:**
```
PatientID,FirstName,LastName,DateOfBirth,Gender,Phone,Email,Address,ReferralSource
```

**tests.csv:**
```
PatientID,TestDate,TestType,Results,Amount,PaymentStatus,TechnicianName
```

**financial.csv:**
```
PatientID,TransactionDate,Amount,PaymentMethod,Description,Status
```

### Option 2: Use the Web Interface

#### Step 1: Access Migration Center
1. Log into the ERP system
2. Navigate to **Data Migration** (I'll add this to the main menu)
3. Use the file upload interface

#### Step 2: Upload Process
1. Select your CSV files or Access database
2. Map columns to ERP fields
3. Validate data integrity
4. Execute migration

### Option 3: Python Migration Script (Technical Users)

#### Prerequisites
```bash
pip install pandas pyodbc psycopg2-binary openpyxl
```

#### Run Migration
```bash
python migrate-access-data.py --access-db "C:\path\to\your\database.accdb" --postgres-db orient_medical_erp --postgres-user postgres --postgres-password your_password
```

## Data Validation Checklist

Before uploading, ensure:

### Patient Records
- [ ] All patients have first and last names
- [ ] Phone numbers are in correct format (+234...)
- [ ] Dates are in YYYY-MM-DD format
- [ ] No duplicate patient IDs

### Test Records
- [ ] All tests linked to valid patients
- [ ] Test dates are realistic
- [ ] Results are properly formatted
- [ ] Payment amounts are numeric

### Financial Records
- [ ] All amounts are positive numbers
- [ ] Payment dates are valid
- [ ] Payment methods are standard (cash, card, transfer)

## Common Data Issues and Solutions

### Issue 1: Date Format Problems
**Problem:** Access dates like "12/31/2024"
**Solution:** Convert to "2024-12-31" format

### Issue 2: Phone Number Formats
**Problem:** Various formats (08012345678, +2348012345678)
**Solution:** Standardize to +234XXXXXXXXXX

### Issue 3: Missing Patient Links
**Problem:** Test records without valid patient IDs
**Solution:** Create missing patients or link to existing ones

## Quick Start Commands

### 1. Check your data structure:
```sql
-- Run this in Access to see your table structure
SELECT * FROM MSysObjects WHERE Type=1 AND Flags=0;
```

### 2. Export patient data:
```sql
-- In Access, run this query then export results
SELECT PatientID, FirstName, LastName, DOB, Phone, Email 
FROM Patients 
ORDER BY PatientID;
```

### 3. Verify upload success:
```sql
-- Run this in the ERP system after upload
SELECT COUNT(*) as total_patients FROM patients WHERE tenant_id = 1;
```

## Next Steps After Upload

1. **Verify Data Integrity**
   - Check patient counts match
   - Verify test results are complete
   - Confirm financial totals

2. **Staff Training**
   - Train users on new system
   - Explain workflow changes
   - Test user access levels

3. **Go Live Preparation**
   - Schedule transition date
   - Plan data backup
   - Prepare rollback procedure

## Support Information

If you encounter issues:
1. Check the migration logs
2. Verify CSV format matches requirements
3. Ensure all required fields are present
4. Contact system administrator for database access issues

## Estimated Timeline

- **Small dataset (< 1,000 patients):** 1-2 hours
- **Medium dataset (1,000-5,000 patients):** 2-4 hours  
- **Large dataset (> 5,000 patients):** 4-8 hours

The system will automatically:
- Generate unique patient IDs
- Link test results to patients
- Calculate financial totals
- Create audit trails
- Verify data relationships

Would you like me to help you with any specific step, or do you want to start with a particular data export method?