import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { describeItem } from '../../src/components/maintenanceText';
import { DEFAULT_SERVICE_TYPES } from '../../src/data/serviceCatalog';
import { evaluateService } from '../../src/domain/maintenance';
import { garage, record, serviceType, vehicle } from '../unit/builders';
import { renderApp, store } from './helpers';

const TODAY = new Date(2026, 10, 4, 12);

beforeEach(() => {
  vi.useFakeTimers({ now: TODAY, toFake: ['Date'] });
  return () => vi.useRealTimers();
});

const oil = () => serviceType({ intervalsEdited: true });

const overdue = () =>
  garage({
    vehicles: [vehicle({ id: 'v1' })],
    serviceTypes: [oil()],
    serviceRecords: [record({ vehicleId: 'v1', date: '2025-01-01', odometer: 40_000 })],
  });

describe('garage task list', () => {
  test('shows overdue work with the vehicle and the reason', async () => {
    renderApp('/', overdue());
    const tasks = await screen.findByRole('region', { name: 'Needs attention' });
    expect(within(tasks).getByText('Oil change')).toBeInTheDocument();
    expect(within(tasks).getByText('Overdue')).toBeInTheDocument();
    expect(within(tasks).getByText(/5,000 mi past due/)).toBeInTheDocument();
    expect(screen.getByText('1 due')).toBeInTheDocument();
  });

  test('logging from a task prefills the service and clears the task', async () => {
    const { user } = renderApp('/', overdue());
    await user.click(await screen.findByRole('link', { name: 'Log Oil change for Daily driver' }));
    expect(await screen.findByRole('checkbox', { name: 'Oil change' })).toBeChecked();
    expect(screen.getByLabelText('Mileage (optional)')).toHaveValue('50000');
    expect(screen.getByLabelText('Date')).toHaveValue('2026-11-04');
    await user.click(screen.getByRole('button', { name: 'Save service' }));

    await screen.findByText('Total spent:', { exact: false });
    await user.click(screen.getByRole('link', { name: 'My Garage' }));
    expect(await screen.findByText('Nothing is due right now.')).toBeInTheDocument();
  });

  test('a vehicle with no history is grouped, not flagged as overdue', async () => {
    const data = garage({
      vehicles: [vehicle({ id: 'v1', enteredOdometer: 120_000 })],
      serviceTypes: DEFAULT_SERVICE_TYPES,
    });
    renderApp('/', data);
    expect(await screen.findByText('Nothing is due right now.')).toBeInTheDocument();
    expect(screen.getByText(/Daily driver: 12 with no service on record/)).toBeInTheDocument();
  });

  test('shows the guidance note', async () => {
    renderApp('/', overdue());
    expect(await screen.findByText(/Check the owner's manual/)).toBeInTheDocument();
  });
});

describe('service form', () => {
  test('requires a service', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', overdue());
    await user.click(await screen.findByRole('button', { name: 'Save service' }));
    expect(await screen.findByText('Choose at least one service')).toBeInTheDocument();
    expect(store().data.serviceRecords).toHaveLength(1);
  });

  test('cost is optional and validated', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', overdue());
    await user.click(await screen.findByRole('checkbox', { name: 'Oil change' }));
    await user.type(screen.getByLabelText('Cost (optional)'), 'lots');
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    expect(await screen.findByText('Enter an amount, such as 45.50')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Cost (optional)'));
    await user.type(screen.getByLabelText('Cost (optional)'), '$45.50');
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    expect(await screen.findByText('$45.50', { selector: 'span' })).toBeInTheDocument();
    expect(store().data.serviceRecords.at(-1)?.costCents).toBe(4550);
  });

  test('warns when mileage is below the current reading, but still saves', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', overdue());
    const mileage = await screen.findByLabelText('Mileage (optional)');
    await user.clear(mileage);
    await user.type(mileage, '30000');
    expect(screen.getByText(/below the current 50,000 mi/)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Oil change' }));
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    await screen.findByText('Total spent:', { exact: false });
  });

  test('saves with no mileage', async () => {
    const { user } = renderApp('/vehicles/v1/service/new', overdue());
    await user.clear(await screen.findByLabelText('Mileage (optional)'));
    await user.click(screen.getByRole('checkbox', { name: 'Oil change' }));
    await user.click(screen.getByRole('button', { name: 'Save service' }));
    await screen.findByText('Total spent:', { exact: false });
    expect(store().data.serviceRecords.at(-1)?.odometer).toBeUndefined();
  });

  test('hidden and other-powertrain services are not offered, unless already on the record', async () => {
    const data = garage({
      vehicles: [vehicle({ id: 'v1', powertrain: 'electric' })],
      serviceTypes: [
        oil(),
        serviceType({ id: 'tires', name: 'Tires', powertrains: ['electric'] }),
        serviceType({ id: 'old', name: 'Old', powertrains: ['electric'], isHidden: true }),
      ],
      serviceRecords: [record({ id: 'r1', vehicleId: 'v1', serviceTypeIds: ['old'] })],
    });
    renderApp('/vehicles/v1/service/new', data);
    expect(await screen.findByRole('checkbox', { name: 'Tires' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Oil change' })).toBeNull();
    expect(screen.queryByRole('checkbox', { name: 'Old' })).toBeNull();
  });
});

describe('service history', () => {
  const data = () =>
    garage({
      vehicles: [vehicle({ id: 'v1' })],
      serviceTypes: [oil(), serviceType({ id: 'tires', name: 'Tire rotation' })],
      serviceRecords: [
        record({
          id: 'r1',
          vehicleId: 'v1',
          date: '2026-10-01',
          odometer: 49_000,
          serviceTypeIds: ['oil-change', 'tires'],
          costCents: 8000,
          notes: 'Synthetic',
        }),
        record({ id: 'r2', vehicleId: 'v1', date: '2026-01-01', costCents: 2000 }),
        record({ id: 'r3', vehicleId: 'other', costCents: 99999 }),
      ],
    });

  test('lists records newest first and totals only this vehicle', async () => {
    renderApp('/vehicles/v1/service', data());
    expect(await screen.findByText('$100.00')).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Oil change, Tire rotation');
    expect(rows[0]).toHaveTextContent('Oct 1, 2026 · 49,000 mi');
    expect(rows[0]).toHaveTextContent('Synthetic');
  });

  test('can be edited', async () => {
    const { user } = renderApp('/vehicles/v1/service/r1', data());
    const cost = await screen.findByLabelText('Cost (optional)');
    expect(cost).toHaveValue('80.00');
    await user.clear(cost);
    await user.type(cost, '90');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('$110.00')).toBeInTheDocument();
    expect(store().data.serviceRecords).toHaveLength(3);
  });

  test('can be deleted after confirming', async () => {
    const { user } = renderApp('/vehicles/v1/service/r2', data());
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store().data.serviceRecords).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete record' }));
    expect(await screen.findByText('$80.00', { selector: 'strong' })).toBeInTheDocument();
    expect(store().data.serviceRecords).toHaveLength(2);
  });

  test('a service removed from the list still reads sensibly', async () => {
    const custom = data();
    custom.serviceRecords = [record({ vehicleId: 'v1', serviceTypeIds: ['gone'] })];
    renderApp('/vehicles/v1/service', custom);
    expect(await screen.findByText('Removed service')).toBeInTheDocument();
  });

  test('shows an empty state', async () => {
    renderApp('/vehicles/v1/service', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    expect(await screen.findByText('No service history yet')).toBeInTheDocument();
  });

  test('an unknown record shows a way back', async () => {
    renderApp('/vehicles/v1/service/nope', data());
    expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument();
  });
});

describe('vehicle maintenance tab', () => {
  test('lists every service with its status', async () => {
    const data = overdue();
    data.serviceTypes.push(serviceType({ id: 'tires', name: 'Tire rotation' }));
    renderApp('/vehicles/v1', data);
    expect(await screen.findByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('No record')).toBeInTheDocument();
  });

  test('a service can be marked not applicable and restored', async () => {
    const { user } = renderApp('/vehicles/v1', overdue());
    await user.click(await screen.findByRole('button', { name: 'Oil change does not apply' }));
    expect(screen.queryByText('Overdue')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Restore Oil change' }));
    expect(await screen.findByText('Overdue')).toBeInTheDocument();
  });
});

describe('service list settings', () => {
  test('a custom service can be added and logged', async () => {
    const { user } = renderApp('/settings', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    await user.click(await screen.findByRole('link', { name: 'Add service' }));
    await user.type(await screen.findByLabelText('Name'), 'Detailing');
    await user.type(screen.getByLabelText('Remind every (months)'), '6');
    await user.click(screen.getByRole('button', { name: 'Add service' }));
    expect(await screen.findByText('Every 6 mo')).toBeInTheDocument();
    expect(store().data.serviceTypes[0]?.isCustom).toBe(true);
  });

  test('a name is required', async () => {
    const { user } = renderApp('/settings/services/new', garage());
    await user.click(await screen.findByRole('button', { name: 'Add service' }));
    expect(await screen.findByText('Add a name')).toBeInTheDocument();
  });

  test('changing an interval marks it as user-set, which beats suggestions', async () => {
    const { user } = renderApp(
      '/settings/services/oil-change',
      garage({
        serviceTypes: [serviceType()],
      }),
    );
    const months = await screen.findByLabelText('Remind every (months)');
    await user.clear(months);
    await user.type(months, '3');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Every 5,000 mi or 3 mo')).toBeInTheDocument();
    expect(store().data.serviceTypes[0]).toMatchObject({
      intervalMonths: 3,
      intervalsEdited: true,
    });
  });

  test('renaming alone keeps suggestions active', async () => {
    const { user } = renderApp(
      '/settings/services/oil-change',
      garage({
        serviceTypes: [serviceType()],
      }),
    );
    await user.type(await screen.findByLabelText('Name'), ' (synthetic)');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText(/synthetic/);
    expect(store().data.serviceTypes[0]?.intervalsEdited).toBe(false);
  });

  test('a service can be hidden, and shows as hidden', async () => {
    const { user } = renderApp(
      '/settings/services/oil-change',
      garage({
        serviceTypes: [serviceType()],
      }),
    );
    await user.click(await screen.findByRole('checkbox', { name: /Hide from lists/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Hidden')).toBeInTheDocument();
  });

  test('a service with no interval says so', async () => {
    renderApp(
      '/settings',
      garage({
        serviceTypes: [serviceType({ intervalMiles: null, intervalMonths: null })],
      }),
    );
    expect(await screen.findByText('No reminder')).toBeInTheDocument();
  });

  test('an unknown service shows a way back', async () => {
    renderApp('/settings/services/nope', garage());
    expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument();
  });
});

describe('describeItem', () => {
  const describeWith = (type: Parameters<typeof serviceType>[0], date: string, odo?: number) =>
    describeItem(
      evaluateService(
        vehicle(),
        serviceType({ intervalsEdited: true, ...type }),
        [record({ date, odometer: odo })],
        50_000,
        '2026-11-04',
      ),
    );

  test.each([
    ['past on miles', {}, '2026-10-01', 40_000, '5,000 mi past due'],
    ['past on date', {}, '2026-01-01', 49_000, 'Was due Jul 1, 2026'],
    ['upcoming', {}, '2026-10-01', 49_000, '4,000 mi left or due Apr 1, 2027'],
    ['date only', { intervalMiles: null }, '2026-10-01', 49_000, 'Due Apr 1, 2027'],
    ['miles only', { intervalMonths: null }, '2026-10-01', 49_000, '4,000 mi left'],
    [
      'no mileage on record',
      { intervalMonths: null },
      '2026-10-01',
      undefined,
      'Last done Oct 1, 2026',
    ],
  ])('%s', (_label, type, date, odo, expected) => {
    expect(describeWith(type, date, odo)).toBe(expected);
  });
});
