import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { garage, policy, vehicle } from '../unit/builders';
import { renderApp, store } from './helpers';

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 4, 12), toFake: ['Date'] });
  return () => vi.useRealTimers();
});

const twoVehicles = () => [
  vehicle({ id: 'v1', description: 'Family SUV' }),
  vehicle({ id: 'v2', description: 'Work truck' }),
];
const soon = () => policy({ vehicleIds: ['v1', 'v2'], expirationDate: '2026-11-20' });

describe('adding a policy', () => {
  test('from the vehicle tab, with that vehicle already chosen', async () => {
    const { user } = renderApp('/vehicles/v1/insurance', garage({ vehicles: twoVehicles() }));
    expect(await screen.findByText('No insurance on file')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Add policy' }));

    expect(await screen.findByRole('checkbox', { name: 'Family SUV' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Work truck' })).not.toBeChecked();
    await user.type(screen.getByLabelText('Company'), 'Sample Mutual');
    await user.type(screen.getByLabelText('Policy number'), 'SM-1');
    await user.type(screen.getByLabelText('Expiration date'), '2027-06-01');
    await user.type(screen.getByLabelText('Phone (optional)'), '800-555-0100');
    await user.type(screen.getByLabelText('Notes (optional)'), 'Roadside included');
    await user.click(screen.getByRole('checkbox', { name: 'Work truck' }));
    await user.click(screen.getByRole('button', { name: 'Save policy' }));

    expect(await screen.findByRole('heading', { name: 'Sample Mutual' })).toBeInTheDocument();
    expect(screen.getByText('Family SUV, Work truck')).toBeInTheDocument();
    expect(screen.getByText('SM-1')).toBeInTheDocument();
    expect(screen.getByText('Jun 1, 2027')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Roadside included')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '800-555-0100' })).toHaveAttribute(
      'href',
      'tel:8005550100',
    );
  });

  test('requires the core fields and a vehicle', async () => {
    const { user } = renderApp('/insurance/new', garage({ vehicles: twoVehicles() }));
    await user.click(await screen.findByRole('button', { name: 'Save policy' }));
    expect(await screen.findByText('Add the company')).toBeInTheDocument();
    expect(screen.getByText('Add the policy number')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid date')).toBeInTheDocument();
    expect(screen.getByText('Choose at least one vehicle')).toBeInTheDocument();
    expect(store().data.insurancePolicies).toEqual([]);
  });

  test('a valid form with no vehicle chosen is still rejected', async () => {
    const { user } = renderApp('/insurance/new', garage({ vehicles: twoVehicles() }));
    await user.type(await screen.findByLabelText('Company'), 'Sample Mutual');
    await user.type(screen.getByLabelText('Policy number'), 'SM-1');
    await user.type(screen.getByLabelText('Expiration date'), '2027-06-01');
    await user.click(screen.getByRole('button', { name: 'Save policy' }));
    expect(await screen.findByText('Choose at least one vehicle')).toBeInTheDocument();
    expect(store().data.insurancePolicies).toEqual([]);
  });

  test('asks for a vehicle first when the garage is empty', async () => {
    renderApp('/insurance/new', garage());
    expect(await screen.findByText('Add a vehicle first')).toBeInTheDocument();
  });

  test('warns that the policy number is not encrypted', async () => {
    renderApp('/insurance/new', garage({ vehicles: twoVehicles() }));
    expect(await screen.findByText(/Stored unencrypted/)).toBeInTheDocument();
  });
});

describe('the insurance page', () => {
  test('lists every policy, soonest expiry first', async () => {
    const data = garage({
      vehicles: twoVehicles(),
      insurancePolicies: [
        policy({ id: 'late', vehicleIds: ['v2'], company: 'Later Co' }),
        policy({
          id: 'early',
          vehicleIds: ['v1'],
          company: 'Earlier Co',
          expirationDate: '2026-11-20',
        }),
      ],
    });
    renderApp('/insurance', data);
    const headings = await screen.findAllByRole('heading', { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(['Earlier Co', 'Later Co']);
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
  });

  test('shows an expired policy as expired', async () => {
    const data = garage({
      vehicles: twoVehicles(),
      insurancePolicies: [policy({ vehicleIds: ['v1'], expirationDate: '2026-10-01' })],
    });
    renderApp('/insurance', data);
    expect(await screen.findAllByText('Expired')).toHaveLength(2);
  });

  test('a phone number with nothing to dial is shown as text', async () => {
    const data = garage({
      vehicles: twoVehicles(),
      insurancePolicies: [policy({ vehicleIds: ['v1'], phone: 'ask agent' })],
    });
    renderApp('/insurance', data);
    expect(await screen.findByText('ask agent')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'ask agent' })).toBeNull();
  });

  test('a policy that lost its vehicles stays visible and can be saved', async () => {
    const data = garage({ insurancePolicies: [policy({ id: 'p', vehicleIds: [] })] });
    const { user } = renderApp('/insurance', data);
    expect(await screen.findByText('No vehicles')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Edit/ }));
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('heading', { name: 'Insurance' })).toBeInTheDocument();
  });

  test('is empty until a policy exists', async () => {
    renderApp('/insurance', garage());
    expect(await screen.findByText('No insurance on file')).toBeInTheDocument();
  });

  test('an unknown policy shows a way back', async () => {
    renderApp('/insurance/nope', garage());
    expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument();
  });
});

describe('reminders', () => {
  const data = () => garage({ vehicles: twoVehicles(), insurancePolicies: [soon()] });

  test('an expiring policy appears once, naming every vehicle, and counts on each card', async () => {
    renderApp('/', data());
    const tasks = await screen.findByRole('region', { name: 'Needs attention' });
    expect(within(tasks).getByText('Sample Mutual insurance')).toBeInTheDocument();
    expect(within(tasks).getByText('Expiring soon')).toBeInTheDocument();
    expect(within(tasks).getByText(/Family SUV, Work truck · Expires Nov 20, 2026/)).toBeTruthy();
    expect(within(tasks).queryByText('Nothing is due right now.')).toBeNull();
    expect(screen.getAllByText('1 due')).toHaveLength(2);
  });

  test('an expired policy says so', async () => {
    const expired = garage({
      vehicles: twoVehicles(),
      insurancePolicies: [policy({ vehicleIds: ['v1'], expirationDate: '2026-10-01' })],
    });
    renderApp('/', expired);
    expect(await screen.findByText(/Family SUV · Expired Oct 1, 2026/)).toBeInTheDocument();
  });

  test('renewing clears the task', async () => {
    const { user } = renderApp('/', data());
    await user.click(await screen.findByRole('link', { name: /Update/ }));
    expect(await screen.findByText(/Renewed\?/)).toBeInTheDocument();
    const date = screen.getByLabelText('Expiration date');
    await user.clear(date);
    await user.type(date, '2027-11-20');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { name: 'Insurance' });
    await user.click(screen.getByRole('link', { name: 'Garage' }));
    expect(await screen.findByText('Nothing is due right now.')).toBeInTheDocument();
  });
});

describe('managing a policy', () => {
  test('deleting asks first, then removes it from the vehicle', async () => {
    const data = garage({ vehicles: twoVehicles(), insurancePolicies: [soon()] });
    const { user } = renderApp('/insurance/policy', data);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store().data.insurancePolicies).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete policy' }));
    expect(await screen.findByText('No insurance on file')).toBeInTheDocument();
  });

  test('editing a vehicle in the form keeps its policy', async () => {
    const data = garage({ vehicles: twoVehicles(), insurancePolicies: [soon()] });
    const { user } = renderApp('/vehicles/v1/edit', data);
    await user.click(await screen.findByRole('button', { name: 'Save changes' }));
    await screen.findByRole('heading', { name: 'Family SUV' });
    expect(store().data.insurancePolicies).toHaveLength(1);
  });

  test('electric vehicles have an insurance tab too', async () => {
    const ev = garage({ vehicles: [vehicle({ id: 'v1', powertrain: 'electric' })] });
    renderApp('/vehicles/v1/insurance', ev);
    expect(await screen.findByText('No insurance on file')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Vehicle sections' })).toHaveTextContent(
      'Insurance',
    );
  });
});
