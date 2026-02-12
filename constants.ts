
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

// Tabela: Stawki_2026 (Prognoza / Demo)
export const SUBSIDY_RATES_2026: SubsidyRate[] = [
  { id: 'S01', name: 'Rośliny bobowate', rate: 700, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 },
  { id: 'S02', name: 'Międzyplony ozime', rate: 700, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 },
  { id: 'S03', name: 'Integrowana Produkcja', rate: 650, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 },
  { id: 'S04', name: 'Wymieszanie obornika', rate: 200, unit: 'PLN/ha', category: 'EKOSCHEMAT', year: 2026 }, 
  { id: 'S05', name: 'Dobrostan (Bydło)', rate: 380, unit: 'PLN/DJP', category: 'DOBROSTAN', year: 2026 },
  { id: 'S06', name: 'Wartość punktu', rate: 100, unit: 'PLN/pkt', category: 'EKOSCHEMAT', year: 2026 },
];

// Tabela: Stawki_2025 (Zaktualizowane wg PDF ARiMR)
export const SUBSIDY_RATES_2025: SubsidyRate[] = [
  // --- Tabela 1. Płatności Bezpośrednie (PDF Tabela 1) ---
  { id: 'P25_01', name: 'Podstawowe wsparcie dochodów', rate: 488.55, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_02', name: 'Płatność redystrybucyjna', rate: 176.84, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_03', name: 'Płatność dla młodych rolników', rate: 248.16, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },
  { id: 'P25_04', name: 'Płatność do bydła', rate: 322.49, unit: 'PLN/szt.', category: 'DOPLATA', year: 2025 },
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
  { id: 'P25_17', name: 'Płatność niezwiązana do tytoniu - Virginia', rate: 2.24, unit: 'PLN/kg', category: 'DOPLATA', year: 2025 },
  { id: 'P25_18', name: 'Płatność niezwiązana do tytoniu - pozostałe', rate: 2.24, unit: 'PLN/kg', category: 'DOPLATA', year: 2025 },
  { id: 'P25_19', name: 'Uzupełniająca płatność podstawowa', rate: 55.95, unit: 'PLN/ha', category: 'DOPLATA', year: 2025 },

  // --- Tabela 2. Ekoschematy Obszarowe (PDF Tabela 2) ---
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

export const MOCK_FIELDS: Field[] = [];

export const MOCK_CLIENTS: FarmerClient[] = [
  { producerId: "050237165", firstName: "Piotr", lastName: "Linkowski", totalArea: 0.0, status: "ACTIVE", lastContact: "2023-10-05", documents: [], farmName: "Piotr Linkowski Farm" },
  { producerId: "077123456", firstName: "Piotr", lastName: "Nowak", totalArea: 45.5, status: "PENDING", lastContact: "2023-09-28", documents: [], farmName: "Piotr Nowak Farm" },
  { producerId: "055987654", firstName: "Maria", lastName: "Wiśniewska", totalArea: 8.2, status: "COMPLETED", lastContact: "2023-10-01", documents: [], farmName: "Maria Wiśniewska Farm" },
  { producerId: "088456123", firstName: "Tadeusz", lastName: "Wójcik", totalArea: 124.0, status: "ACTIVE", lastContact: "2023-10-10", documents: [], farmName: "Tadeusz Wójcik Farm" },
  { producerId: "012345678", firstName: "Krzysztof", lastName: "Zieliński", totalArea: 25.5, status: "PENDING", lastContact: "2023-10-12", documents: [], farmName: "Krzysztof Zieliński Farm" },
  { producerId: "098765432", firstName: "Barbara", lastName: "Mazur", totalArea: 150.0, status: "ACTIVE", lastContact: "2023-10-15", documents: [], farmName: "Barbara Mazur Farm" },
  { producerId: "055544433", firstName: "Andrzej", lastName: "Krawczyk", totalArea: 42.3, status: "COMPLETED", lastContact: "2023-10-08", documents: [], farmName: "Andrzej Krawczyk Farm" },
  { producerId: "011223344", firstName: "Stanisław", lastName: "Jankowski", totalArea: 12.5, status: "ACTIVE", lastContact: "2023-10-14", documents: [], farmName: "Stanisław Jankowski Farm" },
  { producerId: "066778899", firstName: "Ewa", lastName: "Dąbrowska", totalArea: 8.9, status: "PENDING", lastContact: "2023-10-11", documents: [], farmName: "Ewa Dąbrowska Farm" },
];

export const MOCK_TASKS: FarmTask[] = [
    { id: 't1', title: 'Wapnowanie', description: 'Zastosować wapno magnezowe 2t/ha przed orką.', date: '2025-08-20', fieldId: '1', fieldName: 'Działka za lasem', priority: 'HIGH', status: 'PENDING', type: 'AGRO' },
    { id: 't2', title: 'Złożyć wniosek o dopłaty', description: 'Ostateczny termin składania zmian do wniosku.', date: '2025-05-15', priority: 'HIGH', status: 'DONE', type: 'DEADLINE' },
    { id: 't3', title: 'Siew poplonu', description: 'Gorczyca + rzodkiew oleista. Wymóg ekoschematu.', date: '2025-09-01', fieldId: '2', fieldName: 'Przy drodze', priority: 'MEDIUM', status: 'PENDING', type: 'AGRO' },
    { id: 't4', title: 'Rejestr Zabiegów', description: 'Uzupełnić ewidencję ŚOR za czerwiec.', date: '2025-07-10', priority: 'LOW', status: 'PENDING', type: 'CONTROL' },
];

// --- CSV CONFIGURATION ---

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
    { key: 'designation', label: 'Oznaczenie Uprawy / działki rolnej', required: false },
    { key: 'designationZal', label: 'Oznaczenie Uprawy / działki rolnej ZAL', required: false },
    { key: 'area', label: 'Powierzchnia [ha]', required: false },
    { key: 'crop', label: 'Roślina uprawna', required: true },
    { key: 'paymentList', label: 'Lista płatności', required: false },
    { key: 'ecoSchemes', label: 'Lista ekoschematów', required: false },
    { key: 'isUnreported', label: 'Czy niezgłoszona', required: false },
    { key: 'plantMix', label: 'Rośliny w mieszance', required: false },
    { key: 'seedQuantity', label: 'Ilość nasion', required: false },
    { key: 'organic', label: 'Ekologiczna', required: false },
    { key: 'registrationNumber', label: 'Nr działki ewidencyjnej', required: true },
    { key: 'specificArea', label: 'Powierzchnia uprawy w granicach działki ewidencyjnej - ha', required: false },
    { key: 'onwType', label: 'Obszar ONW', required: false },
    { key: 'onwArea', label: 'Pow. obszaru ONW [ha]', required: false },
    // PRSK
    { key: 'prskPackage', label: 'Nr pakietu/wariantu/opcji - płatność PRSK', required: false },
    { key: 'prskPractice', label: 'Praktyka dodatkowa - płatność PRSK', required: false },
    { key: 'prskFruitTreeVariety', label: 'Odmiana drzew owocowych - płatność PRSK', required: false },
    { key: 'prskFruitTreeCount', label: 'L. drzew owocowych - płatność PRSK', required: false },
    { key: 'prskIntercropPlant', label: 'Rośliny w międzyplonie - płatność PRSK', required: false },
    { key: 'prskUsage', label: 'Sposób użytkowania - płatność PRSK', required: false },
    { key: 'prskVariety', label: 'Odmiana uprawy - płatność PRSK', required: false },
    // ZRSK
    { key: 'zrskPackage', label: 'Nr pakietu/wariantu/opcji - płatność ZRSK2327', required: false },
    { key: 'zrskPractice', label: 'Praktyka dodatkowa - płatność ZRSK2327', required: false },
    { key: 'zrskFruitTreeVariety', label: 'Odmiana drzew owocowych - płatność ZRSK2327', required: false },
    { key: 'zrskFruitTreeCount', label: 'L. drzew owocowych - płatność ZRSK2327', required: false },
    { key: 'zrskUsage', label: 'Sposób użytkowania - płatność ZRSK2327', required: false },
    { key: 'zrskVariety', label: 'Odmiana uprawy - płatność ZRSK2327', required: false },
    // RE
    { key: 'rePackage', label: 'Nr pakietu/wariantu/opcji - płatność RE2327', required: false },
    { key: 'notes', label: 'Uwagi', required: false },
];

