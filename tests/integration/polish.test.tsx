import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { downloadText } from '../../src/components/download';
import {
  emptyGarage,
  QUARANTINE_KEY,
  readImport,
  STORAGE_KEY,
  serialize,
} from '../../src/store/storage';
import { garage, policy, serviceType, vehicle } from '../unit/builders';
import { renderApp, store } from './helpers';

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 4, 12), toFake: ['Date'] });
  return () => vi.useRealTimers();
});

describe('delete all data', () => {
  const data = () =>
    garage({
      vehicles: [vehicle({ id: 'v1' })],
      serviceTypes: [serviceType()],
      insurancePolicies: [policy({ vehicleIds: ['v1'] })],
    });

  test('asks first, and cancelling keeps everything', async () => {
    const { user } = renderApp('/settings', data());
    await user.click(await screen.findByRole('button', { name: 'Delete all data' }));
    expect(screen.getByText(/including insurance policy numbers/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store().data.vehicles).toHaveLength(1);
  });

  test('removes saved data and damaged copies, and starts empty', async () => {
    const { user } = renderApp('/settings', data());
    localStorage.setItem(QUARANTINE_KEY, '{old');
    await user.click(await screen.findByRole('button', { name: 'Delete all data' }));
    await user.click(screen.getByRole('button', { name: 'Delete everything' }));

    expect(await screen.findByText('Your garage is empty')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(QUARANTINE_KEY)).toBeNull();
    expect(store().data.insurancePolicies).toEqual([]);
    expect(store().data.serviceTypes).toEqual(emptyGarage().serviceTypes);
  });
});

describe('intervals on show', () => {
  const data = () =>
    garage({
      vehicles: [vehicle({ id: 'v1', make: 'Honda', model: 'CR-V', year: 2019 })],
      serviceTypes: [serviceType()],
    });

  test('a vehicle shows the interval actually used for it', async () => {
    renderApp('/vehicles/v1', data());
    expect(await screen.findByText('Every 7,500 mi or 12 mo')).toBeInTheDocument();
  });

  test('Settings labels catalog values as defaults', async () => {
    renderApp('/settings', data());
    expect(await screen.findByText('Default: every 5,000 mi or 6 mo')).toBeInTheDocument();
  });

  test('Settings shows a user-set interval plainly', async () => {
    renderApp(
      '/settings',
      garage({ serviceTypes: [serviceType({ intervalMonths: 3, intervalsEdited: true })] }),
    );
    expect(await screen.findByText('Every 5,000 mi or 3 mo')).toBeInTheDocument();
  });
});

describe('dialogs', () => {
  test('closing returns focus to the button that opened it', async () => {
    const { user } = renderApp('/vehicles/v1', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    const open = await screen.findByRole('button', { name: 'Delete' });
    await user.click(open);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(open).toHaveFocus();
  });
});

describe('page titles', () => {
  test.each([
    ['/', 'My Garage'],
    ['/insurance', 'Insurance'],
    ['/settings', 'Settings'],
    ['/vehicles/v1', 'Family car'],
    ['/vehicles/new', 'Add vehicle'],
  ])('%s', async (route, heading) => {
    renderApp(route, garage({ vehicles: [vehicle({ id: 'v1', description: 'Family car' })] }));
    await waitFor(() => expect(document.title).toBe(`${heading} – Garage`));
  });

  test('update when navigating', async () => {
    const { user } = renderApp('/', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    await user.click(await screen.findByRole('link', { name: 'Settings' }));
    await waitFor(() => expect(document.title).toBe('Settings – Garage'));
  });
});

describe('year list', () => {
  test('reaches back to 1900', async () => {
    renderApp('/vehicles/new', garage());
    expect(await screen.findByRole('option', { name: '1900' })).toBeInTheDocument();
  });

  test('a year outside the list stays selected when editing', async () => {
    renderApp('/vehicles/v1/edit', garage({ vehicles: [vehicle({ id: 'v1', year: 2099 })] }));
    expect(await screen.findByLabelText('Year')).toHaveValue('2099');
  });
});

test('the policy number is kept out of browser autofill', async () => {
  renderApp('/insurance/new', garage({ vehicles: [vehicle({ id: 'v1' })] }));
  expect(await screen.findByLabelText('Policy number')).toHaveAttribute('autocomplete', 'off');
});

test('the download URL outlives the click', () => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadText('x.json', '{}');
  expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledOnce();
});

describe('readImport', () => {
  test('refuses an oversized file without reading it', async () => {
    const huge = new File(['x'], 'b.json');
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 });
    const read = vi.spyOn(huge, 'text');
    expect(await readImport(huge)).toEqual({
      kind: 'corrupt',
      reason: 'The file is larger than the 5 MB limit.',
    });
    expect(read).not.toHaveBeenCalled();
  });

  test('parses a normal file', async () => {
    const file = new File([serialize(emptyGarage())], 'b.json');
    expect((await readImport(file)).kind).toBe('ok');
  });
});
