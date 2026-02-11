

export type CropType = 'Pszenica' | 'Rzepak' | 'Kukurydza' | 'Burak Cukrowy' | 'Jęczmień' | 'Żyto' | 'Ziemniaki' | 'Trawy' | 'Rośliny Bobowate' | 'Mieszanka';

export type UserRole = 'ADVISOR' | 'FARMER';

// Tabela: Dzialki_Historia
export interface FieldHistoryEntry {
  year: number; // 2021, 2022, 2023, 2024, 2025
  crop: string;
  appliedEcoSchemes: string[]; // E_USU, E_IPR, E_OPN
  limingDate?: string; // YYYY-MM-DD
  soilPh?: number;
}

// Tabela: Gospodarstwo (Rozszerzona)
export interface FarmProfile {
  producerId: string; // ID_Producenta
  totalAreaUR: number; // Powierzchnia_UR
  entryConditionPoints: number; // Wyliczane: Powierzchnia_UR * 25% * 5 pkt
}

export interface Field {
  id: string;
  name: string; // Identyfikator działki ewidencyjnej
  registrationNumber?: string; // Nr działki ewidencyjnej
  area: number; // Pow. gruntów ornych ogółem na działce [ha]
  eligibleArea: number; // Hektar kwalifikujący się ogółem na działce [ha]
  crop: CropType;
  history: FieldHistoryEntry[]; // Relacja do Dzialki_Historia
}

export interface FarmData {
  farmName: string;
  profile: FarmProfile; // Dane tabeli Gospodarstwo
  fields: Field[];
}

export interface FarmerDocument {
  id: string;
  name: string;
  type: 'PDF' | 'CSV' | 'GML' | 'SHP' | 'OTHER';
  category: 'WNIOSEK' | 'MAPA' | 'REJESTR' | 'INNE'; 
  campaignYear: string; // np. "2026"
  size: string;
  uploadDate: string;
}

export interface FarmerClient {
  producerId: string; // Primary Key (EP, 9 digits)
  advisorId?: number; // Foreign Key to User (Advisor)
  firstName: string;
  lastName: string;
  // Computed or auxiliary
  farmName: string; 
  totalArea: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  lastContact: string;
  documents: FarmerDocument[];
}

// Tabela: Stawki_2026 i Ekoschematy
export interface SubsidyRate {
  id: string;
  name: string;
  rate: number;
  unit: 'PLN/ha' | 'PLN/DJP' | 'PLN/pkt' | 'PLN/szt.' | 'PLN/kg';
  category: 'EKOSCHEMAT' | 'DOPLATA' | 'DOBROSTAN';
  year: number; 
}

export interface OptimizationRecommendation {
  fieldId: string;
  fieldName: string;
  suggestedEcoSchemes: string[];
  reasoning: string;
  potentialGain: number; // Estimated gain in PLN
}

export interface OptimizationResult {
  totalEstimatedSubsidy: number;
  recommendations: OptimizationRecommendation[];
  complianceNotes: string;
}

// --- TASKS / PLANNER ---
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'PENDING' | 'DONE';
export type TaskType = 'AGRO' | 'DEADLINE' | 'CONTROL';

export interface FarmTask {
    id: string;
    title: string;
    description?: string;
    date: string; // YYYY-MM-DD
    fieldId?: string; // Optional link to field
    fieldName?: string;
    priority: TaskPriority;
    status: TaskStatus;
    type: TaskType;
}

// --- CSV TEMPLATES ---
export type CsvTemplateType = 'PARCELS' | 'CROPS';

export interface CsvMappingField {
    key: string;
    label: string;
    required: boolean;
}

export interface CsvTemplate {
    id: string;
    name: string;
    type: CsvTemplateType;
    // Mapuje klucz systemowy (np. 'area') na nagłówek w pliku CSV (np. 'Powierzchnia Ha')
    mappings: Record<string, string>; 
    separator: string; // ';' lub ','
}

export type ViewState = 'DASHBOARD' | 'FIELDS' | 'DOCUMENTS' | 'OPTIMIZATION' | 'CHAT' | 'CALENDAR' | 'FARMERS_LIST' | 'ADMIN';
