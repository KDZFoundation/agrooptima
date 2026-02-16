
export type CropType = 'Pszenica' | 'Rzepak' | 'Kukurydza' | 'Burak Cukrowy' | 'Jęczmień' | 'Żyto' | 'Ziemniaki' | 'Trawy' | 'Rośliny Bobowate' | 'Mieszanka' | 'Nieznana' | string;

export type UserRole = 'ADVISOR' | 'FARMER';

export interface User {
    id: number | string;
    email: string;
    fullName: string;
    role: UserRole;
}

export type OperationType = 'NAWOZENIE' | 'OPRYSK' | 'SIEW' | 'UPRAWA' | 'ZBIOR' | 'INNE';

export interface FieldOperation {
    id: string;
    fieldId: string;
    fieldName: string;
    date: string;
    type: OperationType;
    productName: string;
    dosage: string;
    unit: string;
    operatorName?: string;
    photoUrl?: string;
    isEcoSchemeRelevant: boolean;
    linkedEcoScheme?: string;
}

export interface FarmerApplicationData {
    submissionType: 'Wniosek' | 'Zmiana' | 'Wycofanie';
    commitments: {
        rsk_prow: boolean;
        rsk_wpr: boolean;
        eko_prow: boolean;
        eko_wpr: boolean;
        zalesienie: boolean;
        premie_lesne: boolean;
    };
    directPayments: {
        pwd_red: boolean;
        mro: boolean;
        ekoschematy: boolean;
        carbon_farming: {
            active: boolean;
            tuz_obsada: boolean;
            miedzyplony: boolean;
            plan_nawozenia: boolean;
            zroznicowana_struktura: boolean;
            obornik_12h: boolean;
            nawozy_plynne: boolean;
            uproszczone_uprawy: boolean;
            wymieszanie_slomy: boolean;
        };
        ipr: boolean;
        bou: boolean;
        retencjonowanie: boolean;
        gwp: boolean;
    };
    nationalSupport: {
        upp: boolean;
        tyton: boolean;
    };
    ruralDevelopment: {
        onw: boolean;
        prsk1420: boolean;
        re1420: boolean;
        zrsk2327: boolean;
        re2327: boolean;
    };
    youngFarmerStatement: string;
    rskChangeStatement: boolean;
    gaec7Resignation: boolean;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface KnowledgeChunk {
    id: string;
    documentId: string;
    documentName: string;
    content: string;
    category: string;
    embedding?: number[];
    metadata: {
        page?: number;
        section?: string;
        timestamp: string;
    };
    tokens: number;
}

export interface SemanticQueryResult {
    answer: string;
    citations: KnowledgeChunk[];
}

export interface CsvMappingField {
    key: string;
    label: string;
    required: boolean;
}

export type CsvTemplateType = 'PARCELS' | 'CROPS';

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskType = 'AGRO' | 'DEADLINE' | 'CONTROL';

export interface HierarchyNode {
    id: string;
    type: 'FARM' | 'COMMUNE' | 'PARCEL_REF' | 'AGRI_PARCEL' | 'ECO_SCHEME' | 'FINANCIAL_RESULT';
    label: string;
    value?: string | number;
    status: 'VALID' | 'WARNING' | 'ERROR' | 'INFO';
    evidence: {
        source: string;
        timestamp: string;
        ruleChecked?: string;
        details?: string;
        semanticMatches?: KnowledgeChunk[];
    };
    children?: string[];
}

export interface HierarchyGraph {
    nodes: HierarchyNode[];
    rootId: string;
}

export interface CropDefinition {
    id: string;
    name: string;
    type: string;
    isLegume: boolean;
    isCatchCrop: boolean;
}

export interface FieldCropPart {
    designation: string;
    crop: string;
    area: number;
    ecoSchemes: string[];
    designationZal?: string; 
    paymentList?: string;
    plantMix?: string;
}

export interface FieldHistoryEntry {
  year: number;
  crop: string;
  appliedEcoSchemes: string[];
  area?: number; 
  eligibleArea?: number;
  cropParts?: FieldCropPart[];
  limingDate?: string;
  soilPh?: number;
  designation?: string;
}

export interface FarmProfile {
  producerId: string;
  totalAreaUR: number;
  entryConditionPoints: number;
}

export interface Field {
  id: string;
  name: string;
  registrationNumber?: string;
  area: number;
  eligibleArea: number;
  crop: CropType;
  history: FieldHistoryEntry[];
  voivodeship?: string;
  district?: string;
  commune?: string;
  precinctName?: string;
  precinctNumber?: string;
  mapSheet?: string;
}

export interface FarmData {
  farmName: string;
  profile: FarmProfile;
  fields: Field[];
}

export interface FarmerDocument {
  id: string;
  name: string;
  type: 'PDF' | 'CSV' | 'GML' | 'SHP' | 'OTHER';
  category: 'WNIOSEK' | 'MAPA' | 'REJESTR' | 'INNE'; 
  campaignYear: string;
  size: string;
  uploadDate: string;
  extractedText?: string;
}

export interface FarmerClient {
  producerId: string;
  advisorId?: number;
  firstName: string;
  lastName: string;
  farmName: string; 
  totalArea: number;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  lastContact: string;
  documents: FarmerDocument[];
}

export interface SubsidyRate {
  id: string;
  name: string;
  rate: number;
  unit: 'PLN/ha' | 'PLN/DJP' | 'PLN/pkt' | 'PLN/szt.' | 'PLN/kg' | 'EUR/ha';
  category: 'EKOSCHEMAT' | 'DOPLATA' | 'DOBROSTAN';
  year: number;
  shortName?: string;
  points?: number;
  combinableWith?: string;
  conflictsWith?: string[];
  description?: string;
}

export interface OptimizationResult {
  totalEstimatedSubsidy: number;
  recommendations: OptimizationRecommendation[];
  complianceNotes: string;
}

export interface OptimizationRecommendation {
  fieldId: string;
  fieldName: string;
  suggestedEcoSchemes: string[];
  reasoning: string;
  potentialGain: number;
}

export interface FarmAnalysisReport {
    validationIssues: ValidationIssue[];
    ecoSchemes: EcoSchemeCalculation[];
    totalPoints: number;
    requiredPoints: number;
    isEntryConditionMet: boolean;
    totalEstimatedValue: number;
}

export interface ValidationIssue {
    type: 'ERROR' | 'WARNING' | 'CONFLICT';
    fieldId: string;
    fieldName: string;
    message: string;
    relatedSchemes?: string[];
}

export interface EcoSchemeCalculation {
    schemeCode: string;
    totalPoints: number;
    totalArea: number;
    estimatedValue: number;
}

export interface FarmTask {
    id: string;
    title: string;
    date: string;
    priority: TaskPriority;
    status: 'PENDING' | 'DONE';
    type: TaskType;
    fieldId?: string;
    fieldName?: string;
    description?: string;
}

export interface CsvTemplate {
    id: string;
    name: string;
    type: CsvTemplateType;
    year: number;
    mappings: Record<string, string>; 
    separator: string;
}

export type ViewState = 'DASHBOARD' | 'FIELDS' | 'DOCUMENTS' | 'OPTIMIZATION' | 'CHAT' | 'CALENDAR' | 'FARMERS_LIST' | 'ADMIN' | 'SIMULATION' | 'HIERARCHY' | 'SEMANTIC_EXPLORER' | 'FARMER_APPLICATION' | 'OPERATIONS_LOG';