export const DEFAULT_CSV_TEMPLATES: CsvTemplate[] = [
    {
        id: 'default_parcels_2025',
        name: 'Działki 2025 (Import ARiMR)',
        type: 'PARCELS',
        year: 2025,
        separator: ';',
        mappings: {
            name: 'Identyfikator działki ewidencyjnej',
            voivodeship: 'Województwo',
            district: 'Powiat',
            commune: 'Gmina',
            precinctName: 'Nazwa obrębu ewidencyjnego',
            precinctNumber: 'Nr obrębu ewidencyjnego',
            mapSheet: 'Nr arkusza mapy',
            registrationNumber: 'Nr działki ewidencyjnej',
            eligibleArea: 'Hektar kwalifikujący się ogółem na działce [ha]',
            area: 'Pow. gruntów ornych ogółem na działce [ha]',
        }
    },
    {
        id: 'default_crops_2025',
        name: 'Struktura Zasiewów 2025 (Import ARiMR)',
        type: 'CROPS',
        year: 2025,
        separator: ';',
        mappings: {
            designation: 'Oznaczenie Uprawy / działki rolnej',
            designationZal: 'Oznaczenie Uprawy / działki rolnej ZAL',
            area: 'Powierzchnia [ha]',
            crop: 'Roślina uprawna',
            paymentList: 'Lista płatności',
            ecoSchemes: 'Lista ekoschematów',
            isUnreported: 'Czy niezgłoszona',
            plantMix: 'Rośliny w mieszance',
            seedQuantity: 'Ilość nasion',
            organic: 'Ekologiczna',
            registrationNumber: 'Nr działki ewidencyjnej',
            specificArea: 'Powierzchnia uprawy w granicach działki ewidencyjnej - ha',
            onwType: 'Obszar ONW',
            onwArea: 'Pow. obszaru ONW [ha]',
            // PRSK
            prskPackage: 'Nr pakietu/wariantu/opcji - płatność PRSK',
            prskPractice: 'Praktyka dodatkowa - płatność PRSK',
            prskFruitTreeVariety: 'Odmiana drzew owocowych - płatność PRSK',
            prskFruitTreeCount: 'L. drzew owocowych - płatność PRSK',
            prskIntercropPlant: 'Rośliny w międzyplonie - płatność PRSK',
            prskUsage: 'Sposób użytkowania - płatność PRSK',
            prskVariety: 'Odmiana uprawy - płatność PRSK',
            // ZRSK
            zrskPackage: 'Nr pakietu/wariantu/opcji - płatność ZRSK2327',
            zrskPractice: 'Praktyka dodatkowa - płatność ZRSK2327',
            zrskFruitTreeVariety: 'Odmiana drzew owocowych - płatność ZRSK2327',
            zrskFruitTreeCount: 'L. drzew owocowych - płatność ZRSK2327',
            zrskUsage: 'Sposób użytkowania - płatność ZRSK2327',
            zrskVariety: 'Odmiana uprawy - płatność ZRSK2327',
            // RE
            rePackage: 'Nr pakietu/wariantu/opcji - płatność RE2327',
            notes: 'Uwagi'
        }
    }
];
