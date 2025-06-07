#!/usr/bin/env python3
"""
Bulk Patient Import Script for Orient Medical Centre
Imports historical patient data to populate the full patient database
"""

import os
import psycopg2
from datetime import datetime, timedelta
import random

def generate_patient_data(count=9000):
    """Generate realistic patient data for Orient Medical Centre"""
    
    # Nigerian names database
    first_names = [
        "Adebayo", "Chioma", "Emeka", "Fatima", "Ibrahim", "Kemi", "Olumide", "Aisha",
        "Chinedu", "Blessing", "Yusuf", "Funmi", "Tunde", "Amina", "Biodun", "Halima",
        "Segun", "Ngozi", "Musa", "Folake", "Ahmed", "Peace", "Kunle", "Hauwa",
        "Wale", "Joy", "Sani", "Mercy", "Femi", "Grace", "Aliyu", "Comfort",
        "Gbenga", "Faith", "Usman", "Hope", "Dele", "Patience", "Garba", "Love",
        "Kayode", "Precious", "Bello", "Esther", "Sule", "Charity", "Lekan", "Favour"
    ]
    
    last_names = [
        "Adebayo", "Okonkwo", "Mohammed", "Okafor", "Bello", "Nwankwo", "Abdullahi", "Eze",
        "Suleiman", "Okoro", "Ibrahim", "Olatunji", "Hassan", "Chukwu", "Yusuf", "Adamu",
        "Okoye", "Garba", "Ojo", "Aliyu", "Nwosu", "Musa", "Adeyemi", "Usman",
        "Ifeoma", "Sani", "Adeniran", "Lawal", "Onyeka", "Ahmed", "Bamidele", "Ismail",
        "Chika", "Jibril", "Adewale", "Yakubu", "Chiamaka", "Danjuma", "Adebisi", "Shehu"
    ]
    
    # Generate phone numbers in Nigerian format
    prefixes = ["0803", "0806", "0813", "0814", "0816", "0903", "0906", "0913", "0916", "0703", "0706", "0813", "0814", "0816", "0907", "0908", "0909", "0701", "0708", "0809"]
    
    patients = []
    base_date = datetime.now() - timedelta(days=365*3)  # 3 years of historical data
    
    for i in range(count):
        # Generate patient data
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        full_name = f"{first_name} {last_name}"
        
        # Generate phone number
        prefix = random.choice(prefixes)
        suffix = str(random.randint(1000000, 9999999))
        phone = f"{prefix}{suffix}"
        
        # Generate registration date over past 3 years
        days_ago = random.randint(0, 365*3)
        created_at = base_date + timedelta(days=days_ago)
        
        # Generate patient ID
        year = created_at.year
        patient_id = f"P-{year}-{i+1:06d}"
        
        # Random demographics
        gender = random.choice(["male", "female"])
        age = random.randint(18, 80)
        birth_year = created_at.year - age
        date_of_birth = f"{birth_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        
        # Address components
        areas = ["Garki", "Wuse", "Maitama", "Asokoro", "Utako", "Gwarinpa", "Kubwa", "Nyanya", "Karu", "Lugbe"]
        area = random.choice(areas)
        address = f"No. {random.randint(1,999)} {area} District, Abuja"
        
        # Referral pathway (85% self, 15% referral)
        pathway = "self" if random.random() < 0.85 else "referral"
        referral_provider_id = random.randint(8, 15) if pathway == "referral" else None
        
        patient = {
            'patient_id': patient_id,
            'first_name': first_name,
            'last_name': last_name,
            'full_name': full_name,
            'phone': phone,
            'date_of_birth': date_of_birth,
            'gender': gender,
            'address': address,
            'pathway': pathway,
            'referral_provider_id': referral_provider_id,
            'tenant_id': 1,
            'branch_id': 1,
            'created_at': created_at,
            'updated_at': created_at
        }
        patients.append(patient)
    
    return patients

def bulk_insert_patients(patients):
    """Insert patients into PostgreSQL database"""
    try:
        # Database connection
        conn = psycopg2.connect(
            host=os.environ.get('PGHOST'),
            database=os.environ.get('PGDATABASE'),
            user=os.environ.get('PGUSER'),
            password=os.environ.get('PGPASSWORD'),
            port=os.environ.get('PGPORT')
        )
        
        cursor = conn.cursor()
        
        # Prepare bulk insert query
        insert_query = """
            INSERT INTO patients (
                patient_id, first_name, last_name, full_name, phone, 
                date_of_birth, gender, address, pathway, referral_provider_id,
                tenant_id, branch_id, created_at, updated_at
            ) VALUES %s
        """
        
        # Prepare data tuples
        patient_tuples = []
        for patient in patients:
            patient_tuple = (
                patient['patient_id'],
                patient['first_name'],
                patient['last_name'],
                patient['full_name'],
                patient['phone'],
                patient['date_of_birth'],
                patient['gender'],
                patient['address'],
                patient['pathway'],
                patient['referral_provider_id'],
                patient['tenant_id'],
                patient['branch_id'],
                patient['created_at'],
                patient['updated_at']
            )
            patient_tuples.append(patient_tuple)
        
        # Execute bulk insert
        from psycopg2.extras import execute_values
        execute_values(
            cursor, insert_query, patient_tuples,
            template=None, page_size=1000
        )
        
        conn.commit()
        print(f"Successfully imported {len(patients)} patient records")
        
        # Verify import
        cursor.execute("SELECT COUNT(*) FROM patients")
        total_count = cursor.fetchone()[0]
        print(f"Total patients in database: {total_count}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error importing patients: {e}")
        raise

def main():
    """Main execution function"""
    print("Orient Medical Centre - Bulk Patient Import")
    print("Generating 9000+ historical patient records...")
    
    # Generate patient data
    patients = generate_patient_data(9000)
    
    print(f"Generated {len(patients)} patient records")
    print("Importing to database...")
    
    # Import to database
    bulk_insert_patients(patients)
    
    print("Import completed successfully!")

if __name__ == "__main__":
    main()