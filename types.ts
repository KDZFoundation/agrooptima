
export type CropType = 'Pszenica' | 'Rzepak' | 'Kukurydza' | 'Burak Cukrowy' | 'Jęczmień' | 'Żyto' | 'Ziemniaki' | 'Trawy' | 'Rośliny Bobowate' | 'Mieszanka' | 'Nieznana' | string;

export type UserRole = 'ADVISOR' | 'FARMER';

// Tabela: Słownik Upraw
export interface CropDefinition {
    id: string;
    name: string; // np. "Pszenica ozima"
    type: string; // np. "Zboża"
    isLegume: boolean; // Czy bobowata (do płatności)
    isCatchCrop: boolean; // Czy nadaje się na międzyplon
}

// Sub-structure for split parcels (ARiMR logic: Reference Parcel -> Multiple Agricultural Parcels)
export interface FieldCropPart {
    designation: string; // Oznaczenie (A, B, C...)
    crop: string; // Roślina
    area: number; // Wielkość zadeklarowanej powierzchni w granicach działki referencyjnej
    ecoSchemes: string[];
    
    // Additional optional details per part
    designationZal?: string; 
    paymentList?: string;
    plantMix?: string;
}

// Tabela: Dzialki_Historia
export interface FieldHistoryEntry {
  year: number; // 2021, 2022, 2023, 2024, 2025
  crop: string; // Dominant crop (or "Mieszana" if multiple parts)
  appliedEcoSchemes: string[]; // E_USU, E_IPR, E_OPN (Union of all parts)
  
  // Year-specific dimensions (to keep years independent)
  area?: number; 
  eligibleArea?: number;

  // NEW: List of specific crops on this reference parcel for this year
  cropParts?: FieldCropPart[];

  limingDate?: string; // YYYY-MM-DD
  soilPh?: number;

  // Legacy flat fields (kept for backward compatibility or simple view)
  designation?: string; 
  designationZal?: string; 
  paymentList?: string; 
  isUnreported?: string; 
  plantMix?: string; 
  seedQuantity?: string; 
  organic?: string; 
  onwType?: string; 
  onwArea?: number; 
  
  // Specyficzne płatności (PRSK, ZRSK, RE)
  prskPackage?: string;
  prskPractice?: string; 
  prskFruitTreeVariety?: string; 
  prskFruitTreeCount?: number; 
  prskIntercropPlant?: string; 
  prskUsage?: string; 
  prskVariety?: string; 

  zrskPackage?: string; 
  zrskPractice?: string; 
  zrskFruitTreeVariety?: string; 
  zrskFruitTreeCount?: number; 
  zrskUsage?: string; 
  zrskVariety?: string; 

  rePackage?: string; 
  
  notes?: string; 
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
  area: number; // Pow. gruntów ornych ogółem na działce [ha] (Latest/Default)
  eligibleArea: number; // Hektar kwalifikujący się ogółem na działce [ha] (Latest/Default)
  crop: CropType;
  history: FieldHistoryEntry[]; // Relacja do Dzialki_Historia

  // Dane lokalizacyjne (z pliku dzialki.csv)
  voivodeship?: string; // Województwo
  district?: string; // Powiat
  commune?: string; // Gmina
  precinctName?: string; // Nazwa obrębu ewidencyjnego
  precinctNumber?: string; // Nr obrębu ewidencyjnego
  mapSheet?: string; // Nr arkusza mapy
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
  unit: 'PLN/ha' | 'PLN/DJP' | 'PLN/pkt' | 'PLN/szt.' | 'PLN/kg' | 'EUR/ha';
  category: 'EKOSCHEMAT' | 'DOPLATA' | 'DOBROSTAN';
  year: number;
  
  // Extended properties for Eco-schemes
  shortName?: string; // e.g. "E_ZSU"
  points?: number; // e.g. 5
  combinableWith?: string; // e.g. "E_OPN, E_PN"
  description?: string; // Additional tooltip info
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

// --- LOGIC / VALIDATION TYPES ---
export interface ValidationIssue {
    type: 'ERROR' | 'WARNING';
    fieldId: string;
    fieldName: string;
    message: string;
}

export interface EcoSchemeCalculation {
    schemeCode: string;
    totalPoints: number;
    totalArea: number;
    estimatedValue: number;
}

export interface FarmAnalysisReport {
    validationIssues: ValidationIssue[];
    ecoSchemes: EcoSchemeCalculation[];
    totalPoints: number;
    requiredPoints: number; // 25% * 5pkt condition
    isEntryConditionMet: boolean;
    totalEstimatedValue: number;
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
    year: number; // Rok kampanii
    // Mapuje klucz systemowy (np. 'area') na nagłówek w pliku CSV (np. 'Powierzchnia Ha')
    mappings: Record<string, string>; 
    separator: string; // ';' lub ','
}

export type ViewState = 'DASHBOARD' | 'FIELDS' | 'DOCUMENTS' | 'OPTIMIZATION' | 'CHAT' | 'CALENDAR' | 'FARMERS_LIST' | 'ADMIN';
