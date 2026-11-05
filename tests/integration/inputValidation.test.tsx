import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { toNumber } from '../../src/components/formErrors';
import { garageStore } from '../../src/store/garageStore';
import { STORAGE_KEY } from '../../src/store/storage';
import { fill, garage, policy, record, serviceType, vehicle } from '../unit/builders';
import { renderApp, store } from './helpers';

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 4, 12), toFake: ['Date'] });
  return () => vi.useRealTimers();
});

const data = () =>
  garage({
    vehicles: [vehicle({ id: 'v1' })],
    serviceTypes: [serviceType()],
  });

describe('toNumber', () => {
  test.each([
    ['', undefined],
    ['  ', undefined],
    ['45', 45],
    ['45,000', 45000],
    ['12.5', 12.5],
    ['.5', 0.5],
  ])('%j is %s', (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });

  test.each(['68k', 'abc', '1e5', '0x10', '-5', '1.2.3', 'Infinity'])(
    'flags %j as invalid, not blank',
    (input) => {
      expect(toNumber(input)).toBeNaN();
    },
  );
});

describe('invalid numbers are reported, not discarded', () => {
  test('an interval is not silently turned off', async () => {
    const { user } = renderApp('/settings/services/oil-change', data());
    const miles = await screen.findByLabelText('Remind every (miles)');
    await user.clear(miles);
    await user.type(miles, 'abc');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Use a whole number, such as 5000')).toBeInTheDocument();
    expect(store().data.serviceTypes[0]?.intervalMiles).toBe(5000);
    expect(store().data.serviceTypes[0]?.intervalsEdited).toBe(false);
  });

  test.each(['0', '1.5'])('an interval of %s gets the same plain message', async (value) => {
    const { user } = renderApp('/settings/services/oil-change', data());
    const months = await screen.findByLabelText('Remind every (months)');
    await user.clear(months);
    await user.type(months, value);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Use a whole number, such as 5000')).toBeInTheDocument();
  });

  test('clearing an interval on purpose still works', async () => {
    const { user } = renderApp('/settings/services/oil-change', data());
    await user.clear(await screen.findByLabelText('Remind every (miles)'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { name: 'Settings' });
    expect(store().data.serviceTypes[0]?.intervalMiles).toBeNull();
  });

  test('service mileage is not silently dropped', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    const mileage = await screen.findByLabelText('Mileage (optional)');
    await user.clear(mileage);
    await user.type(mileage, '68k');
    await user.click(screen.getByRole('checkbox', { name: 'Oil change' }));
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    expect(await screen.findByText('Use numbers only, such as 45000')).toBeInTheDocument();
    expect(store().data.serviceRecords).toHaveLength(0);
  });

  test('fuel fields explain invalid text', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/new', data());
    await user.type(await screen.findByLabelText('Mileage at fill-up'), 'abc');
    await user.type(screen.getByLabelText('Gallons'), 'lots');
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    expect(await screen.findByText('Use numbers only, such as 45000')).toBeInTheDocument();
    expect(screen.getByText('Use numbers only, such as 12.5')).toBeInTheDocument();
  });
});

describe('logging older work', () => {
  test('moving the date back clears the prefilled mileage', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    const date = await screen.findByLabelText('Date');
    expect(screen.getByLabelText('Mileage (optional)')).toHaveValue('50000');
    await user.clear(date);
    await user.type(date, '2022-01-01');
    expect(screen.getByLabelText('Mileage (optional)')).toHaveValue('');
  });

  test('moving the date back to today restores it', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    const date = await screen.findByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2022-01-01');
    await user.clear(date);
    await user.type(date, '2026-11-04');
    expect(screen.getByLabelText('Mileage (optional)')).toHaveValue('50000');
  });

  test('a mileage the user typed is left alone', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    const mileage = await screen.findByLabelText('Mileage (optional)');
    await user.clear(mileage);
    await user.type(mileage, '40000');
    const date = screen.getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2022-01-01');
    expect(mileage).toHaveValue('40000');
  });
});

describe('future dates', () => {
  test('a service cannot be dated ahead', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    const date = await screen.findByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2031-01-01');
    await user.click(screen.getByRole('checkbox', { name: 'Oil change' }));
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    expect(await screen.findByText("The date can't be in the future")).toBeInTheDocument();
    expect(store().data.serviceRecords).toHaveLength(0);
  });

  test('a fill-up cannot be dated ahead', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/new', data());
    const date = await screen.findByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2031-01-01');
    await user.type(screen.getByLabelText('Mileage at fill-up'), '51000');
    await user.type(screen.getByLabelText('Gallons'), '10');
    await user.type(screen.getByLabelText('Total cost'), '30');
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    expect(await screen.findByText("The date can't be in the future")).toBeInTheDocument();
    expect(store().data.fuelFillUps).toHaveLength(0);
  });

  test('today is fine', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    await user.click(await screen.findByRole('checkbox', { name: 'Oil change' }));
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    await screen.findByText('Total spent:', { exact: false });
  });
});

