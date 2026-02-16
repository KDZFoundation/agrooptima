
import { CropType, SubsidyRate, Field, FarmerClient, CsvMappingField, CsvTemplate, FarmTask, CropDefinition } from './types';

export const CROP_TYPES: CropType[] = [
  'Pszenica', 
  'Rzepak', 
  'Kukurydza', 
  'Burak Cukrowy', 
  'Jęczmień', 
  'Żyto', 
  'Ziemniaki', 
  'Trawy',
  'Rośliny Bobowate',
  'Mieszanka',
  'Nieznana'
];

export const DEFAULT_CROP_DICTIONARY: CropDefinition[] = [
    { id: 'C01', name: 'Pszenica ozima', type: 'Zboża', isLegume: false, isCatchCrop: false },
    { id: 'C02', name: 'Rzepak ozimy', type: 'Oleiste', isLegume: false, isCatchCrop: false },
    { id: 'C03', name: 'Kukurydza na ziarno', type: 'Zboża', isLegume: false, isCatchCrop: false },
    { id: 'C04', name: 'Kukurydza na kiszonkę', type: 'Pasze', isLegume: false, isCatchCrop: false },
    { id: 'C05', name: 'Burak Cukrowy', type: 'Okopowe', isLegume: false, isCatchCrop: false },
    { id: 'C06', name: 'Jęczmień jary', type: 'Zboża', isLegume: false, isCatchCrop: false },
    { id: 'C07', name: 'Żyto', type: 'Zboża', isLegume: false, isCatchCrop: false },
    { id: 'C08', name: 'Ziemniaki skrobiowe', type: 'Okopowe', isLegume: false, isCatchCrop: false },
    { id: 'C09', name: 'Łubin wąskolistny', type: 'Bobowate', isLegume: true, isCatchCrop: true },
    { id: 'C10', name: 'Groch siewny', type: 'Bobowate', isLegume: true, isCatchCrop: true },
    { id: 'C11', name: 'Chmiel', type: 'Specjalne', isLegume: false, isCatchCrop: false },
    { id: 'C12', name: 'Len', type: 'Włókniste', isLegume: false, isCatchCrop: false },
    { id: 'C13', name: 'Konopie włókniste', type: 'Włókniste', isLegume: false, isCatchCrop: false },
    { id: 'C14', name: 'Tytoń', type: 'Specjalne', isLegume: false, isCatchCrop: false },
    { id: 'C15', name: 'Trawy na GO', type: 'Trawy', isLegume: false, isCatchCrop: true },
];

