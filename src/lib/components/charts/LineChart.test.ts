import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import LineChart from './LineChart.svelte';

describe('LineChart Component', () => {
  const mockData = [
    { x: 0, y: 10 },
    { x: 1, y: 20 },
    { x: 2, y: 15 },
    { x: 3, y: 25 },
  ];

  it('should render without crashing', () => {
    const { container } = render(LineChart, {
      props: {
        data: mockData,
        width: 400,
        height: 300,
      },
    });

    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should handle empty data gracefully', () => {
    const { container } = render(LineChart, {
      props: {
        data: [],
        width: 400,
        height: 300,
      },
    });

    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should render with correct dimensions', () => {
    const { container } = render(LineChart, {
      props: {
        data: mockData,
        width: 500,
        height: 400,
      },
    });

    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('500');
    expect(svg?.getAttribute('height')).toBe('400');
  });
});