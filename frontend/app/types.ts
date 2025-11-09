export type ClinicType = 'govt' | 'cham' | 'gaia';

export interface Clinic {
  id: string;
  name: string;
  type: ClinicType;
  lat: number;
  lng: number;
  district?: string;
}

export interface CoverageStats {
  totalPopulation: number;
  coveredPopulation: number;
  uncoveredPopulation: number;
  coveragePercentage: number;
}

