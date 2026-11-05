import { screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { garage, serviceType, vehicle } from '../unit/builders';
import { fillVehicleForm, renderApp, store } from './helpers';

describe('adding a vehicle', () => {
  test('the empty garage leads to the form, and the vehicle appears after saving', async () => {
    const { user } = renderApp('/');
    await user.click(await screen.findByRole('link', { name: 'Add your first vehicle' }));
    await fillVehicleForm(user);
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByRole('heading', { name: 'Daily driver' })).toBeInTheDocument();
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('45,000 mi')).toBeInTheDocument();
    expect(store().data.vehicles).toHaveLength(1);
  });

  test('required fields show errors and move focus to the first', async () => {
    const { user } = renderApp('/vehicles/new');
    await user.click(await screen.findByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByText('Add a description')).toBeInTheDocument();
    expect(screen.getByText('Enter the mileage')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Description')).toHaveFocus());
    expect(store().data.vehicles).toHaveLength(0);
  });

  test('choosing a model sets the body style and powertrain', async () => {
    const { user } = renderApp('/vehicles/new');
    await user.selectOptions(await screen.findByLabelText('Make'), 'Tesla');
    await user.selectOptions(screen.getByLabelText('Model'), 'Cybertruck');
    expect(screen.getByLabelText('Body style')).toHaveValue('truck');
    expect(screen.getByLabelText('Powertrain')).toHaveValue('electric');
    expect(screen.getByRole('img', { name: 'Truck illustration' })).toBeInTheDocument();
  });

  test('the model list waits for a make, and changing make clears the model', async () => {
    const { user } = renderApp('/vehicles/new');
    expect(await screen.findByLabelText('Model')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Make'), 'Honda');
    await user.selectOptions(screen.getByLabelText('Model'), 'Civic');
    await user.selectOptions(screen.getByLabelText('Make'), 'Ford');
    expect(screen.getByLabelText('Model')).toHaveValue('');
  });

  test('a make outside the list can be typed in', async () => {
    const { user } = renderApp('/vehicles/new');
    await user.type(await screen.findByLabelText('Description'), 'Project car');
    await user.selectOptions(screen.getByLabelText('Year'), '1970');
    await user.selectOptions(screen.getByLabelText('Make'), 'Other');
    await user.type(screen.getByLabelText('Make name'), 'Datsun');
    await user.type(screen.getByLabelText('Model name'), '240Z');
    await user.type(screen.getByLabelText('Mileage'), '90,000');
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByText('1970 Datsun 240Z')).toBeInTheDocument();
    expect(store().data.vehicles[0]?.enteredOdometer).toBe(90_000);
  });

  test('a model outside the list can be typed in', async () => {
    const { user } = renderApp('/vehicles/new');
    await user.selectOptions(await screen.findByLabelText('Make'), 'Ford');
    await user.selectOptions(screen.getByLabelText('Model'), 'Other');
    await user.type(screen.getByLabelText('Model name'), 'Pinto');
    expect(screen.getByLabelText('Model name')).toHaveValue('Pinto');
  });

  test('the chosen color is saved', async () => {
    const { user } = renderApp('/vehicles/new');
    await fillVehicleForm(user);
    await user.click(screen.getByRole('radio', { name: 'Red' }));
    await user.click(screen.getByRole('button', { name: 'Add vehicle' }));
    await screen.findByRole('heading', { name: 'Daily driver' });
    expect(store().data.vehicles[0]?.color).toBe('#dc2626');
  });
});

describe('an existing vehicle', () => {
  const data = () => garage({ vehicles: [vehicle({ id: 'v1' })], serviceTypes: [serviceType()] });

  test('appears in the garage and opens its page', async () => {
    const { user } = renderApp('/', data());
    await user.click(await screen.findByRole('link', { name: /Daily driver/ }));
    expect(await screen.findByRole('heading', { name: 'Daily driver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('can be edited', async () => {
    const { user } = renderApp('/vehicles/v1/edit', data());
    const description = await screen.findByLabelText('Description');
    expect(description).toHaveValue('Daily driver');
    await user.clear(description);
    await user.type(description, 'Weekend car');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('heading', { name: 'Weekend car' })).toBeInTheDocument();
  });

  test('a vehicle with an unlisted make keeps it when editing', async () => {
    const custom = garage({ vehicles: [vehicle({ id: 'v1', make: 'Datsun', model: '240Z' })] });
    renderApp('/vehicles/v1/edit', custom);
    expect(await screen.findByLabelText('Make name')).toHaveValue('Datsun');
    expect(screen.getByLabelText('Model name')).toHaveValue('240Z');
  });

  test('deleting asks first, and cancelling keeps it', async () => {
    const { user } = renderApp('/vehicles/v1', data());
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/also deletes its service history/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store().data.vehicles).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete vehicle' }));
    expect(await screen.findByText('Your garage is empty')).toBeInTheDocument();
    expect(store().data.vehicles).toHaveLength(0);
  });
});

test('an unknown vehicle shows a way back', async () => {
  renderApp('/vehicles/nope');
  expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument();
});

test('an unknown vehicle on the edit route shows a way back', async () => {
  renderApp('/vehicles/nope/edit');
  expect(await screen.findByText("We couldn't find that page")).toBeInTheDocument();
});
