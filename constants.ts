


import { CropType, SubsidyRate, Field, FarmerClient, CsvMappingField, CsvTemplate, FarmTask } from './types';

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
  'Mieszanka'
];

// Tabela: Stawki_2026 (Prognoza / Demo)
export const SUBSIDY_RATES_2026: SubsidyRate[] = [
  { id: 'S01', name: 'Rośliny bobowate', rate: 700, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 },
  { id: 'S02', name: 'Międzyplony ozime', rate: 700, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 },
  { id: 'S03', name: 'Integrowana Produkcja', rate: 650, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 },
  { id: 'S04', name: 'Wymieszanie obornika', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 }, 
  { id: 'S05', name: 'Dobrostan (Bydło)', rate: 380, unit: 'PLN/DJP', category: 'DOBROSTAN', year: 2026 },
  { id: 'S06', name: 'Wartość punktu', rate: 100, unit: 'PLN/pkt', category: 'EKOSCHEMAT', year: 2026 },
];

// Tabela: Stawki_2025 (Oficjalne)
export const SUBSIDY_RATES_2025: SubsidyRate[] = [
  // --- Tabela 1. Płatności Bezpośrednie ---
  { id: 'P25_01', name: 'Podstawowe wsparcie dochodów', rate: 488.55, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_02', name: 'Płatność redystrybucyjna', rate: 176.84, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_03', name: 'Płatność dla młodych rolników', rate: 248.16, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_04', name: 'Płatność do bydła', rate: 322.49, unit: 'PLN/szt.', category: 'DOPLATA', year: 2025 }, // szt. traktowane jako unit
  { id: 'P25_05', name: 'Płatność do krów', rate: 412.63, unit: 'PLN/szt.', category: 'DOPLATA', year: 2025 },
  { id: 'P25_06', name: 'Płatność do owiec', rate: 110.16, unit: 'PLN/szt.', category: 'DOPLATA', year: 2025 },
  { id: 'P25_07', name: 'Płatność do kóz', rate: 48.12, unit: 'PLN/szt.', category: 'DOPLATA', year: 2025 },
  { id: 'P25_08', name: 'Płatność do roślin strączkowych na nasiona', rate: 879.96, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_09', name: 'Płatność do roślin pastewnych', rate: 430.18, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_10', name: 'Płatność do chmielu', rate: 1864.49, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_11', name: 'Płatność do ziemniaków skrobiowych', rate: 1580.89, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_12', name: 'Płatność do buraków cukrowych', rate: 1284.14, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_13', name: 'Płatność do pomidorów', rate: 2097.56, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_14', name: 'Płatność do truskawek', rate: 1495.79, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_15', name: 'Płatność do lnu', rate: 542.69, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_16', name: 'Płatność do konopi włóknistych', rate: 168.99, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_17', name: 'Płatność niezwiązana do tytoniu - Virginia', rate: 2.24, unit: 'PLN/kg', category: 'DOPLATA', year: 2025 }, // unit kg custom logic handled as text
  { id: 'P25_18', name: 'Płatność niezwiązana do tytoniu - pozostałe', rate: 2.24, unit: 'PLN/kg', category: 'DOPLATA', year: 2025 },
  { id: 'P25_19', name: 'Uzupełniająca płatność podstawowa', rate: 55.95, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },

  // --- Tabela 2. Ekoschematy Obszarowe ---
  { id: 'E25_01', name: 'Ekstensywne użytkowanie TUZ z obsadą zwierząt', rate: 437.60, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_02', name: 'Międzyplony ozime lub wsiewki śródplonowe', rate: 437.60, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_03', name: 'Plan nawożenia - wariant podstawowy', rate: 87.52, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_04', name: 'Plan nawożenia - wariant z wapnowaniem', rate: 262.56, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_05', name: 'Zróżnicowana struktura upraw', rate: 233.13, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_06', name: 'Wymieszanie obornika na gruntach ornych (12h)', rate: 175.04, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_07', name: 'Stosowanie nawozów płynnych (nierozbryzgowo)', rate: 262.56, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_08', name: 'Uproszczone systemy uprawy', rate: 262.56, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_09', name: 'Wymieszanie słomy z glebą', rate: 87.52, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_10', name: 'Obszary z roślinami miododajnymi', rate: 931.07, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_11', name: 'Integrowana Produkcja Roślin (Sadownicze)', rate: 1185.24, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_12', name: 'Integrowana Produkcja Roślin (Jagodowe)', rate: 1069.41, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_13', name: 'Integrowana Produkcja Roślin (Rolnicze)', rate: 505.18, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_14', name: 'Integrowana Produkcja Roślin (Warzywne)', rate: 1069.41, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_15', name: 'Biologiczna uprawa (Środki ochrony)', rate: 310.88, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_16', name: 'Biologiczna uprawa (Prep. mikrobiologiczne)', rate: 87.52, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_17', name: 'Retencjonowanie wody na TUZ', rate: 245.98, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_18', name: 'Grunty wyłączone z produkcji', rate: 437.57, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_19', name: 'Materiał siewny (Zboża)', rate: 104.15, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_20', name: 'Materiał siewny (Strączkowe)', rate: 168.93, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
  { id: 'E25_21', name: 'Materiał siewny (Ziemniaki)', rate: 436.76, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2025 },
];

export const MOCK_FIELDS: Field[] = [
  { 
    id: '1', 
    name: 'Działka za lasem', 
    registrationNumber: '145/2',
    area: 5.4, 
    eligibleArea: 5.4,
    crop: 'Pszenica', 
    history: [
        { year: 2025, crop: 'Rzepak', appliedEcoSchemes: ['E_IPR'], soilPh: 5.5 },
        { year: 2024, crop: 'Pszenica', appliedEcoSchemes: [], limingDate: '2024-09-10' }, // Wapnowanie < 4 lata temu
        { year: 2023, crop: 'Kukurydza', appliedEcoSchemes: ['E_OPN'] },
        { year: 2022, crop: 'Pszenica', appliedEcoSchemes: [] },
        { year: 2021, crop: 'Burak Cukrowy', appliedEcoSchemes: [] }
    ]
  },
  { 
    id: '2', 
    name: 'Przy drodze', 
    registrationNumber: '88/1',
    area: 2.1, 
    eligibleArea: 2.05,
    crop: 'Rzepak', 
    history: [
        { year: 2025, crop: 'Jęczmień', appliedEcoSchemes: [], soilPh: 6.2 },
        { year: 2024, crop: 'Mieszanka', appliedEcoSchemes: ['E_USU'] },
        { year: 2023, crop: 'Pszenica', appliedEcoSchemes: [] },
        { year: 2022, crop: 'Ziemniaki', appliedEcoSchemes: [] },
        { year: 2021, crop: 'Rzepak', appliedEcoSchemes: [], limingDate: '2021-08-15' } // Wapnowanie > 4 lata (kwalifikuje się ponownie w 2026?)
    ]
  },
  { 
    id: '3', 
    name: 'Łąka nad rzeką', 
    registrationNumber: '12/4',
    area: 3.5, 
    eligibleArea: 3.5,
    crop: 'Trawy', 
    history: [
        { year: 2025, crop: 'Trawy', appliedEcoSchemes: ['E_WOD'] },
        { year: 2024, crop: 'Trawy', appliedEcoSchemes: [] },
        { year: 2023, crop: 'Trawy', appliedEcoSchemes: [] },
        { year: 2022, crop: 'Trawy', appliedEcoSchemes: [] },
        { year: 2021, crop: 'Trawy', appliedEcoSchemes: [] }
    ]
  },
];

export const MOCK_CLIENTS: FarmerClient[] = [];

export const MOCK_TASKS: FarmTask[] = [
    { id: 't1', title: 'Wapnowanie', description: 'Zastosować wapno magnezowe 2t/ha przed orką.', date: '2025-08-20', fieldId: '1', fieldName: 'Działka za lasem', priority: 'HIGH', status: 'PENDING', type: 'AGRO' },
    { id: 't2', title: 'Złożyć wniosek o dopłaty', description: 'Ostateczny termin składania zmian do wniosku.', date: '2025-05-15', priority: 'HIGH', status: 'DONE', type: 'DEADLINE' },
    { id: 't3', title: 'Siew poplonu', description: 'Gorczyca + rzodkiew oleista. Wymóg ekoschematu.', date: '2025-09-01', fieldId: '2', fieldName: 'Przy drodze', priority: 'MEDIUM', status: 'PENDING', type: 'AGRO' },
    { id: 't4', title: 'Rejestr Zabiegów', description: 'Uzupełnić ewidencję ŚOR za czerwiec.', date: '2025-07-10', priority: 'LOW', status: 'PENDING', type: 'CONTROL' },
];

// --- CSV CONFIGURATION ---

export const CSV_PARCEL_FIELDS: CsvMappingField[] = [
    { key: 'name', label: 'Identyfikator działki ewidencyjnej', required: true },
    { key: 'registrationNumber', label: 'Nr Ewidencyjny', required: true },
    { key: 'area', label: 'Powierzchnia Całkowita [ha]', required: true },
    { key: 'eligibleArea', label: 'Powierzchnia Kwalifikowana [ha]', required: false },
];

export const CSV_CROP_FIELDS: CsvMappingField[] = [
    { key: 'registrationNumber', label: 'Nr Ewidencyjny (Klucz)', required: true },
    { key: 'year', label: 'Rok Uprawy', required: true },
    { key: 'crop', label: 'Roślina', required: true },
    { key: 'ecoSchemes', label: 'Ekoschematy (po przecinku)', required: false },
];

export const DEFAULT_CSV_TEMPLATES: CsvTemplate[] = [
    {
        id: 'tpl_default_parcels',
        name: 'Domyślny - Ewidencja ARiMR',
        type: 'PARCELS',
        separator: ';',
        mappings: {
            'name': 'Identyfikator działki ewidencyjnej',
            'registrationNumber': 'Nr działki ewidencyjnej',
            'area': 'Pow. gruntów ornych ogółem na działce [ha]',
            'eligibleArea': 'Hektar kwalifikujący się ogółem na działce [ha]'
        }
    },
    {
        id: 'tpl_simple',
        name: 'Prosty Import (Excel)',
        type: 'PARCELS',
        separator: ';',
        mappings: {
            'name': 'Nazwa',
            'registrationNumber': 'Numer',
            'area': 'Powierzchnia',
            'eligibleArea': 'PEG'
        }
    },
    {
        id: 'tpl_default_crops',
        name: 'Domyślny - Struktura Zasiewów ARiMR',
        type: 'CROPS',
        separator: ';',
        mappings: {
            'registrationNumber': 'Nr działki ewidencyjnej',
            'crop': 'Roślina uprawna',
            'ecoSchemes': 'Lista ekoschematów'
        }
    }
];
