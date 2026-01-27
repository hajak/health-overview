import { LabReportFirestore } from './labResults';
import { StravaActivityFirestore, StravaProfile } from './strava';

export interface FoodEntry {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
}

export interface WaterEntry {
  date: string;
  amount: number;
}

export interface SleepEntry {
  date: string;
  hours: number;
  quality?: number;
}

export interface StepsEntry {
  date: string;
  steps: number;
}

export interface UserProfile {
  email: string;
  name: string;
  Age: number;
  Gender: 'male' | 'female' | 'other';
  BloodGroup: string;
  Weight: number;
  Height: number;
  PhoneNumber?: string;
  food: FoodEntry[];
  water: WaterEntry[];
  sleep: SleepEntry[];
  steps: StepsEntry[];
  labResults?: LabReportFirestore[];
  stravaActivities?: StravaActivityFirestore[];
  stravaProfile?: StravaProfile;
}

export interface UserSession {
  user: {
    name: string;
    email: string;
    image?: string;
  };
  expires: string;
}
