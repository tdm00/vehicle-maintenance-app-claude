import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { garageStore } from '../../src/store/garageStore';
import { emptyGarage, QUARANTINE_KEY, STORAGE_KEY, serialize } from '../../src/store/storage';
import { garage, vehicle } from '../unit/builders';
import { renderApp, store } from './helpers';

function captureDownloads() {
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const clicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return { blobs, clicks };
}

const withVehicle = () => ({ ...emptyGarage(), vehicles: [vehicle({ id: 'v1' })] });
const backupFile = (text: string) => new File([text], 'backup.json', { type: 'application/json' });
const chooser = () => screen.findByLabelText('Restore from file');

describe('backup', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 4, 12), toFake: ['Date'] });
    return () => vi.useRealTimers();
  });

  test('downloads everything and records the date', async () => {
    const { blobs, clicks } = captureDownloads();
    const { user } = renderApp('/settings', withVehicle());
    expect(await screen.findByText('Never')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Download backup' }));

    expect(clicks).toHaveBeenCalledOnce();
    const saved = JSON.parse(await (blobs[0] as Blob).text());
    expect(saved.data.vehicles).toHaveLength(1);
    expect(saved.data.settings.lastBackupAt).toBe('2026-11-04');
    expect(await screen.findByText('Nov 4, 2026')).toBeInTheDocument();
  });

  test('the garage nudges until a recent backup exists', async () => {
    renderApp('/', withVehicle());
    expect(await screen.findByText(/You haven't made a backup/)).toBeInTheDocument();
  });

  test('an old backup nudges again', async () => {
    const data = withVehicle();
    data.settings.lastBackupAt = '2026-09-01';
    renderApp('/', data);
    expect(await screen.findByText(/been a while/)).toBeInTheDocument();
  });

  test('a recent backup does not nudge', async () => {
    const data = withVehicle();
    data.settings.lastBackupAt = '2026-10-20';
    renderApp('/', data);
    await screen.findByRole('heading', { name: 'My Garage' });
    expect(screen.queryByText(/Back up now/)).toBeNull();
  });
});

describe('restore', () => {
  test('replaces data after confirming', async () => {
    const { user } = renderApp('/settings', garage());
    await user.upload(await chooser(), backupFile(serialize(withVehicle())));
    expect(await screen.findByText(/This backup has 1 vehicle/)).toBeInTheDocument();
    expect(store().data.vehicles).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Replace my data' }));
    await screen.findByRole('heading', { name: 'My Garage' });
    expect(store().data.vehicles).toHaveLength(1);
  });

  test('cancelling changes nothing', async () => {
    const { user } = renderApp('/settings', garage());
    await user.upload(await chooser(), backupFile(serialize(withVehicle())));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(store().data.vehicles).toHaveLength(0);
  });

  test.each([
    ['invalid JSON', 'nope', 'The file is not valid JSON. Nothing was changed.'],
    ['another file', '{"a":1}', 'The file is not a Garage backup. Nothing was changed.'],
    [
      'a damaged backup',
      '{"schemaVersion":1,"data":{}}',
      'The data is damaged or incomplete. Nothing was changed.',
    ],
  ])('rejects %s', async (_label, text, message) => {
    const { user } = renderApp('/settings', withVehicle());
    await user.upload(await chooser(), backupFile(text));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(store().data.vehicles).toHaveLength(1);
  });

  test('rejects a backup from a newer version', async () => {
    const { user } = renderApp('/settings', garage());
    await user.upload(await chooser(), backupFile(serialize(emptyGarage(), 99)));
    expect(await screen.findByRole('alert')).toHaveTextContent(/newer version/);
  });

  test('rejects an oversized file before reading it', async () => {
    const { user } = renderApp('/settings', garage());
    const huge = backupFile('x');
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 });
    const read = vi.spyOn(huge, 'text');
    await user.upload(await chooser(), huge);
    expect(await screen.findByRole('alert')).toHaveTextContent(/5 MB limit/);
    expect(read).not.toHaveBeenCalled();
  });

  test('choosing no file does nothing', async () => {
    const { user } = renderApp('/settings', garage());
    await user.upload(await chooser(), []);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('recovery', () => {
  function renderWithSaved(saved: string) {
    const { user } = renderApp('/');
    localStorage.setItem(STORAGE_KEY, saved);
    garageStore.getState().reload();
    return user;
  }

  test('damaged data offers a download and a confirmed fresh start', async () => {
    const { blobs } = captureDownloads();
    const user = renderWithSaved('{bad');
    expect(await screen.findByText("We couldn't read your saved data")).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'My Garage' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Download my data' }));
    expect(await (blobs[0] as Blob).text()).toBe('{bad');

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    const buttons = screen.getAllByRole('button', { name: 'Start over' });
    await user.click(buttons.at(-1) as HTMLElement);
    expect(await screen.findByRole('heading', { name: 'My Garage' })).toBeInTheDocument();
    expect(localStorage.getItem(QUARANTINE_KEY)).toBe('{bad');
  });

  test('newer data can be downloaded but not replaced', async () => {
    captureDownloads();
    renderWithSaved(serialize(emptyGarage(), 99));
    expect(await screen.findByText('This data is from a newer version')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download my data' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull();
  });

  test('a download with nothing saved still works', async () => {
    const { blobs } = captureDownloads();
    const user = renderWithSaved('{bad');
    await screen.findByText("We couldn't read your saved data");
    localStorage.removeItem(STORAGE_KEY);
    await user.click(screen.getByRole('button', { name: 'Download my data' }));
    expect(await (blobs[0] as Blob).text()).toBe('');
  });
});

function Bomb(): never {
  throw new Error('boom');
}

describe('error boundary', () => {
  test('a rendering failure offers the data and a reload', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { blobs, clicks } = captureDownloads();
    garageStore.getState().reload();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Download my data' }).click();
    await waitFor(() => expect(clicks).toHaveBeenCalled());
    expect(JSON.parse(await (blobs[0] as Blob).text())).toHaveProperty('schemaVersion', 1);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  test('children render normally when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>Fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Fine')).toBeInTheDocument();
  });
});

describe('storage warnings', () => {
  test('a failed save raises a banner linking to backup', async () => {
    const { user } = renderApp('/', garage({ vehicles: [vehicle({ id: 'v1' })] }));
    await screen.findByRole('heading', { name: 'My Garage' });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    store().setServiceIgnored('v1', 'oil-change', true);
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't be saved/);
    await user.click(screen.getByRole('link', { name: 'Download a backup' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });
});

test('sample data fills the garage and shows work to do', async () => {
  const { user } = renderApp('/');
  await user.click(await screen.findByRole('button', { name: 'Load sample data' }));
  expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument();
  expect(store().data.vehicles).toHaveLength(3);
  expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
});

test('settings shows the version', async () => {
  renderApp('/settings', garage());
  expect(await screen.findByText('Garage version test')).toBeInTheDocument();
});