describe('fixing a mileage typo', () => {
  const typo = () =>
    garage({
      vehicles: [vehicle({ id: 'v1', enteredOdometer: 50_000 })],
      fuelFillUps: [fill({ vehicleId: 'v1', date: '2026-10-05', odometer: 999_999 })],
    });

  test('the vehicle form says which entry is holding the mileage up', async () => {
    renderApp('/vehicles/v1/edit', typo());
    expect(
      await screen.findByText(/A fuel fill-up on Oct 5, 2026 logged 999,999 mi/),
    ).toBeInTheDocument();
  });

  test('it can point at a service record too', async () => {
    const data = garage({
      vehicles: [vehicle({ id: 'v1' })],
      serviceRecords: [record({ vehicleId: 'v1', date: '2026-10-06', odometer: 60_000 })],
    });
    renderApp('/vehicles/v1/edit', data);
    expect(
      await screen.findByText(/A service on Oct 6, 2026 logged 60,000 mi/),
    ).toBeInTheDocument();
  });

  test('no note when nothing outranks the entered mileage', async () => {
    renderApp('/vehicles/v1/edit', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    await screen.findByLabelText('Mileage');
    expect(screen.queryByText(/logged/)).toBeNull();
  });

  test('a huge jump is questioned before it can do damage', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/new', data());
    await user.type(await screen.findByLabelText('Mileage at fill-up'), '999999');
    expect(screen.getByText(/949,999 mi above the current mileage/)).toBeInTheDocument();
  });

  test('so is one on a service', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', data());
    const mileage = await screen.findByLabelText('Mileage (optional)');
    await user.clear(mileage);
    await user.type(mileage, '999999');
    expect(screen.getByText(/949,999 mi above the current mileage/)).toBeInTheDocument();
  });
});

describe('restore safety', () => {
  function captureDownloads() {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  }

  test('offers to save current data before replacing it', async () => {
    const clicks = captureDownloads();
    const { serialize } = await import('../../src/store/storage');
    const { user } = renderApp('/settings', data());
    await user.upload(
      await screen.findByLabelText('Restore from file'),
      new File([serialize(garage())], 'backup.json', { type: 'application/json' }),
    );
    await user.click(await screen.findByRole('button', { name: 'Download current data first' }));
    expect(clicks).toHaveBeenCalledOnce();
    expect(store().data.vehicles).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Replace my data' })).toBeInTheDocument();
  });

  test('damaged copies can be downloaded from Settings, even after starting over', async () => {
    const clicks = captureDownloads();
    const { user } = renderApp('/settings');
    localStorage.setItem(STORAGE_KEY, '{bad');
    garageStore.getState().reload();
    await user.click(await screen.findByRole('button', { name: 'Start over' }));
    await user.click(screen.getAllByRole('button', { name: 'Start over' }).at(-1) as HTMLElement);
    await user.click(await screen.findByRole('button', { name: 'Download damaged copy 1' }));
    expect(clicks).toHaveBeenCalledOnce();
  });

  test('Settings stays quiet when nothing was ever damaged', async () => {
    renderApp('/settings', garage());
    await screen.findByRole('heading', { name: 'Settings' });
    expect(screen.queryByText(/damaged copy/)).toBeNull();
  });
});

describe('ids from the URL', () => {
  test('an unknown vehicle is not attached to a new policy', async () => {
    const { user } = renderApp('/insurance/new/ghost', data());
    await user.type(await screen.findByLabelText('Company'), 'Ghost Co');
    await user.type(screen.getByLabelText('Policy number'), 'G');
    await user.type(screen.getByLabelText('Expiration date'), '2027-01-01');
    await user.click(screen.getByRole('button', { name: 'Save policy' }));
    expect(await screen.findByText('Choose at least one vehicle')).toBeInTheDocument();
    expect(store().data.insurancePolicies).toEqual([]);
  });

  test('an unknown service is not preselected', async () => {
    const { user } = renderApp('/vehicles/v1/service/new/not-a-service', data());
    await user.click(await screen.findByRole('button', { name: 'Save service' }));
    expect(await screen.findByText('Choose at least one service')).toBeInTheDocument();
  });

  test('a service that does not suit the vehicle is not preselected', async () => {
    const ev = garage({
      vehicles: [vehicle({ id: 'v1', powertrain: 'electric' })],
      serviceTypes: [serviceType()],
    });
    const { user } = renderApp('/vehicles/v1/service/new/oil-change', ev);
    await user.click(await screen.findByRole('button', { name: 'Save service' }));
    expect(await screen.findByText('Choose at least one service')).toBeInTheDocument();
  });

  test('a policy keeps working when opened through a real vehicle', async () => {
    const withPolicy = data();
    withPolicy.insurancePolicies = [policy({ id: 'p', vehicleIds: ['v1'] })];
    renderApp('/insurance/new/v1', withPolicy);
    expect(await screen.findByRole('checkbox', { name: 'Daily driver' })).toBeChecked();
  });
});

function Bomb(): never {
  throw new Error('boom');
}

test('the error boundary saves the stored data while recovery is showing', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  localStorage.setItem(STORAGE_KEY, '{bad');
  garageStore.getState().reload();
  render(
    <ErrorBoundary>
      <Bomb />
    </ErrorBoundary>,
  );
  screen.getByRole('button', { name: 'Download my data' }).click();
  await waitFor(() => expect(clicks).toHaveBeenCalled());
  expect(await (blobs[0] as Blob).text()).toBe('{bad');
});
