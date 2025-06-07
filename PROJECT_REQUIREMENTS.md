# Orient Medical Centre - ERP System Requirements

## Core Questions for Clarity

### 1. Business Context
- **Location**: Orient Medical Diagnostic Centre, Benin City, Nigeria
- **Current System**: Access database with 9,315+ patients, 23,000+ transactions
- **Primary Goal**: Modern web-based ERP system for medical diagnostic operations

### 2. Essential Workflows
Please confirm the core business processes:

**A. Patient Registration**
- Basic demographics only (name, phone, DOB)
- Unique patient ID generation (e.g., OMC-2024-6305)
- No referral information at registration

**B. Service Selection & Billing**
- Patient selects medical tests
- Referral pathway decided here (self-pay vs referred)
- Payment processing
- Commission calculation for referrals

**C. Laboratory Operations**
- Test scheduling and tracking
- Results entry and reporting
- Quality control workflows

**D. Financial Management**
- Daily revenue tracking
- Referral commission calculations
- Monthly referral invoicing
- Payment settlement workflows

### 3. User Roles & Permissions
**A. Administrative Roles**
- Super Admin (full system access)
- Manager (approvals, financial oversight)
- Accountant (financial verification, audit trails)

**B. Operational Roles**
- Receptionist (patient registration, billing)
- Lab Technician (test processing, results)
- Radiologist (imaging analysis)

**C. External Roles**
- Referral Providers (commission tracking)
- Consultants (off-site imaging analysis)

### 4. Key Data Entities
**A. Core Tables**
- patients (demographics only)
- tests (medical test catalog)
- patient_tests (service records)
- transactions (financial records with referral tracking)
- referral_providers (commission partners)

**B. Supporting Tables**
- users (staff authentication)
- test_categories (laboratory departments)
- inventory (medical supplies)
- audit_logs (change tracking)

### 5. Critical Features
**A. Revenue & Financial**
- Accurate daily revenue calculations
- Per-service rebate calculations
- Monthly referral invoice generation
- Payment settlement workflows

**B. Operational**
- Real-time patient queue management
- Test result tracking
- Inventory consumption tracking
- Automated workflow notifications

**C. Reporting & Analytics**
- Financial dashboards
- Operational metrics
- Predictive revenue forecasting
- Export capabilities (PDF, Excel)

### 6. Technical Requirements
**A. Data Migration**
- Import 9,315+ real patient records from Access
- Preserve financial transaction history
- Maintain referral relationship integrity

**B. System Architecture**
- TypeScript full-stack (React + Express)
- PostgreSQL database
- Role-based access control
- Real-time updates via WebSocket

**C. Integration Needs**
- Payment processing
- SMS notifications
- Email communications
- Document generation (invoices, reports)

## Questions for Confirmation

1. **Workflow Priority**: Which workflow should we build first?
   - [ ] Patient registration and basic billing
   - [ ] Laboratory operations and results
   - [ ] Financial management and referrals
   - [ ] User management and permissions

2. **Data Import Strategy**: How should we handle the Access database?
   - [ ] Manual CSV export and import
   - [ ] Python script extraction
   - [ ] Start fresh with new data entry
   - [ ] Hybrid approach (core data import + fresh workflows)

3. **User Authentication**: What's the preferred approach?
   - [ ] Simple username/password
   - [ ] Email-based authentication
   - [ ] Multi-factor authentication
   - [ ] Integration with existing systems

4. **Referral Commission Model**: How are commissions calculated?
   - [ ] Fixed percentage per provider
   - [ ] Variable rates by test type
   - [ ] Tiered commission structure
   - [ ] Flat fee per referral

5. **Deployment Timeline**: What's the target rollout?
   - [ ] Immediate deployment for testing
   - [ ] Phased rollout by department
   - [ ] Full system replacement
   - [ ] Parallel operation with existing system

Please confirm these requirements and answer the priority questions so we can build the system with the right foundation from the start.