import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { fill, garage, vehicle } from '../unit/builders';
import { renderApp, store } from './helpers';

const twoFills = () =>
  garage({
    vehicles: [vehicle({ id: 'v1', enteredOdometer: 1000 })],
    fuelFillUps: [
      fill({ id: 'f1', vehicleId: 'v1', date: '2026-10-01', odometer: 1000, costCents: 3500 }),
      fill({ id: 'f2', vehicleId: 'v1', date: '2026-10-15', odometer: 1300, costCents: 3500 }),
      fill({ id: 'other', vehicleId: 'other', odometer: 900_000 }),
    ],
  });

async function addFill(
  user: ReturnType<typeof renderApp>['user'],
  { odometer, gallons, cost }: { odometer: string; gallons: string; cost: string },
) {
  await user.type(await screen.findByLabelText('Mileage at fill-up'), odometer);
  await user.type(screen.getByLabelText('Gallons'), gallons);
  await user.type(screen.getByLabelText('Total cost'), cost);
}

describe('fuel log', () => {
  test('shows per-fill and overall MPG for this vehicle only', async () => {
    renderApp('/vehicles/v1/fuel', twoFills());
    const overall = (await screen.findByText('Overall MPG')).parentElement as HTMLElement;
    expect(within(overall).getByText('30.0')).toBeInTheDocument();
    expect(screen.getByText('$70.00')).toBeInTheDocument();
    expect(screen.getByText('No MPG')).toBeInTheDocument();
    expect(screen.queryByText(/900,000/)).toBeNull();
  });

  test('explains the empty state', async () => {
    renderApp('/vehicles/v1/fuel', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    expect(await screen.findByText(/second full tank/)).toBeInTheDocument();
  });

  test('one fill says there is not enough data yet', async () => {
    const data = garage({
      vehicles: [vehicle({ id: 'v1' })],
      fuelFillUps: [fill({ vehicleId: 'v1' })],
    });
    renderApp('/vehicles/v1/fuel', data);
    expect(await screen.findByText('Not enough data')).toBeInTheDocument();
  });

  test('adding a fill-up recalculates MPG and advances the vehicle mileage', async () => {
    const { user } = renderApp('/vehicles/v1/fuel', twoFills());
    await user.click(await screen.findByRole('link', { name: 'Add fill-up' }));
    await addFill(user, { odometer: '1700', gallons: '10', cost: '35' });
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));

    const overall = (await screen.findByText('Overall MPG')).parentElement as HTMLElement;
    expect(within(overall).getByText('35.0')).toBeInTheDocument();
    expect(screen.getByText('40.0')).toBeInTheDocument();
    expect(screen.getByText('1,700 mi')).toBeInTheDocument();
  });

  test('a partial fill rolls into the next full fill', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/new', twoFills());
    await addFill(user, { odometer: '1500', gallons: '4', cost: '14' });
    await user.click(screen.getByRole('checkbox', { name: 'Filled to full' }));
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    expect(await screen.findByText('Partial')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Add fill-up' }));
    await addFill(user, { odometer: '1700', gallons: '6', cost: '21' });
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    await screen.findByText('Partial');
    // 400 miles on 10 gallons, across the partial fill.
    expect(screen.getByText('40.0')).toBeInTheDocument();
  });

  test('validates input', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/new', twoFills());
    await user.click(await screen.findByRole('button', { name: 'Save fill-up' }));
    expect(await screen.findByText('Enter the mileage')).toBeInTheDocument();
    expect(screen.getByText('Enter the gallons')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount, such as 45.50')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Gallons'), '0');
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    expect(await screen.findByText('Gallons must be above zero')).toBeInTheDocument();
    expect(store().data.fuelFillUps).toHaveLength(3);
  });

  test('warns about a low reading', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/new', twoFills());
    expect(await screen.findByText('Current mileage is 1,300 mi.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mileage at fill-up'), '100');
    expect(screen.getByText(/below the current/)).toBeInTheDocument();
  });

  test('can be edited, and MPG follows', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/f2', twoFills());
    const mileage = await screen.findByLabelText('Mileage at fill-up');
    await user.clear(mileage);
    await user.type(mileage, '1200');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const overall = (await screen.findByText('Overall MPG')).parentElement as HTMLElement;
    expect(within(overall).getByText('20.0')).toBeInTheDocument();
  });

  test('can be deleted after confirming', async () => {
    const { user } = renderApp('/vehicles/v1/fuel/f2', twoFills());
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store().data.fuelFillUps).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete fill-up' }));
    expect(await screen.findByText('Not enough data')).toBeInTheDocument();
  });

  test('an unknown fill-up shows a way back', async () => {
    renderApp('/vehicles/v1/fuel/nope', twoFills());
    expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument();
  });
});

describe('electric vehicles', () => {
  const ev = () => garage({ vehicles: [vehicle({ id: 'v1', powertrain: 'electric' })] });

  test('have no fuel tab', async () => {
    renderApp('/vehicles/v1', ev());
    expect(await screen.findByRole('link', { name: 'Service' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fuel' })).toBeNull();
  });

  test('an old fuel link falls back to maintenance', async () => {
    renderApp('/vehicles/v1/fuel', ev());
    expect(await screen.findByRole('link', { name: 'Maintenance' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
