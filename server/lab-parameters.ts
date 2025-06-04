import { db } from "./db";
import { testParameters, tests } from "@shared/schema";
import { eq } from "drizzle-orm";

// Standard laboratory test parameters for common tests
const labTestParameters = {
  "Complete Blood Count (CBC)": [
    { code: "WBC", name: "White Blood Cells", unit: "×10³/μL", min: 4.0, max: 11.0, category: "hematology", order: 1 },
    { code: "RBC", name: "Red Blood Cells", unit: "×10⁶/μL", min: 4.2, max: 5.4, category: "hematology", order: 2 },
    { code: "HGB", name: "Hemoglobin", unit: "g/dL", min: 12.0, max: 16.0, category: "hematology", order: 3 },
    { code: "HCT", name: "Hematocrit", unit: "%", min: 36.0, max: 48.0, category: "hematology", order: 4 },
    { code: "MCV", name: "Mean Corpuscular Volume", unit: "fL", min: 80.0, max: 100.0, category: "hematology", order: 5 },
    { code: "MCH", name: "Mean Corpuscular Hemoglobin", unit: "pg", min: 27.0, max: 33.0, category: "hematology", order: 6 },
    { code: "MCHC", name: "Mean Corpuscular Hemoglobin Concentration", unit: "g/dL", min: 32.0, max: 36.0, category: "hematology", order: 7 },
    { code: "PLT", name: "Platelets", unit: "×10³/μL", min: 150.0, max: 450.0, category: "hematology", order: 8 },
    { code: "NEUT", name: "Neutrophils", unit: "%", min: 45.0, max: 70.0, category: "hematology", order: 9 },
    { code: "LYMPH", name: "Lymphocytes", unit: "%", min: 20.0, max: 45.0, category: "hematology", order: 10 },
    { code: "MONO", name: "Monocytes", unit: "%", min: 2.0, max: 10.0, category: "hematology", order: 11 },
    { code: "EOS", name: "Eosinophils", unit: "%", min: 1.0, max: 4.0, category: "hematology", order: 12 },
    { code: "BASO", name: "Basophils", unit: "%", min: 0.5, max: 1.0, category: "hematology", order: 13 }
  ],
  "Basic Metabolic Panel": [
    { code: "GLU", name: "Glucose", unit: "mg/dL", min: 70.0, max: 100.0, category: "chemistry", order: 1 },
    { code: "BUN", name: "Blood Urea Nitrogen", unit: "mg/dL", min: 7.0, max: 20.0, category: "chemistry", order: 2 },
    { code: "CREAT", name: "Creatinine", unit: "mg/dL", min: 0.6, max: 1.2, category: "chemistry", order: 3 },
    { code: "NA", name: "Sodium", unit: "mEq/L", min: 136.0, max: 145.0, category: "chemistry", order: 4 },
    { code: "K", name: "Potassium", unit: "mEq/L", min: 3.5, max: 5.1, category: "chemistry", order: 5 },
    { code: "CL", name: "Chloride", unit: "mEq/L", min: 98.0, max: 107.0, category: "chemistry", order: 6 },
    { code: "CO2", name: "Carbon Dioxide", unit: "mEq/L", min: 22.0, max: 28.0, category: "chemistry", order: 7 },
    { code: "ANION", name: "Anion Gap", unit: "mEq/L", min: 8.0, max: 16.0, category: "chemistry", order: 8 }
  ],
  "Lipid Panel": [
    { code: "CHOL", name: "Total Cholesterol", unit: "mg/dL", min: 0.0, max: 200.0, category: "chemistry", order: 1 },
    { code: "HDL", name: "HDL Cholesterol", unit: "mg/dL", min: 40.0, max: 999.0, category: "chemistry", order: 2 },
    { code: "LDL", name: "LDL Cholesterol", unit: "mg/dL", min: 0.0, max: 100.0, category: "chemistry", order: 3 },
    { code: "TRIG", name: "Triglycerides", unit: "mg/dL", min: 0.0, max: 150.0, category: "chemistry", order: 4 }
  ],
  "Liver Function Panel": [
    { code: "ALT", name: "Alanine Aminotransferase", unit: "U/L", min: 7.0, max: 40.0, category: "chemistry", order: 1 },
    { code: "AST", name: "Aspartate Aminotransferase", unit: "U/L", min: 10.0, max: 40.0, category: "chemistry", order: 2 },
    { code: "ALP", name: "Alkaline Phosphatase", unit: "U/L", min: 44.0, max: 147.0, category: "chemistry", order: 3 },
    { code: "TBIL", name: "Total Bilirubin", unit: "mg/dL", min: 0.2, max: 1.2, category: "chemistry", order: 4 },
    { code: "DBIL", name: "Direct Bilirubin", unit: "mg/dL", min: 0.0, max: 0.3, category: "chemistry", order: 5 },
    { code: "TP", name: "Total Protein", unit: "g/dL", min: 6.0, max: 8.3, category: "chemistry", order: 6 },
    { code: "ALB", name: "Albumin", unit: "g/dL", min: 3.5, max: 5.0, category: "chemistry", order: 7 }
  ],
  "Thyroid Function Panel": [
    { code: "TSH", name: "Thyroid Stimulating Hormone", unit: "mIU/L", min: 0.4, max: 4.0, category: "immunology", order: 1 },
    { code: "T4", name: "Free T4", unit: "ng/dL", min: 0.8, max: 1.8, category: "immunology", order: 2 },
    { code: "T3", name: "Free T3", unit: "pg/mL", min: 2.3, max: 4.2, category: "immunology", order: 3 }
  ],
  "Urinalysis": [
    { code: "UCOLOR", name: "Color", unit: "", min: null, max: null, category: "urinalysis", order: 1, normalText: "Yellow" },
    { code: "UCLARITY", name: "Clarity", unit: "", min: null, max: null, category: "urinalysis", order: 2, normalText: "Clear" },
    { code: "USG", name: "Specific Gravity", unit: "", min: 1.003, max: 1.030, category: "urinalysis", order: 3 },
    { code: "UPH", name: "pH", unit: "", min: 5.0, max: 8.0, category: "urinalysis", order: 4 },
    { code: "UPROT", name: "Protein", unit: "mg/dL", min: 0.0, max: 14.0, category: "urinalysis", order: 5 },
    { code: "UGLU", name: "Glucose", unit: "mg/dL", min: 0.0, max: 15.0, category: "urinalysis", order: 6 },
    { code: "UKET", name: "Ketones", unit: "", min: null, max: null, category: "urinalysis", order: 7, normalText: "Negative" },
    { code: "UBLOOD", name: "Blood", unit: "", min: null, max: null, category: "urinalysis", order: 8, normalText: "Negative" },
    { code: "UNIT", name: "Nitrites", unit: "", min: null, max: null, category: "urinalysis", order: 9, normalText: "Negative" },
    { code: "ULEUK", name: "Leukocyte Esterase", unit: "", min: null, max: null, category: "urinalysis", order: 10, normalText: "Negative" }
  ]
};

