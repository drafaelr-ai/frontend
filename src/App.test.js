import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

test('exibe o login após carregar sem sessão armazenada', async () => {
  render(<App />);

  expect(await screen.findByRole('button', { name: /entrar/i })).toBeInTheDocument();
});
