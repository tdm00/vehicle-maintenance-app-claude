/** A small, illustrative set of make-level differences. General guidance, not manufacturer data. */
export interface MakeOverride {
  serviceTypeId: string;
  makes: string[];
  fromYear: number;
  miles: number | null;
  months: number | null;
}

export const MAKE_OVERRIDES: MakeOverride[] = [
  {
    serviceTypeId: 'oil-change',
    makes: ['Toyota', 'Lexus', 'BMW', 'Mercedes-Benz'],
    fromYear: 2018,
    miles: 10_000,
    months: 12,
  },
  { serviceTypeId: 'oil-change', makes: ['Subaru'], fromYear: 2015, miles: 6_000, months: 6 },
  { serviceTypeId: 'spark-plugs', makes: ['Subaru'], fromYear: 2015, miles: 60_000, months: 72 },
  {
    serviceTypeId: 'transmission-fluid',
    makes: ['Honda', 'Acura'],
    fromYear: 2010,
    miles: 30_000,
    months: 36,
  },
];
