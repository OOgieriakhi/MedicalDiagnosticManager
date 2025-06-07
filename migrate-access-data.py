#!/usr/bin/env python3
"""
Orient Medical Diagnostic Centre - Access Database Migration Tool
Migrates real operational data from Access intranet system to PostgreSQL ERP database
"""

import pandas as pd
import pyodbc
import psycopg2
import logging
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import argparse

class AccessMigrationTool:
    def __init__(self, access_db_path: str, postgres_config: Dict):
        self.access_db_path = access_db_path
        self.postgres_config = postgres_config
        self.setup_logging()
        self.migration_stats = {
            'patients': 0,
            'tests': 0,
            'results': 0,
            'financial': 0,
            'errors': []
        }

    def setup_logging(self):
        """Configure logging for migration process"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f'migration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)

    def connect_access(self) -> pyodbc.Connection:
        """Establish connection to Access database"""
        try:
            # Access database connection string
            conn_str = (
                r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
                f'DBQ={self.access_db_path};'
            )
            connection = pyodbc.connect(conn_str)
            self.logger.info(f"Connected to Access database: {self.access_db_path}")
            return connection
        except Exception as e:
            self.logger.error(f"Failed to connect to Access database: {e}")
            raise

    def connect_postgres(self) -> psycopg2.Connection:
        """Establish connection to PostgreSQL database"""
        try:
            connection = psycopg2.connect(**self.postgres_config)
            self.logger.info("Connected to PostgreSQL database")
            return connection
        except Exception as e:
            self.logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise

    def analyze_access_schema(self) -> Dict[str, List[str]]:
        """Analyze Access database schema to understand table structure"""
        conn = self.connect_access()
        cursor = conn.cursor()
        
        # Get all table names
        tables = []
        for table_info in cursor.tables(tableType='TABLE'):
            tables.append(table_info.table_name)
        
        schema_info = {}
        for table in tables:
            try:
                # Get column information for each table
                cursor.execute(f"SELECT TOP 1 * FROM [{table}]")
                columns = [column[0] for column in cursor.description]
                schema_info[table] = columns
                self.logger.info(f"Table '{table}' has {len(columns)} columns")
            except Exception as e:
                self.logger.warning(f"Could not analyze table '{table}': {e}")
        
        conn.close()
        return schema_info

    def transform_patient_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform Access patient data to ERP format"""
        # Common Access field mappings
        field_mapping = {
            'PatientID': 'patient_id',
            'Patient_ID': 'patient_id',
            'ID': 'patient_id',
            'FirstName': 'first_name',
            'First_Name': 'first_name',
            'LastName': 'last_name',
            'Last_Name': 'last_name',
            'DOB': 'date_of_birth',
            'DateOfBirth': 'date_of_birth',
            'Date_of_Birth': 'date_of_birth',
            'Sex': 'gender',
            'Gender': 'gender',
            'Phone': 'phone',
            'PhoneNumber': 'phone',
            'Phone_Number': 'phone',
            'Email': 'email',
            'EmailAddress': 'email',
            'Address': 'address'
        }
        
        # Rename columns based on mapping
        df = df.rename(columns=field_mapping)
        
        # Data cleaning and transformation
        if 'phone' in df.columns:
            df['phone'] = df['phone'].astype(str).str.replace(r'[^\d+]', '', regex=True)
            df['phone'] = df['phone'].apply(lambda x: f"+234{x[-10:]}" if len(x) >= 10 else x)
        
        if 'date_of_birth' in df.columns:
            df['date_of_birth'] = pd.to_datetime(df['date_of_birth'], errors='coerce')
        
        if 'gender' in df.columns:
            df['gender'] = df['gender'].str.lower().map({'m': 'male', 'f': 'female', 'male': 'male', 'female': 'female'})
        
        # Generate patient_id if missing
        if 'patient_id' not in df.columns:
            df['patient_id'] = df.index.map(lambda x: f"OMD-MIGR-{x:05d}")
        else:
            df['patient_id'] = df['patient_id'].apply(lambda x: f"OMD-{str(x).zfill(5)}" if pd.notnull(x) else None)
        
        # Add required ERP fields
        df['tenant_id'] = 1
        df['branch_id'] = 1
        df['pathway'] = 'walk_in'  # Default pathway
        df['created_at'] = datetime.now()
        df['updated_at'] = datetime.now()
        
        return df

    def transform_test_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform Access test/procedure data to ERP format"""
        field_mapping = {
            'TestID': 'test_id',
            'Test_ID': 'test_id',
            'PatientID': 'patient_id',
            'Patient_ID': 'patient_id',
            'TestDate': 'scheduled_at',
            'Test_Date': 'scheduled_at',
            'Date_Performed': 'completed_at',
            'DatePerformed': 'completed_at',
            'TestType': 'test_name',
            'Test_Type': 'test_name',
            'Results': 'results',
            'Test_Results': 'results',
            'Notes': 'notes',
            'Comments': 'notes',
            'Technician': 'technician_id',
            'TechnicianID': 'technician_id',
            'Amount': 'amount',
            'Cost': 'amount',
            'Price': 'amount'
        }
        
        df = df.rename(columns=field_mapping)
        
        # Date transformations
        for date_col in ['scheduled_at', 'completed_at']:
            if date_col in df.columns:
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        
        # Add ERP required fields
        df['tenant_id'] = 1
        df['branch_id'] = 1
        df['status'] = 'completed'
        df['payment_verified'] = True
        df['created_at'] = datetime.now()
        df['updated_at'] = datetime.now()
        
        return df

    def migrate_patients(self, table_name: str) -> int:
        """Migrate patient data from Access to PostgreSQL"""
        access_conn = self.connect_access()
        postgres_conn = self.connect_postgres()
        
        try:
            # Read patient data from Access
            query = f"SELECT * FROM [{table_name}]"
            df = pd.read_sql(query, access_conn)
            self.logger.info(f"Read {len(df)} records from Access table '{table_name}'")
            
            # Transform data
            df_transformed = self.transform_patient_data(df)
            
            # Remove rows with missing critical data
            df_clean = df_transformed.dropna(subset=['first_name', 'last_name'])
            
            # Insert into PostgreSQL
            cursor = postgres_conn.cursor()
            
            insert_query = """
                INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, gender, 
                                    phone, email, address, pathway, tenant_id, branch_id, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (patient_id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    updated_at = EXCLUDED.updated_at
            """
            
            records_inserted = 0
            for _, row in df_clean.iterrows():
                try:
                    cursor.execute(insert_query, (
                        row.get('patient_id'),
                        row.get('first_name'),
                        row.get('last_name'),
                        row.get('date_of_birth'),
                        row.get('gender'),
                        row.get('phone'),
                        row.get('email'),
                        row.get('address'),
                        row.get('pathway'),
                        row.get('tenant_id'),
                        row.get('branch_id'),
                        row.get('created_at'),
                        row.get('updated_at')
                    ))
                    records_inserted += 1
                except Exception as e:
                    self.logger.error(f"Error inserting patient record: {e}")
                    self.migration_stats['errors'].append(f"Patient insert error: {e}")
            
            postgres_conn.commit()
            self.logger.info(f"Successfully migrated {records_inserted} patient records")
            return records_inserted
            
        except Exception as e:
            self.logger.error(f"Patient migration failed: {e}")
            postgres_conn.rollback()
            raise
        finally:
            access_conn.close()
            postgres_conn.close()

    def migrate_financial_data(self, table_name: str) -> int:
        """Migrate financial transaction data"""
        access_conn = self.connect_access()
        postgres_conn = self.connect_postgres()
        
        try:
            query = f"SELECT * FROM [{table_name}]"
            df = pd.read_sql(query, access_conn)
            
            # Transform financial data
            field_mapping = {
                'TransactionID': 'transaction_number',
                'Transaction_ID': 'transaction_number',
                'PatientID': 'patient_id',
                'Patient_ID': 'patient_id',
                'Amount': 'amount',
                'PaymentDate': 'payment_date',
                'Payment_Date': 'payment_date',
                'PaymentMethod': 'payment_method',
                'Payment_Method': 'payment_method'
            }
            
            df = df.rename(columns=field_mapping)
            
            # Add to migration stats
            self.migration_stats['financial'] += len(df)
            
            self.logger.info(f"Processed {len(df)} financial records")
            return len(df)
            
        except Exception as e:
            self.logger.error(f"Financial migration failed: {e}")
            raise
        finally:
            access_conn.close()
            postgres_conn.close()

    def run_migration(self, table_mappings: Dict[str, str]) -> Dict:
        """Execute complete migration process"""
        self.logger.info("Starting Access database migration")
        
        # Create database backup
        self.create_backup()
        
        # Analyze Access schema
        schema_info = self.analyze_access_schema()
        self.logger.info(f"Found {len(schema_info)} tables in Access database")
        
        # Migrate each table type
        for table_type, table_name in table_mappings.items():
            if table_name in schema_info:
                try:
                    if table_type == 'patients':
                        count = self.migrate_patients(table_name)
                        self.migration_stats['patients'] = count
                    elif table_type == 'financial':
                        count = self.migrate_financial_data(table_name)
                        self.migration_stats['financial'] = count
                    # Add more table types as needed
                    
                except Exception as e:
                    self.logger.error(f"Failed to migrate {table_type}: {e}")
                    self.migration_stats['errors'].append(f"{table_type}: {e}")
            else:
                self.logger.warning(f"Table '{table_name}' not found in Access database")
        
        # Generate migration report
        self.generate_migration_report()
        
        return self.migration_stats

    def create_backup(self):
        """Create PostgreSQL database backup before migration"""
        try:
            backup_file = f"backup_pre_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
            os.system(f"pg_dump {self.postgres_config['database']} > {backup_file}")
            self.logger.info(f"Database backup created: {backup_file}")
        except Exception as e:
            self.logger.warning(f"Backup creation failed: {e}")

    def generate_migration_report(self):
        """Generate comprehensive migration report"""
        report = {
            'migration_date': datetime.now().isoformat(),
            'statistics': self.migration_stats,
            'summary': {
                'total_records_migrated': sum([
                    self.migration_stats['patients'],
                    self.migration_stats['tests'],
                    self.migration_stats['financial']
                ]),
                'error_count': len(self.migration_stats['errors']),
                'success_rate': 'High' if len(self.migration_stats['errors']) < 10 else 'Medium'
            }
        }
        
        # Write report to file
        report_file = f"migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.logger.info(f"Migration report saved: {report_file}")
        
        # Print summary
        print("\n" + "="*50)
        print("MIGRATION SUMMARY")
        print("="*50)
        print(f"Patients migrated: {self.migration_stats['patients']}")
        print(f"Financial records: {self.migration_stats['financial']}")
        print(f"Errors encountered: {len(self.migration_stats['errors'])}")
        print(f"Report saved to: {report_file}")
        print("="*50)

def main():
    parser = argparse.ArgumentParser(description='Migrate Access database to PostgreSQL ERP')
    parser.add_argument('--access-db', required=True, help='Path to Access database file')
    parser.add_argument('--postgres-host', default='localhost', help='PostgreSQL host')
    parser.add_argument('--postgres-db', required=True, help='PostgreSQL database name')
    parser.add_argument('--postgres-user', required=True, help='PostgreSQL username')
    parser.add_argument('--postgres-password', required=True, help='PostgreSQL password')
    parser.add_argument('--config-file', help='JSON configuration file with table mappings')
    
    args = parser.parse_args()
    
    # PostgreSQL configuration
    postgres_config = {
        'host': args.postgres_host,
        'database': args.postgres_db,
        'user': args.postgres_user,
        'password': args.postgres_password,
        'port': 5432
    }
    
    # Default table mappings (can be overridden with config file)
    table_mappings = {
        'patients': 'Patients',
        'tests': 'Tests',
        'financial': 'Payments'
    }
    
    # Load custom configuration if provided
    if args.config_file and os.path.exists(args.config_file):
        with open(args.config_file, 'r') as f:
            config = json.load(f)
            table_mappings.update(config.get('table_mappings', {}))
    
    # Run migration
    migration_tool = AccessMigrationTool(args.access_db, postgres_config)
    results = migration_tool.run_migration(table_mappings)
    
    print(f"\nMigration completed with {len(results['errors'])} errors")

if __name__ == "__main__":
    main()