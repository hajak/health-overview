import { LabCategory, ReferenceRange } from '@/types/labResults';

export interface BiomarkerDefinition {
  standardizedName: string;
  swedishNames: string[];
  englishName: string;
  defaultUnit: string;
  alternativeUnits?: string[];
  category: LabCategory;
  referenceRange: {
    male?: ReferenceRange;
    female?: ReferenceRange;
    general?: ReferenceRange;
  };
  description?: string;
}

export const BIOMARKERS: BiomarkerDefinition[] = [
  // Hematology
  {
    standardizedName: 'hemoglobin',
    swedishNames: ['B-Hb', 'B—Hemoglobin', 'Hemoglobin', 'Hb'],
    englishName: 'Hemoglobin',
    defaultUnit: 'g/L',
    category: 'hematology',
    referenceRange: {
      male: { min: 134, max: 170, operator: 'range', displayText: '134-170 g/L' },
      female: { min: 117, max: 153, operator: 'range', displayText: '117-153 g/L' },
    },
  },
  {
    standardizedName: 'leukocytes',
    swedishNames: ['B—Leukocyter', 'B-Leukocyter', 'Leukocyter', 'LPK'],
    englishName: 'White Blood Cells',
    defaultUnit: 'x10^9/L',
    category: 'hematology',
    referenceRange: {
      general: { min: 3.5, max: 8.8, operator: 'range', displayText: '3.5-8.8 x10^9/L' },
    },
  },
  {
    standardizedName: 'thrombocytes',
    swedishNames: ['B—Trombocyter', 'B-Trombocyter', 'Trombocyter', 'TPK'],
    englishName: 'Platelets',
    defaultUnit: 'x10^9/L',
    category: 'hematology',
    referenceRange: {
      general: { min: 145, max: 348, operator: 'range', displayText: '145-348 x10^9/L' },
    },
  },
  {
    standardizedName: 'mcv',
    swedishNames: ['B—MCV', 'B-MCV', 'MCV'],
    englishName: 'Mean Corpuscular Volume',
    defaultUnit: 'fL',
    category: 'hematology',
    referenceRange: {
      general: { min: 82, max: 98, operator: 'range', displayText: '82-98 fL' },
    },
  },
  {
    standardizedName: 'evf',
    swedishNames: ['B—EVF', 'B-EVF', 'EVF', 'Hematokrit'],
    englishName: 'Hematocrit',
    defaultUnit: '%',
    category: 'hematology',
    referenceRange: {
      male: { min: 0.40, max: 0.50, operator: 'range', displayText: '40-50%' },
      female: { min: 0.35, max: 0.46, operator: 'range', displayText: '35-46%' },
    },
  },
  {
    standardizedName: 'neutrophils',
    swedishNames: ['B—Neutrofila granulocyter', 'Neutrofiler', 'Neutrofila'],
    englishName: 'Neutrophils',
    defaultUnit: 'x10^9/L',
    category: 'hematology',
    referenceRange: {
      general: { min: 1.6, max: 5.9, operator: 'range', displayText: '1.6-5.9 x10^9/L' },
    },
  },
  {
    standardizedName: 'erythrocytes',
    swedishNames: ['B—Erytrocyter', 'B-Erytrocyter', 'Erytrocyter', 'EPK'],
    englishName: 'Red Blood Cells',
    defaultUnit: '10E12/L',
    category: 'hematology',
    referenceRange: {
      male: { min: 4.2, max: 5.7, operator: 'range', displayText: '4.2-5.7 10E12/L' },
      female: { min: 3.9, max: 5.2, operator: 'range', displayText: '3.9-5.2 10E12/L' },
    },
  },
  {
    standardizedName: 'mch',
    swedishNames: ['B—MCH', 'B-MCH', 'MCH'],
    englishName: 'Mean Corpuscular Hemoglobin',
    defaultUnit: 'pg',
    category: 'hematology',
    referenceRange: {
      general: { min: 27, max: 33, operator: 'range', displayText: '27-33 pg' },
    },
  },
  {
    standardizedName: 'mchc',
    swedishNames: ['B—MCHC', 'B-MCHC', 'MCHC'],
    englishName: 'Mean Corpuscular Hemoglobin Concentration',
    defaultUnit: 'g/L',
    category: 'hematology',
    referenceRange: {
      general: { min: 317, max: 357, operator: 'range', displayText: '317-357 g/L' },
    },
  },
  {
    standardizedName: 'reticulocytes',
    swedishNames: ['B—Retikulocyter', 'Retikulocyter'],
    englishName: 'Reticulocytes',
    defaultUnit: 'x10^9/L',
    category: 'hematology',
    referenceRange: {
      general: { min: 30, max: 100, operator: 'range', displayText: '30-100 x10^9/L' },
    },
  },

  // Inflammation
  {
    standardizedName: 'esr',
    swedishNames: ['SR', 'Sänka', 'B—SR', 'B-SR', 'SR (Sänka)'],
    englishName: 'Erythrocyte Sedimentation Rate',
    defaultUnit: 'mm',
    category: 'inflammation',
    referenceRange: {
      general: { max: 15, operator: '<', displayText: '<15 mm' },
    },
  },
  {
    standardizedName: 'crp',
    swedishNames: ['P—CRP', 'P-CRP', 'CRP', 'S-CRP', 'B-CRP', 'S-CRP, känslig', 'P-CRP NY'],
    englishName: 'C-Reactive Protein',
    defaultUnit: 'mg/L',
    category: 'inflammation',
    referenceRange: {
      general: { max: 5, operator: '<', displayText: '<5 mg/L' },
    },
  },
  {
    standardizedName: 'calprotectin',
    swedishNames: ['F—Kalprotektin', 'F-Kalprotektin', 'Kalprotektin', 'F-Kalprotekt'],
    englishName: 'Fecal Calprotectin',
    defaultUnit: 'mg/kg',
    category: 'gastrointestinal',
    referenceRange: {
      general: { max: 50, operator: '<', displayText: '<50 mg/kg' },
    },
  },

  // Iron Status
  {
    standardizedName: 'ferritin',
    swedishNames: ['P—Ferritin', 'P-Ferritin', 'Ferritin', 'S-Ferritin'],
    englishName: 'Ferritin',
    defaultUnit: 'µg/L',
    category: 'iron',
    referenceRange: {
      male: { min: 30, max: 400, operator: 'range', displayText: '30-400 µg/L' },
      female: { min: 15, max: 150, operator: 'range', displayText: '15-150 µg/L' },
    },
  },
  {
    standardizedName: 'iron',
    swedishNames: ['P—Järn', 'P-Järn', 'Järn', 'S-Järn'],
    englishName: 'Serum Iron',
    defaultUnit: 'µmol/L',
    category: 'iron',
    referenceRange: {
      male: { min: 14, max: 32, operator: 'range', displayText: '14-32 µmol/L' },
      female: { min: 10, max: 28, operator: 'range', displayText: '10-28 µmol/L' },
    },
  },
  {
    standardizedName: 'tibc',
    swedishNames: ['P—TIBC', 'P-TIBC', 'TIBC'],
    englishName: 'Total Iron Binding Capacity',
    defaultUnit: 'µmol/L',
    category: 'iron',
    referenceRange: {
      general: { min: 47, max: 80, operator: 'range', displayText: '47-80 µmol/L' },
    },
  },
  {
    standardizedName: 'transferrin_saturation',
    swedishNames: ['P—Transferrinmättnad', 'Transferrinmättnad', 'Transferrinmättn'],
    englishName: 'Transferrin Saturation',
    defaultUnit: '%',
    category: 'iron',
    referenceRange: {
      general: { min: 15, max: 45, operator: 'range', displayText: '15-45%' },
    },
  },

  // Vitamins
  {
    standardizedName: 'vitamin_d',
    swedishNames: ['P—25-OH Vitamin D', '25-OH Vitamin D', 'Vitamin D', 'D-vitamin'],
    englishName: 'Vitamin D (25-OH)',
    defaultUnit: 'nmol/L',
    category: 'vitamins',
    referenceRange: {
      general: { min: 50, max: 125, operator: 'range', displayText: '50-125 nmol/L' },
    },
  },
  {
    standardizedName: 'folate',
    swedishNames: ['P—Folat', 'S-Folat', 'Folat', 'Folsyra'],
    englishName: 'Folate',
    defaultUnit: 'nmol/L',
    category: 'vitamins',
    referenceRange: {
      general: { min: 10, max: 42, operator: 'range', displayText: '10-42 nmol/L' },
    },
  },
  {
    standardizedName: 'cobalamin',
    swedishNames: ['P—Kobalamin', 'P-Kobalaminer', 'Kobalamin', 'B12', 'Vitamin B12', 'P-Kobalaminer(B12)NY'],
    englishName: 'Vitamin B12',
    defaultUnit: 'pmol/L',
    category: 'vitamins',
    referenceRange: {
      general: { min: 150, max: 650, operator: 'range', displayText: '150-650 pmol/L' },
    },
  },
  {
    standardizedName: 'homocysteine',
    swedishNames: ['P—Homocystein', 'Homocystein'],
    englishName: 'Homocysteine',
    defaultUnit: 'µmol/L',
    category: 'vitamins',
    referenceRange: {
      general: { max: 15, operator: '<', displayText: '<15 µmol/L' },
    },
  },

  // Liver
  {
    standardizedName: 'alat',
    swedishNames: ['P—ALAT', 'P-ALAT', 'ALAT', 'ALT'],
    englishName: 'Alanine Aminotransferase',
    defaultUnit: 'µkat/L',
    category: 'liver',
    referenceRange: {
      male: { max: 1.1, operator: '<', displayText: '<1.1 µkat/L' },
      female: { max: 0.76, operator: '<', displayText: '<0.76 µkat/L' },
    },
  },
  {
    standardizedName: 'asat',
    swedishNames: ['P—ASAT', 'P-ASAT', 'ASAT', 'AST'],
    englishName: 'Aspartate Aminotransferase',
    defaultUnit: 'µkat/L',
    category: 'liver',
    referenceRange: {
      male: { max: 0.76, operator: '<', displayText: '<0.76 µkat/L' },
      female: { max: 0.61, operator: '<', displayText: '<0.61 µkat/L' },
    },
  },
  {
    standardizedName: 'ggt',
    swedishNames: ['P—GT', 'P-GT', 'GT', 'GGT', 'Gamma-GT'],
    englishName: 'Gamma-Glutamyl Transferase',
    defaultUnit: 'µkat/L',
    category: 'liver',
    referenceRange: {
      male: { max: 1.4, operator: '<', displayText: '<1.4 µkat/L' },
      female: { max: 1.1, operator: '<', displayText: '<1.1 µkat/L' },
    },
  },
  {
    standardizedName: 'alp',
    swedishNames: ['P—ALP', 'P-ALP', 'ALP', 'Alkaliskt fosfatas'],
    englishName: 'Alkaline Phosphatase',
    defaultUnit: 'µkat/L',
    category: 'liver',
    referenceRange: {
      general: { min: 0.6, max: 1.8, operator: 'range', displayText: '0.6-1.8 µkat/L' },
    },
  },
  {
    standardizedName: 'bilirubin',
    swedishNames: ['P—Bilirubin', 'P-Bilirubin', 'Bilirubin', 'P-Bilirubin NY'],
    englishName: 'Bilirubin',
    defaultUnit: 'µmol/L',
    category: 'liver',
    referenceRange: {
      general: { max: 26, operator: '<', displayText: '<26 µmol/L' },
    },
  },
  {
    standardizedName: 'albumin',
    swedishNames: ['P—Albumin', 'P-Albumin', 'S-Albumin', 'Albumin', 'S-Albumin (imm)'],
    englishName: 'Albumin',
    defaultUnit: 'g/L',
    category: 'liver',
    referenceRange: {
      general: { min: 36, max: 48, operator: 'range', displayText: '36-48 g/L' },
    },
  },

  // Kidney
  {
    standardizedName: 'creatinine',
    swedishNames: ['P—Kreatinin', 'P-Kreatinin', 'Kreatinin', 'Krea'],
    englishName: 'Creatinine',
    defaultUnit: 'µmol/L',
    category: 'kidney',
    referenceRange: {
      male: { min: 60, max: 105, operator: 'range', displayText: '60-105 µmol/L' },
      female: { min: 45, max: 90, operator: 'range', displayText: '45-90 µmol/L' },
    },
  },
  {
    standardizedName: 'cystatin_c',
    swedishNames: ['P—Cystatin C', 'P-Cystatin C', 'Cystatin C'],
    englishName: 'Cystatin C',
    defaultUnit: 'mg/L',
    category: 'kidney',
    referenceRange: {
      general: { min: 0.60, max: 1.10, operator: 'range', displayText: '0.60-1.10 mg/L' },
    },
  },
  {
    standardizedName: 'gfr',
    swedishNames: ['eGFR', 'GFR', 'GFR(Cystatin C)'],
    englishName: 'Glomerular Filtration Rate',
    defaultUnit: 'mL/min/1.73m²',
    category: 'kidney',
    referenceRange: {
      general: { min: 80, operator: '>', displayText: '>80 mL/min/1.73m²' },
    },
  },

  // Electrolytes
  {
    standardizedName: 'sodium',
    swedishNames: ['P—Natrium', 'P-Natrium', 'Natrium', 'Na'],
    englishName: 'Sodium',
    defaultUnit: 'mmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 137, max: 145, operator: 'range', displayText: '137-145 mmol/L' },
    },
  },
  {
    standardizedName: 'potassium',
    swedishNames: ['P—Kalium', 'P-Kalium', 'Kalium', 'K'],
    englishName: 'Potassium',
    defaultUnit: 'mmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 3.5, max: 4.4, operator: 'range', displayText: '3.5-4.4 mmol/L' },
    },
  },
  {
    standardizedName: 'chloride',
    swedishNames: ['P—Klorid', 'P-Klorid', 'Klorid', 'Cl'],
    englishName: 'Chloride',
    defaultUnit: 'mmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 98, max: 107, operator: 'range', displayText: '98-107 mmol/L' },
    },
  },
  {
    standardizedName: 'calcium',
    swedishNames: ['P—Calcium', 'P-Calcium', 'Calcium', 'Ca'],
    englishName: 'Calcium',
    defaultUnit: 'mmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 2.15, max: 2.50, operator: 'range', displayText: '2.15-2.50 mmol/L' },
    },
  },
  {
    standardizedName: 'calcium_ionized',
    swedishNames: ['P—Calciumjon', 'Calciumjon, fri', 'Ca++', 'P—Calciumjon, fri (pH7,4)'],
    englishName: 'Ionized Calcium',
    defaultUnit: 'mmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 1.15, max: 1.30, operator: 'range', displayText: '1.15-1.30 mmol/L' },
    },
  },
  {
    standardizedName: 'magnesium',
    swedishNames: ['P—Magnesium', 'P-Magnesium', 'Magnesium', 'Mg'],
    englishName: 'Magnesium',
    defaultUnit: 'mmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 0.71, max: 0.94, operator: 'range', displayText: '0.71-0.94 mmol/L' },
    },
  },
  {
    standardizedName: 'zinc',
    swedishNames: ['P—Zink', 'P-Zink', 'Zink', 'Zn'],
    englishName: 'Zinc',
    defaultUnit: 'µmol/L',
    category: 'electrolytes',
    referenceRange: {
      general: { min: 11, max: 18, operator: 'range', displayText: '11-18 µmol/L' },
    },
  },

  // Blood Sugar
  {
    standardizedName: 'glucose',
    swedishNames: ['P—Glukos', 'P-Glukos', 'Glukos', 'Blodsocker', 'fP-Glukos', 'Avd P-Glukos'],
    englishName: 'Glucose',
    defaultUnit: 'mmol/L',
    category: 'bloodSugar',
    referenceRange: {
      general: { min: 4.0, max: 6.0, operator: 'range', displayText: '4.0-6.0 mmol/L (fasting)' },
    },
  },
  {
    standardizedName: 'hba1c',
    swedishNames: ['B-HbA1c', 'HbA1c', 'Långtidssocker'],
    englishName: 'HbA1c',
    defaultUnit: 'mmol/mol',
    category: 'bloodSugar',
    referenceRange: {
      general: { max: 42, operator: '<', displayText: '<42 mmol/mol' },
    },
  },

  // Lipids
  {
    standardizedName: 'cholesterol_total',
    swedishNames: ['P-Kolesterol', 'Kolesterol', 'Total kolesterol', 'S-Kolesterol'],
    englishName: 'Total Cholesterol',
    defaultUnit: 'mmol/L',
    category: 'lipids',
    referenceRange: {
      general: { max: 5.0, operator: '<', displayText: '<5.0 mmol/L' },
    },
  },
  {
    standardizedName: 'ldl',
    swedishNames: ['P-LDL', 'LDL-kolesterol', 'LDL', 'S-LDL'],
    englishName: 'LDL Cholesterol',
    defaultUnit: 'mmol/L',
    category: 'lipids',
    referenceRange: {
      general: { max: 3.0, operator: '<', displayText: '<3.0 mmol/L' },
    },
  },
  {
    standardizedName: 'hdl',
    swedishNames: ['P-HDL', 'HDL-kolesterol', 'HDL', 'S-HDL'],
    englishName: 'HDL Cholesterol',
    defaultUnit: 'mmol/L',
    category: 'lipids',
    referenceRange: {
      male: { min: 1.0, operator: '>', displayText: '>1.0 mmol/L' },
      female: { min: 1.3, operator: '>', displayText: '>1.3 mmol/L' },
    },
  },
  {
    standardizedName: 'ldl_hdl_ratio',
    swedishNames: ['LDL-/HDL-kolesterolkvot', 'LDL/HDL-kvot', 'LDL/HDL'],
    englishName: 'LDL/HDL Ratio',
    defaultUnit: '',
    category: 'lipids',
    referenceRange: {
      general: { max: 3.5, operator: '<', displayText: '<3.5' },
    },
  },
  {
    standardizedName: 'triglycerides',
    swedishNames: ['P-Triglycerider', 'Triglycerider', 'TG', 'S-Triglycerider'],
    englishName: 'Triglycerides',
    defaultUnit: 'mmol/L',
    category: 'lipids',
    referenceRange: {
      general: { max: 1.7, operator: '<', displayText: '<1.7 mmol/L' },
    },
  },

  // Thyroid
  {
    standardizedName: 'tsh',
    swedishNames: ['P-TSH', 'TSH', 'S-TSH'],
    englishName: 'Thyroid Stimulating Hormone',
    defaultUnit: 'mIU/L',
    category: 'thyroid',
    referenceRange: {
      general: { min: 0.4, max: 4.0, operator: 'range', displayText: '0.4-4.0 mIU/L' },
    },
  },
  {
    standardizedName: 't4_free',
    swedishNames: ['P-T4 fritt', 'fT4', 'Fritt T4', 'S-T4 fritt'],
    englishName: 'Free T4',
    defaultUnit: 'pmol/L',
    category: 'thyroid',
    referenceRange: {
      general: { min: 12, max: 22, operator: 'range', displayText: '12-22 pmol/L' },
    },
  },
  {
    standardizedName: 't3_free',
    swedishNames: ['P-T3 fritt', 'fT3', 'Fritt T3', 'S-T3 fritt'],
    englishName: 'Free T3',
    defaultUnit: 'pmol/L',
    category: 'thyroid',
    referenceRange: {
      general: { min: 3.1, max: 6.8, operator: 'range', displayText: '3.1-6.8 pmol/L' },
    },
  },

  // Coagulation
  {
    standardizedName: 'inr',
    swedishNames: ['P—PK', 'P-PK', 'INR', 'PK(INR)'],
    englishName: 'INR',
    defaultUnit: '',
    category: 'coagulation',
    referenceRange: {
      general: { min: 0.9, max: 1.2, operator: 'range', displayText: '0.9-1.2' },
    },
  },

  // Blood Gas
  {
    standardizedName: 'ph',
    swedishNames: ['P(vB)—pH', 'pH', 'Blod-pH'],
    englishName: 'Blood pH',
    defaultUnit: '',
    category: 'bloodGas',
    referenceRange: {
      general: { min: 7.35, max: 7.45, operator: 'range', displayText: '7.35-7.45' },
    },
  },
  {
    standardizedName: 'pco2',
    swedishNames: ['P(vB)—pCO2', 'pCO2', 'Koldioxidtryck'],
    englishName: 'Partial Pressure CO2',
    defaultUnit: 'kPa',
    category: 'bloodGas',
    referenceRange: {
      general: { min: 4.7, max: 6.0, operator: 'range', displayText: '4.7-6.0 kPa' },
    },
  },
  {
    standardizedName: 'po2',
    swedishNames: ['P(vB)—pO2', 'pO2', 'Syrgastryck'],
    englishName: 'Partial Pressure O2',
    defaultUnit: 'kPa',
    category: 'bloodGas',
    referenceRange: {
      general: { min: 4.0, max: 6.0, operator: 'range', displayText: '4.0-6.0 kPa (venous)' },
    },
  },
  {
    standardizedName: 'oxygen_saturation',
    swedishNames: ['Hb(vB)—Oxygenmättnad', 'SpO2', 'Saturation', 'SaO2'],
    englishName: 'Oxygen Saturation',
    defaultUnit: '%',
    category: 'bloodGas',
    referenceRange: {
      general: { min: 95, max: 100, operator: 'range', displayText: '95-100%' },
    },
  },
  {
    standardizedName: 'base_excess',
    swedishNames: ['Ecv—Basöverskott', 'Base Excess', 'BE'],
    englishName: 'Base Excess',
    defaultUnit: 'mmol/L',
    category: 'bloodGas',
    referenceRange: {
      general: { min: -3, max: 3, operator: 'range', displayText: '-3 to +3 mmol/L' },
    },
  },
  {
    standardizedName: 'bicarbonate',
    swedishNames: ['P—Standardbikarbonat', 'Bikarbonat', 'HCO3'],
    englishName: 'Bicarbonate',
    defaultUnit: 'mmol/L',
    category: 'bloodGas',
    referenceRange: {
      general: { min: 22, max: 26, operator: 'range', displayText: '22-26 mmol/L' },
    },
  },
  {
    standardizedName: 'lactate',
    swedishNames: ['P(vB)—Laktat', 'Laktat', 'Mjölksyra'],
    englishName: 'Lactate',
    defaultUnit: 'mmol/L',
    category: 'bloodGas',
    referenceRange: {
      general: { max: 2.0, operator: '<', displayText: '<2.0 mmol/L' },
    },
  },
  {
    standardizedName: 'total_co2',
    swedishNames: ['P(vB)—Koldioxid, total', 'Total CO2'],
    englishName: 'Total CO2',
    defaultUnit: 'mmol/L',
    category: 'bloodGas',
    referenceRange: {
      general: { min: 22, max: 29, operator: 'range', displayText: '22-29 mmol/L' },
    },
  },

  // Gastrointestinal
  {
    standardizedName: 'amylase',
    swedishNames: ['P—Pankreasamylas', 'P-Pankreasamylas', 'Amylas', 'P-Pankreasamylas NY'],
    englishName: 'Pancreatic Amylase',
    defaultUnit: 'µkat/L',
    category: 'gastrointestinal',
    referenceRange: {
      general: { max: 0.8, operator: '<', displayText: '<0.8 µkat/L' },
    },
  },

  // Urine
  {
    standardizedName: 'urine_ph',
    swedishNames: ['U-pH', 'U—pH', 'Urin-pH'],
    englishName: 'Urine pH',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { min: 5.0, max: 8.0, operator: 'range', displayText: '5.0-8.0' },
    },
  },
  {
    standardizedName: 'urine_protein',
    swedishNames: ['U—Protein', 'U-Protein', 'Urin-protein'],
    englishName: 'Urine Protein',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { displayText: 'Negative' },
    },
  },
  {
    standardizedName: 'urine_glucose',
    swedishNames: ['U—Glukos', 'U-Glukos', 'Urin-glukos'],
    englishName: 'Urine Glucose',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { displayText: 'Negative' },
    },
  },
  {
    standardizedName: 'urine_erythrocytes',
    swedishNames: ['U—Erytrocyter', 'U-Erytrocyter', 'Urin-erytrocyter'],
    englishName: 'Urine Red Blood Cells',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { displayText: 'Negative' },
    },
  },
  {
    standardizedName: 'urine_leukocytes',
    swedishNames: ['U—Leukocyter', 'U-Leukocyter', 'Urin-leukocyter'],
    englishName: 'Urine White Blood Cells',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { displayText: 'Negative' },
    },
  },
  {
    standardizedName: 'urine_nitrite',
    swedishNames: ['U—Bakterie,nitrit', 'U-Nitrit', 'Nitrit'],
    englishName: 'Urine Nitrite',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { displayText: 'Negative' },
    },
  },
  {
    standardizedName: 'urine_ketones',
    swedishNames: ['U—Acetoacetat', 'U-Ketoner', 'Ketoner'],
    englishName: 'Urine Ketones',
    defaultUnit: '',
    category: 'urine',
    referenceRange: {
      general: { displayText: 'Negative' },
    },
  },

  // Other
  {
    standardizedName: 'anion_gap',
    swedishNames: ['P-Anjongap', 'Anjongap'],
    englishName: 'Anion Gap',
    defaultUnit: 'mmol/L',
    category: 'other',
    referenceRange: {
      general: { min: 8, max: 16, operator: 'range', displayText: '8-16 mmol/L' },
    },
  },
];

