# Rebate Calculation System - Implementation Guide

## Overview
The Orient Medical Diagnostic Centre rebate calculation system has been corrected to apply **per-service maximum rebate limits** instead of global provider caps. This ensures accurate commission calculations for referral providers.

## Key Changes Made

### 1. Database Schema Updates
- Added `max_rebate_amount` column to the `tests` table
- Set individual maximum rebate limits for each service based on pricing tiers:
  - **Basic Tests** (₦15,000-25,000): ₦200-400 max rebate
  - **Standard Tests** (₦30,000-50,000): ₦800-1,500 max rebate  
  - **Advanced Tests** (₦75,000-95,000): ₦2,500-3,000 max rebate

### 2. Corrected Business Logic
**Previous Logic (Incorrect):**
- Applied global maximum rebate per provider regardless of services
- Example: 7.5% of ₦215,000 = ₦16,125, capped at ₦5,000 global limit

**New Logic (Correct):**
- Applies individual service maximum rebate amounts
- Example: CT Angiography (₦95,000 × 7.5% = ₦7,125) → capped at ₦3,000 service limit
- Example: CT Brain (₦75,000 × 7.5% = ₦5,625) → capped at ₦2,500 service limit
- Example: 2D Echo (₦45,000 × 7.5% = ₦3,375) → capped at ₦1,500 service limit
- **Total Commission: ₦7,000** (sum of individual service caps)

### 3. Implementation Locations

#### Backend Integration
- **File**: `server/routes.ts` (Lines 795-851)
- **Function**: Invoice creation endpoint with corrected commission calculation
- **Logic**: Fetches individual service rebate limits and applies the lower of percentage calculation or service maximum

#### Utility Function
- **File**: `shared/rebate-calculator.ts`
- **Function**: `calculateRebateAmount()` with comprehensive validation
- **Features**: Per-service calculations, detailed reporting, error handling

#### Test Validation
- **File**: `test-rebate-calculator.ts`
- **Coverage**: Validates calculations across all referral providers and service types
- **Verification**: Ensures accurate commission processing with proper caps

## Sample Calculation Example

### Test Scenario
- **Provider**: Dr. Emeka Okafor Clinic (7.5% commission rate)
- **Services**: 
  1. CT Angiography (Brain) - ₦95,000
  2. CT Brain (Contrast) - ₦75,000
  3. 2D Echocardiogram - ₦45,000

### Calculation Breakdown
```
Service 1: ₦95,000 × 7.5% = ₦7,125 → Capped at ₦3,000 (service max)
Service 2: ₦75,000 × 7.5% = ₦5,625 → Capped at ₦2,500 (service max)
Service 3: ₦45,000 × 7.5% = ₦3,375 → Capped at ₦1,500 (service max)

Total Commission: ₦3,000 + ₦2,500 + ₦1,500 = ₦7,000
```

### Verification Query
```sql
SELECT 
    i.id,
    i.invoice_number,
    i.commission_amount,
    i.total_amount,
    p.first_name,
    p.last_name,
    rp.name as referral_provider,
    rp.commission_rate
FROM invoices i
JOIN patients p ON i.patient_id = p.id
LEFT JOIN referral_providers rp ON p.referral_provider_id = rp.id
WHERE i.commission_amount > 0
ORDER BY i.created_at DESC;
```

## Service Rebate Limits Reference

| Service Category | Price Range | Max Rebate Amount |
|-----------------|-------------|-------------------|
| Basic Lab Tests | ₦15,000-25,000 | ₦200-400 |
| Standard Imaging | ₦30,000-50,000 | ₦800-1,500 |
| Advanced CT/MRI | ₦75,000-95,000 | ₦2,500-3,000 |
| Specialized Procedures | ₦100,000+ | ₦3,000-5,000 |

## System Integration

### Invoice Creation
- Commission calculation now happens automatically during invoice creation
- Accurate rebate amounts are stored in the `commission_amount` field
- Detailed logging shows per-service calculations for transparency

### Patient Intake Workflow
- Rebate calculations integrated into the patient intake process
- Real-time commission preview for referral patients
- Proper linking between patients, referral providers, and services

### Reporting
- Enhanced rebate reports with accurate commission tracking
- Per-service breakdown available for auditing
- Monthly reconciliation reports for referral providers

## Testing Validation

The system has been thoroughly tested with:
- ✅ Multiple referral providers with different commission rates
- ✅ Various service combinations across all pricing tiers
- ✅ Edge cases with single services and mixed service packages
- ✅ Commission calculation accuracy verification
- ✅ Database integrity and proper data storage

## Deployment Status

- ✅ Database schema updated with service rebate limits
- ✅ Backend commission calculation corrected
- ✅ Invoice creation endpoint updated
- ✅ Rebate calculation utility implemented
- ✅ System testing completed successfully
- ✅ Documentation and validation completed

The rebate calculation system is now production-ready with accurate per-service commission processing.