# Orient Medical Centre - Targeted Migration Plan

## Confirmed Core Tables for Migration

### Table 1: tblRecPatient Register (9,319 records)
**Export Instructions:**
1. Right-click on "tblRecPatient Register" table
2. Select "Export" → "Text File"
3. Choose "Delimited" format
4. Select "Comma" as delimiter
5. Check "Include Field Names on First Row"
6. Save as: `patients.csv`

### Table 2: ftblBiLfinancialtransactions (20,771 records)
**Export Instructions:**
1. Right-click on "ftblBiLfinancialtransactions" table
2. Select "Export" → "Text File"
3. Choose "Delimited" format
4. Select "Comma" as delimiter
5. Check "Include Field Names on First Row"
6. Save as: `financial_transactions.csv`

## Field Mapping Strategy

### Patient Table Fields (tblRecPatient Register)
**Common Access field names → ERP fields:**
- PatientID/ID → id
- FirstName/FName → firstName
- LastName/LName → lastName
- DOB/DateOfBirth → dateOfBirth
- Phone/PhoneNumber → phone
- Address → address
- Gender/Sex → gender
- ReferralSource/RefSource → referralSource

### Financial Table Fields (ftblBiLfinancialtransactions)
**Common Access field names → ERP fields:**
- TransactionID/ID → id
- PatientID → patientId
- TransactionDate/Date → transactionDate
- Amount → amount
- PaymentMethod/Method → paymentMethod
- Description → description
- Status → status

## Migration Process

### Phase 1: Export Core Data
1. Export patients.csv (9,319 records)
2. Export financial_transactions.csv (20,771 records)
3. Verify file sizes and record counts

### Phase 2: Data Validation
1. Check for proper CSV formatting
2. Verify date formats (convert to YYYY-MM-DD)
3. Standardize phone numbers (+234XXXXXXXXXX)
4. Clean currency fields (remove ₦ symbols)

### Phase 3: Upload via Data Migration Center
1. Access `/data-migration` in ERP system
2. Upload CSV files in Upload tab
3. Map fields in Map & Validate tab
4. Execute migration

## Data Quality Checks

### Patient Data Validation
- Ensure no duplicate patient IDs
- Verify phone number formats
- Check date of birth validity
- Validate address completeness

### Financial Data Validation
- Confirm all amounts are numeric
- Verify transaction dates are valid
- Check patient ID references exist
- Validate payment methods are standard

## Expected Migration Time
- **Patient records:** 15-20 minutes (9,319 records)
- **Financial transactions:** 25-30 minutes (20,771 records)
- **Total estimated time:** 45-60 minutes

## Next Steps
1. Export the two CSV files from Access
2. Upload them via the Data Migration Center
3. I'll handle field mapping and data transformation
4. Execute migration with progress monitoring

This focused approach gets your core operational data (30,090 records) migrated efficiently while we identify other populated tables for subsequent migration phases.