export async function seedTestParameters() {
  console.log("Seeding laboratory test parameters...");

  for (const [testName, parameters] of Object.entries(labTestParameters)) {
    // Find the test by name
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.name, testName))
      .limit(1);

    if (test) {
      console.log(`Found test: ${testName} (ID: ${test.id})`);
      
      // Check if parameters already exist
      const existingParams = await db
        .select()
        .from(testParameters)
        .where(eq(testParameters.testId, test.id));

      if (existingParams.length === 0) {
        // Insert parameters
        for (const param of parameters) {
          await db.insert(testParameters).values({
            testId: test.id,
            parameterName: param.name,
            parameterCode: param.code,
            unit: param.unit,
            normalRangeMin: param.min,
            normalRangeMax: param.max,
            normalRangeText: param.normalText || null,
            category: param.category,
            displayOrder: param.order
          });
        }
        console.log(`Inserted ${parameters.length} parameters for ${testName}`);
      } else {
        console.log(`Parameters already exist for ${testName}`);
      }
    } else {
      console.log(`Test not found: ${testName}`);
    }
  }

  console.log("Test parameters seeding completed");
}

export async function getTestParametersForTest(testId: number) {
  return await db
    .select({
      id: testParameters.id,
      testId: testParameters.testId,
      parameterName: testParameters.parameterName,
      parameterCode: testParameters.parameterCode,
      unit: testParameters.unit,
      normalRangeMin: testParameters.normalRangeMin,
      normalRangeMax: testParameters.normalRangeMax,
      normalRangeText: testParameters.normalRangeText,
      category: testParameters.category,
      displayOrder: testParameters.displayOrder
    })
    .from(testParameters)
    .where(eq(testParameters.testId, testId))
    .orderBy(testParameters.displayOrder);
}