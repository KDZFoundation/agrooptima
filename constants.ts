
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
  // Dopłaty podstawowe (Symulacja 2026 - założenie podobne do 2025)
  { id: 'P26_01', name: 'Podstawowe wsparcie dochodów', rate: 488.55, unit: 'PLN/ha', category: 'DOPLATA', year: 2026 },
  { id: 'P26_02', name: 'Płatność redystrybucyjna', rate: 176.84, unit: 'PLN/ha', category: 'DOPLATA', year: 2026 },
  { id: 'P26_03', name: 'Płatność dla młodych rolników', rate: 248.16, unit: 'PLN/ha', category: 'DOPLATA', year: 2026 },
  
  // Ekoschematy - Rolnictwo Węglowe (Punkty)
  { id: 'E26_01', name: 'Ekstensywne użytkowanie TUZ z obsadą zwierząt', rate: 500, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_EKSTUZ', points: 5 },
  { id: 'E26_02', name: 'Międzyplony ozime / wsiewki śródplonowe', rate: 500, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_MPW', points: 5 },
  { id: 'E26_03', name: 'Plan nawożenia - wariant podstawowy', rate: 100, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_PLAN', points: 1 },
  { id: 'E26_04', name: 'Plan nawożenia - wariant z wapnowaniem', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_OPN', points: 3 },
  { id: 'E26_05', name: 'Zróżnicowana struktura upraw', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_ZSU', points: 3 },
  { id: 'E26_06', name: 'Wymieszanie obornika na GO w 12h', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_OBR', points: 2 },
  { id: 'E26_07', name: 'Stosowanie płynnych nawozów naturalnych', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_PN', points: 3 },
  { id: 'E26_08', name: 'Uproszczone systemy uprawy', rate: 400, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_USU', points: 4, conflictsWith: ['E_WSG'] },
  { id: 'E26_09', name: 'Wymieszanie słomy z glebą', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_WSG', points: 2, conflictsWith: ['E_USU'] },

  // Ekoschematy - Pozostałe (Stawki obszarowe, przeliczone z EUR ~4.3 PLN)
  { id: 'E26_10', name: 'Obszary z roślinami miododajnymi', rate: 1157.60, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_MIOD' },
  { id: 'E26_11', name: 'Integrowana Produkcja Roślin', rate: 1256.16, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_IPR' },
  { id: 'E26_12', name: 'Biologiczna ochrona upraw', rate: 386.53, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_BOU' },
  { id: 'E26_13', name: 'Retencjonowanie wody na TUZ', rate: 271.55, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026, shortName: 'E_RET' },
];

export const SUBSIDY_RATES_2025: SubsidyRate[] = [
  { id: 'P25_01', name: 'Podstawowe wsparcie dochodów', rate: 488.55, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_02', name: 'Płatność redystrybucyjna', rate: 176.84, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_03', name: 'Płatność dla młodych rolników', rate: 248.16, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_08', name: 'Płatność do roślin strączkowych', rate: 879.96, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_12', name: 'Płatność do buraków cukrowych', rate: 1284.14, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_19', name: 'Uzupełniająca płatność podstawowa', rate: 55.95, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  
  // Ekoschematy - Rolnictwo Węglowe
  { id: 'E25_01', name: 'Ekstensywne użytkowanie TUZ z obsadą zwierząt', rate: 500, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_EKSTUZ', points: 5 },
  { id: 'E25_02', name: 'Międzyplony ozime / wsiewki śródplonowe', rate: 500, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_MPW', points: 5 },
  { id: 'E25_03', name: 'Plan nawożenia - wariant podstawowy', rate: 100, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_PLAN', points: 1 },
  { id: 'E25_04', name: 'Plan nawożenia - wariant z wapnowaniem', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_OPN', points: 3 },
  { id: 'E25_05', name: 'Zróżnicowana struktura upraw', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_ZSU', points: 3 },
  { id: 'E25_06', name: 'Wymieszanie obornika na GO w 12h', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_OBR', points: 2 },
  { id: 'E25_07', name: 'Stosowanie płynnych nawozów naturalnych', rate: 300, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_PN', points: 3 },
  { id: 'E25_08', name: 'Uproszczone systemy uprawy', rate: 400, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_USU', points: 4, conflictsWith: ['E_WSG'] },
  { id: 'E25_09', name: 'Wymieszanie słomy z glebą', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_WSG', points: 2, conflictsWith: ['E_USU'] },

  // Ekoschematy - Pozostałe
  { id: 'E25_10', name: 'Obszary z roślinami miododajnymi', rate: 1157.60, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_MIOD' },
  { id: 'E25_11', name: 'Integrowana Produkcja Roślin', rate: 1256.16, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_IPR' },
  { id: 'E25_12', name: 'Biologiczna ochrona upraw', rate: 386.53, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_BOU' },
  { id: 'E25_13', name: 'Retencjonowanie wody na TUZ', rate: 271.55, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025, shortName: 'E_RET' },
];

export const SUBSIDY_RATES_2024: SubsidyRate[] = [
    // Podstawowe 2024
    { id: 'P24_01', name: 'Podstawowe wsparcie dochodów (PWD)', rate: 483.20, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_02', name: 'Płatność redystrybucyjna', rate: 168.79, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_03', name: 'Płatność dla młodych rolników', rate: 256.55, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_04', name: 'Płatność do roślin strączkowych na nasiona', rate: 794.08, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_05', name: 'Płatność do roślin pastewnych', rate: 430.18, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_06', name: 'Płatność do ziemniaków skrobiowych', rate: 1580.89, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_07', name: 'Płatność do buraków cukrowych', rate: 1253.34, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },
    { id: 'P24_17', name: 'Uzupełniająca płatność podstawowa', rate: 63.22, unit: 'PLN/ha', category: 'DOPLATA', year: 2024 },

    // Ekoschematy 2024 - Rolnictwo Węglowe
    { id: 'E24_01', name: 'Ekstensywne użytkowanie TUZ z obsadą zwierząt', rate: 435.10, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_EKSTUZ', points: 5 },
    { id: 'E24_02', name: 'Międzyplony ozime / wsiewki śródplonowe', rate: 435.10, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_MPW', points: 5 },
    { id: 'E24_03', name: 'Plan nawożenia - wariant podstawowy', rate: 87.02, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_PLAN', points: 1 },
    { id: 'E24_04', name: 'Plan nawożenia - wariant z wapnowaniem', rate: 261.06, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_OPN', points: 3 },
    { id: 'E24_05', name: 'Zróżnicowana struktura upraw', rate: 225.01, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_ZSU', points: 3 },
    { id: 'E24_06', name: 'Wymieszanie obornika na GO w 12h', rate: 174.04, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_OBR', points: 2 },
    { id: 'E24_07', name: 'Stosowanie płynnych nawozów naturalnych', rate: 261.06, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_PN', points: 3 },
    { id: 'E24_08', name: 'Uproszczone systemy uprawy', rate: 251.94, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_USU', points: 4, conflictsWith: ['E_WSG'] },
    { id: 'E24_09', name: 'Wymieszanie słomy z glebą', rate: 134.60, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_WSG', points: 2, conflictsWith: ['E_USU'] },

    // Ekoschematy 2024 - Pozostałe
    { id: 'E24_10', name: 'Obszary z roślinami miododajnymi', rate: 898.66, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_MIOD' },
    { id: 'E24_11', name: 'Integrowana Produkcja Roślin', rate: 818.92, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_IPR' },
    { id: 'E24_12', name: 'Biologiczna ochrona upraw', rate: 300.06, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_BOU' },
    { id: 'E24_13', name: 'Retencjonowanie wody na TUZ', rate: 244.57, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2024, shortName: 'E_RET' },
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