export function findBiomarkerByName(name: string): BiomarkerDefinition | undefined {
  const normalizedName = name.trim().toLowerCase();

  return BIOMARKERS.find((biomarker) =>
    biomarker.swedishNames.some(
      (sn) => sn.toLowerCase() === normalizedName ||
              normalizedName.includes(sn.toLowerCase()) ||
              sn.toLowerCase().includes(normalizedName)
    ) ||
    biomarker.englishName.toLowerCase() === normalizedName ||
    biomarker.standardizedName === normalizedName
  );
}

export function findBiomarkerBySwedishName(swedishName: string): BiomarkerDefinition | undefined {
  const cleanName = swedishName
    .replace(/\s*\([^)]*\)\s*/g, '')
    .replace(/\s*(µkat\/L|g\/L|mmol\/L|mg\/L|µg\/L|pmol\/L|nmol\/L|µmol\/L|kPa|fL|x10\^9\/L|%)\s*$/i, '')
    .trim();

  return BIOMARKERS.find((biomarker) =>
    biomarker.swedishNames.some((sn) => {
      const cleanSwedishName = sn.replace(/[—–-]/g, '-');
      const cleanInputName = cleanName.replace(/[—–-]/g, '-');
      return cleanSwedishName.toLowerCase() === cleanInputName.toLowerCase() ||
             cleanInputName.toLowerCase().startsWith(cleanSwedishName.toLowerCase());
    })
  );
}

export function getReferenceRange(
  biomarker: BiomarkerDefinition,
  gender?: 'male' | 'female'
): ReferenceRange {
  if (gender && biomarker.referenceRange[gender]) {
    return biomarker.referenceRange[gender]!;
  }
  return biomarker.referenceRange.general || { displayText: 'N/A' };
}

export function getCategories(): LabCategory[] {
  return [...new Set(BIOMARKERS.map((b) => b.category))];
}

export function getBiomarkersByCategory(category: LabCategory): BiomarkerDefinition[] {
  return BIOMARKERS.filter((b) => b.category === category);
}
