
export type Goal = 'muscle' | 'weight_loss' | 'maintenance' | 'wellbeing';
export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'athlete';

export interface UserProfile {
  name: string;
  weight: number; // kg
  height?: number; // cm
  goal: Goal;
  activityLevel: ActivityLevel;
  activeSupplements: string[]; // IDs of selected supplements
  customSupplements: SupplementInfo[]; // User defined supplements
  sleepGoal: number; // hours
}

export interface SupplementLog {
  id: string;
  type: string;
  name: string;
  amount: number; // grams or mg
  unit: string;
  timestamp: number;
}

export interface DailyTargets {
  protein: number; // grams
  water: number; // liters
  creatine: number; // grams
  sleep: number; // hours
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface SupplementInfo {
  id: string;
  name: string;
  defaultUnit: string;
  defaultAmount: number;
  description: string;
  type: string;
  riskLevel: RiskLevel;
}

export const AVAILABLE_SUPPLEMENTS: SupplementInfo[] = [
  { 
    id: 'prot', 
    name: 'Proteína Whey', 
    defaultAmount: 25, 
    defaultUnit: 'g', 
    type: 'protein', 
    description: 'Ayuda a la recuperación muscular.',
    riskLevel: 'low'
  },
  { 
    id: 'creat', 
    name: 'Creatina Monohidrato', 
    defaultAmount: 5, 
    defaultUnit: 'g', 
    type: 'creatine', 
    description: 'Mejora fuerza y potencia.',
    riskLevel: 'low'
  },
  { 
    id: 'magn', 
    name: 'Magnesio', 
    defaultAmount: 400, 
    defaultUnit: 'mg', 
    type: 'mineral', 
    description: 'Ayuda al sistema nervioso y muscular.',
    riskLevel: 'low'
  },
  { 
    id: 'caf', 
    name: 'Cafeína', 
    defaultAmount: 200, 
    defaultUnit: 'mg', 
    type: 'stimulant', 
    description: 'Aumenta energía y concentración.',
    riskLevel: 'medium'
  },
  { 
    id: 'omega', 
    name: 'Omega 3', 
    defaultAmount: 1000, 
    defaultUnit: 'mg', 
    type: 'fat', 
    description: 'Salud cardiovascular.',
    riskLevel: 'low'
  },
  {
    id: 'col',
    name: 'Colágeno',
    defaultAmount: 10,
    defaultUnit: 'g',
    type: 'other',
    description: 'Salud de articulaciones y piel.',
    riskLevel: 'low'
  },
  {
    id: 'no',
    name: 'Óxido Nítrico (Precursores)',
    defaultAmount: 3,
    defaultUnit: 'g',
    type: 'vasodilator',
    description: 'Mejora flujo sanguíneo (Pump).',
    riskLevel: 'high'
  },
  {
    id: 'pre',
    name: 'Pre-Entreno Complejo',
    defaultAmount: 1,
    defaultUnit: 'scoop',
    type: 'stimulant_mix',
    description: 'Mezcla de estimulantes para rendimiento.',
    riskLevel: 'high'
  }
];
