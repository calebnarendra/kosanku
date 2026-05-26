import { render, screen } from '@testing-library/react';
import App from './App';

test('renders main platform heading', () => {
  render(<App />);
  expect(screen.getByText(/Kos Student Rental/i)).toBeInTheDocument();
});
