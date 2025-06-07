# Orient Medical Centre - Access Database Migration Strategy

## Database Analysis: ORIENTMDC BACKBONE (1).accdb (15.5MB)

### Context
- Original hospital database adapted for diagnostic center use
- Many tables likely unused/empty from hospital system
- Focus on identifying active operational tables only

## Recommended Analysis Approach

### Step 1: Quick Table Inventory
Run this in Access Immediate Window (Ctrl+G):

```vb
Sub QuickTableAnalysis()
    Dim db As Database
    Dim tdf As TableDef
    Dim recordCount As Long
    
    Set db = CurrentDb()
    
    Debug.Print "=== ORIENT MDC DATABASE ANALYSIS ==="
    Debug.Print "TABLE NAME" & vbTab & "RECORDS" & vbTab & "PURPOSE"
    Debug.Print String(50, "=")
    
    For Each tdf In db.TableDefs
        If Left(tdf.Name, 4) <> "MSys" And Left(tdf.Name, 1) <> "~" Then
            recordCount = DCount("*", tdf.Name)
            If recordCount > 0 Then
                Debug.Print tdf.Name & vbTab & recordCount & vbTab & "ACTIVE"
            Else
                Debug.Print tdf.Name & vbTab & "0" & vbTab & "EMPTY"
            End If
        End If
    Next tdf
    
    Debug.Print String(50, "=")
    Debug.Print "Analysis complete. Focus on ACTIVE tables only."
End Sub
```

### Step 2: Identify Core Tables
Based on diagnostic center operations, look for tables like:

**Patient Management:**
- Patients, Patient_Info, Patient_Records
- Demographics, Registration

**Diagnostic Services:**
- Tests, Lab_Tests, Procedures
- Results, Lab_Results, Test_Results
- Radiology, Ultrasound, Cardiology

**Financial Management:**
- Payments, Transactions, Billing
- Invoices, Receipts, Financial_Records

**Referral System:**
- Referrals, Referring_Doctors
- Referral_Sources, External_Providers

### Step 3: Export Strategy for Active Tables
For each table with records > 0:

1. **Right-click table → Export → Text File**
2. **Choose "Delimited" format**
3. **Select "Comma" as delimiter**
4. **Include field names on first row**
5. **Save as [TableName].csv**

### Step 4: Data Quality Assessment

**Common Issues to Check:**
- Date formats (Access often uses regional formats)
- Phone numbers (various formats need standardization)
- Currency fields (remove ₦ symbols)
- Patient IDs (ensure uniqueness)
- Missing/incomplete records

### Step 5: Field Mapping

**Patient Table Mapping:**
```
Access Field → ERP Field
PatientID → id
FirstName → firstName
LastName → lastName  
DOB/DateOfBirth → dateOfBirth
Phone/PhoneNo → phone
Address → address
Gender/Sex → gender
```

**Test/Procedure Mapping:**
```
Access Field → ERP Field
TestID → id
PatientID → patientId
TestDate → testDate
TestName/Procedure → testType
Results → results
Amount/Cost → amount
PaymentStatus → paymentStatus
```

## Migration Execution Plan

### Phase 1: Core Patient Data
- Export and validate patient records
- Clean phone numbers and addresses
- Standardize date formats
- Import to ERP patients table

### Phase 2: Test/Procedure History
- Export diagnostic test records
- Link to migrated patient IDs
- Import test results and billing data

### Phase 3: Financial Records
- Export payment/transaction history
- Reconcile with test records
- Import to financial management system

### Phase 4: Referral Network
- Export referring doctor/source data
- Import to referral management system

## Data Volume Estimates

Based on 15.5MB database size:
- **Estimated patient records:** 500-2000
- **Estimated test records:** 1000-5000
- **Estimated financial transactions:** 800-3000

## Next Steps

1. **Run the VBA analysis** to identify active tables
2. **Share the output** with table names and record counts
3. **Export CSV files** for tables with substantial data
4. **Upload through Data Migration Center** with field mapping
5. **Validate data integrity** before final import

This focused approach ensures we only migrate valuable operational data while skipping unused hospital system tables.