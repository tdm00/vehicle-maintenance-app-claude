import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/App';
import type { GarageData } from '../../src/domain/schemas';
import { garageStore } from '../../src/store/garageStore';
import { STORAGE_KEY, serialize } from '../../src/store/storage';

type User = ReturnType<typeof userEvent.setup>;

/** Renders the real app at a route, with the store reloaded from storage. */
export function renderApp(route = '/', data?: GarageData) {
  localStorage.clear();
  if (data) localStorage.setItem(STORAGE_KEY, serialize(data));
  garageStore.getState().reload();
  window.location.hash = route;
  return { user: userEvent.setup(), ...render(<App />) };
}

export function store() {
  return garageStore.getState();
}

export async function fillVehicleForm(
  user: User,
  {
    description = 'Daily driver',
    year = '2020',
    make = 'Toyota',
    model = 'Camry',
    mileage = '45000',
  } = {},
) {
  await user.type(screen.getByLabelText('Description'), description);
  await user.selectOptions(screen.getByLabelText('Year'), year);
  await user.selectOptions(screen.getByLabelText('Make'), make);
  await user.selectOptions(screen.getByLabelText('Model'), model);
  await user.type(screen.getByLabelText('Mileage'), mileage);
}
