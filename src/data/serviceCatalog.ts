import { POWERTRAINS, type Powertrain, type ServiceType } from '../domain/schemas';

const ALL = [...POWERTRAINS];
const COMBUSTION: Powertrain[] = ['gas', 'diesel', 'hybrid'];

function seed(
  id: string,
  name: string,
  intervalMiles: number | null,
  intervalMonths: number | null,
  powertrains: Powertrain[] = ALL,
): ServiceType {
  return {
    id,
    name,
    intervalMiles,
    intervalMonths,
    powertrains,
    isCustom: false,
    isHidden: false,
    intervalsEdited: false,
  };
}

/** The starting catalog. It's copied into user data, where it can be edited. */
export const DEFAULT_SERVICE_TYPES: ServiceType[] = [
  seed('oil-change', 'Oil change', 5_000, 6, COMBUSTION),
  seed('tire-rotation', 'Tire rotation', 7_500, 6),
  seed('brake-inspection', 'Brake inspection', 15_000, 12),
  seed('engine-air-filter', 'Engine air filter', 15_000, 24, COMBUSTION),
  seed('cabin-air-filter', 'Cabin air filter', 15_000, 12),
  seed('wiper-blades', 'Wiper blades', null, 12),
  seed('battery-check', '12V battery check', null, 12),
  seed('brake-fluid', 'Brake fluid', null, 36),
  seed('coolant', 'Coolant flush', 30_000, 36),
  seed('transmission-fluid', 'Transmission fluid', 60_000, 60, COMBUSTION),
  seed('spark-plugs', 'Spark plugs', 60_000, 72, ['gas', 'hybrid']),
  seed('tire-replacement', 'Tire replacement', 50_000, 72),
];
