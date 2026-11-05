import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { App } from '../../src/App';

test('increments and stores the count', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Count: 0' }));
  expect(screen.getByRole('button', { name: 'Count: 1' })).toBeInTheDocument();
  expect(localStorage.getItem('garage.skeleton')).toBe('1');
});
