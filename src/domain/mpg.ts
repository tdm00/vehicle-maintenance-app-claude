import type { FuelFillUp } from './schemas';

export interface FillUpWithMpg {
  fillUp: FuelFillUp;
  /** Null for the first fill, a partial fill, or a reading that can't be measured. */
  mpg: number | null;
}

export interface FuelStats {
  /** Newest first. */
  entries: FillUpWithMpg[];
  overallMpg: number | null;
  totalCostCents: number;
  totalGallons: number;
}

function chronological(a: FuelFillUp, b: FuelFillUp): number {
  return a.odometer - b.odometer || a.date.localeCompare(b.date);
}

/**
 * MPG is only measurable between two full tanks. The first full fill starts the measurement, and
 * its gallons are excluded because they were burned before tracking began. Gallons from partial
 * fills roll into the next full fill. Nothing here is stored, so edits and deletes stay correct.
 */
export function computeFuelStats(fillUps: FuelFillUp[]): FuelStats {
  const sorted = [...fillUps].sort(chronological);
  const entries: FillUpWithMpg[] = [];

  let anchorOdometer: number | null = null;
  let firstFullOdometer: number | null = null;
  let lastFullOdometer: number | null = null;
  let gallonsSinceAnchor = 0;
  let measuredGallons = 0;

  for (const fillUp of sorted) {
    let mpg: number | null = null;

    if (anchorOdometer !== null) gallonsSinceAnchor += fillUp.gallons;

    if (fillUp.isFull) {
      if (anchorOdometer === null) {
        firstFullOdometer = fillUp.odometer;
      } else {
        const miles = fillUp.odometer - anchorOdometer;
        if (miles > 0 && gallonsSinceAnchor > 0) mpg = miles / gallonsSinceAnchor;
        measuredGallons += gallonsSinceAnchor;
      }
      anchorOdometer = fillUp.odometer;
      lastFullOdometer = fillUp.odometer;
      gallonsSinceAnchor = 0;
    }

    entries.push({ fillUp, mpg });
  }

  const totalMiles =
    firstFullOdometer !== null && lastFullOdometer !== null
      ? lastFullOdometer - firstFullOdometer
      : 0;

  return {
    entries: entries.reverse(),
    overallMpg: totalMiles > 0 && measuredGallons > 0 ? totalMiles / measuredGallons : null,
    totalCostCents: sorted.reduce((sum, fillUp) => sum + fillUp.costCents, 0),
    totalGallons: sorted.reduce((sum, fillUp) => sum + fillUp.gallons, 0),
  };
}

export function pricePerGallonCents(fillUp: Pick<FuelFillUp, 'costCents' | 'gallons'>): number {
  return Math.round(fillUp.costCents / fillUp.gallons);
}
