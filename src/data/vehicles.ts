import type { BodyType, Powertrain } from '../domain/schemas';

/** A hand-curated list of common vehicles. Anything else can be typed in. */
export const VEHICLES: Record<string, Record<string, BodyType>> = {
  Acura: { Integra: 'sedan', MDX: 'suv', RDX: 'suv', TLX: 'sedan' },
  Audi: { A3: 'sedan', A4: 'sedan', Q3: 'suv', Q5: 'suv', Q7: 'suv', 'e-tron': 'suv' },
  BMW: { '3 Series': 'sedan', '5 Series': 'sedan', X3: 'suv', X5: 'suv', i4: 'sedan' },
  Buick: { Enclave: 'suv', Encore: 'suv', Envision: 'suv' },
  Cadillac: { CT5: 'sedan', Escalade: 'suv', XT5: 'suv', Lyriq: 'suv' },
  Chevrolet: {
    Blazer: 'suv',
    'Bolt EV': 'hatchback',
    Camaro: 'coupe',
    Colorado: 'truck',
    Corvette: 'coupe',
    Equinox: 'suv',
    Express: 'van',
    Malibu: 'sedan',
    Silverado: 'truck',
    Suburban: 'suv',
    Tahoe: 'suv',
    Traverse: 'suv',
  },
  Chrysler: { '300': 'sedan', Pacifica: 'van' },
  Dodge: { Challenger: 'coupe', Charger: 'sedan', Durango: 'suv', 'Grand Caravan': 'van' },
  Ford: {
    Bronco: 'suv',
    Edge: 'suv',
    Escape: 'suv',
    Expedition: 'suv',
    Explorer: 'suv',
    'F-150': 'truck',
    'F-150 Lightning': 'truck',
    'F-250': 'truck',
    Focus: 'hatchback',
    Fusion: 'sedan',
    Maverick: 'truck',
    Mustang: 'coupe',
    'Mustang Mach-E': 'suv',
    Ranger: 'truck',
    Transit: 'van',
  },
  GMC: {
    Acadia: 'suv',
    Canyon: 'truck',
    Savana: 'van',
    Sierra: 'truck',
    Terrain: 'suv',
    Yukon: 'suv',
  },
  'Harley-Davidson': {
    'Road King': 'motorcycle',
    Sportster: 'motorcycle',
    'Street Glide': 'motorcycle',
  },
  Honda: {
    Accord: 'sedan',
    Civic: 'sedan',
    'CR-V': 'suv',
    'HR-V': 'suv',
    Odyssey: 'van',
    Passport: 'suv',
    Pilot: 'suv',
    Ridgeline: 'truck',
    Rebel: 'motorcycle',
  },
  Hyundai: {
    Elantra: 'sedan',
    'Ioniq 5': 'suv',
    Kona: 'suv',
    'Santa Fe': 'suv',
    Sonata: 'sedan',
    Tucson: 'suv',
  },
  Jeep: {
    Cherokee: 'suv',
    Compass: 'suv',
    Gladiator: 'truck',
    'Grand Cherokee': 'suv',
    Wrangler: 'suv',
  },
  Kia: {
    EV6: 'suv',
    Forte: 'sedan',
    Sorento: 'suv',
    Soul: 'hatchback',
    Sportage: 'suv',
    Telluride: 'suv',
  },
  Lexus: { ES: 'sedan', GX: 'suv', IS: 'sedan', NX: 'suv', RX: 'suv' },
  Mazda: { 'CX-30': 'suv', 'CX-5': 'suv', 'CX-9': 'suv', Mazda3: 'sedan', 'MX-5 Miata': 'coupe' },
  'Mercedes-Benz': {
    'C-Class': 'sedan',
    'E-Class': 'sedan',
    GLC: 'suv',
    GLE: 'suv',
    Sprinter: 'van',
  },
  Nissan: {
    Altima: 'sedan',
    Frontier: 'truck',
    Leaf: 'hatchback',
    Pathfinder: 'suv',
    Rogue: 'suv',
    Sentra: 'sedan',
    Titan: 'truck',
  },
  Ram: { '1500': 'truck', '2500': 'truck', ProMaster: 'van' },
  Rivian: { R1S: 'suv', R1T: 'truck' },
  Subaru: {
    Ascent: 'suv',
    Crosstrek: 'suv',
    Forester: 'suv',
    Impreza: 'sedan',
    Legacy: 'sedan',
    Outback: 'suv',
  },
  Tesla: {
    'Model 3': 'sedan',
    'Model S': 'sedan',
    'Model X': 'suv',
    'Model Y': 'suv',
    Cybertruck: 'truck',
  },
  Toyota: {
    '4Runner': 'suv',
    Camry: 'sedan',
    Corolla: 'sedan',
    Highlander: 'suv',
    Prius: 'hatchback',
    RAV4: 'suv',
    Sequoia: 'suv',
    Sienna: 'van',
    Tacoma: 'truck',
    Tundra: 'truck',
  },
  Volkswagen: { Atlas: 'suv', 'ID.4': 'suv', Jetta: 'sedan', Golf: 'hatchback', Tiguan: 'suv' },
  Volvo: { S60: 'sedan', XC40: 'suv', XC60: 'suv', XC90: 'suv' },
};

const ELECTRIC_MAKES = new Set(['Tesla', 'Rivian']);
const ELECTRIC_MODELS = new Set([
  'Bolt EV',
  'EV6',
  'F-150 Lightning',
  'ID.4',
  'Ioniq 5',
  'Leaf',
  'Lyriq',
  'Mustang Mach-E',
  'e-tron',
  'i4',
]);
const HYBRID_MODELS = new Set(['Prius']);

export const MAKES = Object.keys(VEHICLES).sort();

export function modelsFor(make: string): string[] {
  return Object.keys(VEHICLES[make] ?? {}).sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  );
}

export function bodyTypeFor(make: string, model: string): BodyType | undefined {
  return VEHICLES[make]?.[model];
}

export function powertrainFor(make: string, model: string): Powertrain {
  if (ELECTRIC_MAKES.has(make) || ELECTRIC_MODELS.has(model)) return 'electric';
  return HYBRID_MODELS.has(model) ? 'hybrid' : 'gas';
}

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: 'Sedan',
  coupe: 'Coupe',
  hatchback: 'Hatchback',
  suv: 'SUV',
  truck: 'Truck',
  van: 'Van',
  motorcycle: 'Motorcycle',
};

export const POWERTRAIN_LABELS: Record<Powertrain, string> = {
  gas: 'Gas',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
};

export const COLOR_OPTIONS = [
  { name: 'White', hex: '#f8fafc' },
  { name: 'Silver', hex: '#cbd5e1' },
  { name: 'Gray', hex: '#64748b' },
  { name: 'Black', hex: '#1e293b' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Green', hex: '#15803d' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Navy', hex: '#1e3a8a' },
  { name: 'Brown', hex: '#78350f' },
];