export const SUBSIDY_RATES_2026: SubsidyRate[] = [
  { id: 'S26_01', name: 'Płatność do roślin bobowatych', rate: 700, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_BOB', points: 7 },
  { id: 'S26_02', name: 'Międzyplony ozime / wsiewki', rate: 500, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_MIO', points: 5 },
  { id: 'S26_03', name: 'Integrowana Produkcja Roślin', rate: 650, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_IPR', points: 6.5 },
  { id: 'S26_04', name: 'Wymieszanie obornika w 24h', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_WOD', points: 2 }, 
  { id: 'S26_05', name: 'Zróżnicowana struktura upraw', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_ZSU', points: 3 },
  { id: 'S26_06', name: 'Uproszczone systemy uprawy', rate: 400, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_USU', points: 4 },
  { id: 'S26_07', name: 'Biologiczna ochrona roślin', rate: 400, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_BOP', points: 4 },
  { id: 'S26_08', name: 'Retencjonowanie wody', rate: 280, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_RET', points: 2.8 },
  { id: 'S26_09', name: 'Obszary z roślinami miododajnymi', rate: 1200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_OPN', points: 12 },
];

export const SUBSIDY_RATES_2025: SubsidyRate[] = [
  { id: 'P25_01', name: 'Podstawowe wsparcie dochodów', rate: 488.55, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_02', name: 'Płatność redystrybucyjna', rate: 176.84, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_03', name: 'Płatność dla młodych rolników', rate: 248.16, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_08', name: 'Płatność do roślin strączkowych', rate: 879.96, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_12', name: 'Płatność do buraków cukrowych', rate: 1284.14, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_19', name: 'Uzupełniająca płatność podstawowa', rate: 55.95, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  
  { id: 'E25_01', name: 'Zróżnicowana struktura upraw', rate: 300.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_ZSU', points: 3 },
  { id: 'E25_02', name: 'Uproszczone systemy uprawy', rate: 400.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_USU', points: 4 },
  { id: 'E25_03', name: 'Wymieszanie obornika z glebą (24h)', rate: 200.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_WOD', points: 2 },
  { id: 'E25_04', name: 'Stosowanie nawozów naturalnych płynnych', rate: 300.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_GNO', points: 3 },
  { id: 'E25_05', name: 'Międzyplony ozime / wsiewki', rate: 500.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_MIO', points: 5 },
  { id: 'E25_06', name: 'Integrowana Produkcja Roślin', rate: 1300.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_IPR', points: 13 },
  { id: 'E25_07', name: 'Biologiczna ochrona roślin', rate: 400.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_BOP', points: 4 },
  { id: 'E25_08', name: 'Obszary z roślinami miododajnymi', rate: 1200.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_OPN', points: 12 },
  { id: 'E25_09', name: 'Opracowanie i przestrzeganie planu nawożenia', rate: 100.00, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_PLA', points: 1 },
];

export const MOCK_CLIENTS: FarmerClient[] = [
    {
        producerId: '050237165',
        firstName: 'Piotr',
        lastName: 'Linkowski',
        farmName: 'Gospodarstwo Piotr Linkowski',
        totalArea: 48.50,
        status: 'ACTIVE',
        lastContact: '2025-05-15',
        documents: []
    }
];

export const MOCK_FIELDS: Field[] = [];
export const MOCK_TASKS: FarmTask[] = [];

export const CSV_PARCEL_FIELDS: CsvMappingField[] = [
    { key: 'name', label: 'Identyfikator działki ewidencyjnej', required: true },
    { key: 'voivodeship', label: 'Województwo', required: false },
    { key: 'district', label: 'Powiat', required: false },
    { key: 'commune', label: 'Gmina', required: false },
    { key: 'precinctName', label: 'Nazwa obrębu ewidencyjnego', required: false },
    { key: 'precinctNumber', label: 'Nr obrębu ewidencyjnego', required: false },
    { key: 'mapSheet', label: 'Nr arkusza mapy', required: false },
    { key: 'registrationNumber', label: 'Nr działki ewidencyjnej', required: true },
    { key: 'eligibleArea', label: 'Hektar kwalifikujący się ogółem na działce [ha]', required: false },
    { key: 'area', label: 'Pow. gruntów ornych ogółem na działce [ha]', required: true },
];

export const CSV_CROP_FIELDS: CsvMappingField[] = [
    { key: 'registrationNumber', label: 'Nr działki ewidencyjnej', required: true },
    { key: 'crop', label: 'Roślina uprawna', required: true },
    { key: 'area', label: 'Powierzchnia [ha]', required: false },
    { key: 'specificArea', label: 'Powierzchnia uprawy w granicach działki ewidencyjnej - ha', required: false },
    { key: 'ecoSchemes', label: 'Lista ekoschematów', required: false },
    { key: 'designation', label: 'Oznaczenie Uprawy / działki rolnej', required: false },
];

const DEFAULT_PARCELS_MAPPING = {
    name: 'Identyfikator działki ewidencyjnej',
    voivodeship: 'Województwo',
    district: 'Powiat',
    commune: 'Gmina',
    precinctName: 'Nazwa obrębu ewidencyjnego',
    precinctNumber: 'Nr obrębu ewidencyjnego',
    map_sheet: 'Nr arkusza mapy',
    registrationNumber: 'Nr działki ewidencyjnej',
    eligibleArea: 'Hektar kwalifikujący się ogółem na działce [ha]',
    area: 'Pow. gruntów ornych ogółem na działce [ha]',
};

export const DEFAULT_CSV_TEMPLATES: CsvTemplate[] = [
    {
        id: 'default_parcels_2025',
        name: 'ARiMR 2025 - Działki (Ewidencja)',
        type: 'PARCELS',
        year: 2025,
        separator: ',',
        mappings: DEFAULT_PARCELS_MAPPING
    },
    {
        id: 'default_crops_2025',
        name: 'ARiMR 2025 - Zasiewy (Struktura)',
        type: 'CROPS',
        year: 2025,
        separator: ',',
        mappings: {
            registrationNumber: 'Nr działki ewidencyjnej',
            crop: 'Roślina uprawna',
            area: 'Powierzchnia [ha]',
            specificArea: 'Powierzchnia uprawy w granicach działki ewidencyjnej - ha',
            ecoSchemes: 'Lista ekoschematów',
            designation: 'Oznaczenie Uprawy / działki rolnej'
        }
    }
];
