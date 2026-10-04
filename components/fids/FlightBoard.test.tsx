import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FlightBoard } from '@/components/fids/FlightBoard';
import { useFlightsStore } from '@/store/flightsStore';
import type { Flight } from '@/types';

const FLIGHTS: Flight[] = [
  {
    id: 'fl_1',
    flightNumber: 'LO 261',
    airline: 'LOT',
    destination: 'London Heathrow',
    departureTime: '06:05',
    terminal: 'T1',
    gate: 'A1',
    status: 'On Time',
  },
  {
    id: 'fl_2',
    flightNumber: 'FR 8421',
    airline: 'Ryanair',
    destination: 'Dublin',
    departureTime: '06:35',
    terminal: 'T2',
    gate: 'B11',
    status: 'Departed',
  },
  {
    id: 'fl_3',
    flightNumber: 'W6 3304',
    airline: 'Wizz Air',
    destination: 'Budapest',
    departureTime: '07:40',
    terminal: 'T2',
    gate: 'B14',
    status: 'Delayed',
    delayMinutes: 25,
  },
  {
    id: 'fl_4',
    flightNumber: 'LH 1611',
    airline: 'Lufthansa',
    destination: 'Frankfurt',
    departureTime: '08:10',
    terminal: 'T1',
    gate: 'A4',
    status: 'Boarding',
  },
];

const ALL_FLIGHT_NUMBERS = FLIGHTS.map((f) => f.flightNumber);
const EMPTY_MESSAGE = 'No flights match the current filters.';

const initialStoreState = useFlightsStore.getState();

function expectVisibleFlights(visible: string[]) {
  for (const flightNumber of ALL_FLIGHT_NUMBERS) {
    if (visible.includes(flightNumber)) {
      expect(screen.queryByText(flightNumber)).not.toBeNull();
    } else {
      expect(screen.queryByText(flightNumber)).toBeNull();
    }
  }
}

// The filter <select>s have no labels; they are identified by their default option text.
function getFilterSelect(defaultLabel: string): HTMLSelectElement {
  return screen.getByDisplayValue(defaultLabel) as HTMLSelectElement;
}

beforeEach(() => {
  // Reset the singleton Zustand store (flights + filters) between tests.
  useFlightsStore.setState(
    {
      ...initialStoreState,
      flights: [],
      filters: { terminal: 'All', airline: 'All', status: 'All', destination: 'All' },
    },
    true,
  );
});

afterEach(() => {
  cleanup();
});

describe('FlightBoard', () => {
  describe('rendering', () => {
    it('renders every flight passed via initialFlights', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      expectVisibleFlights(ALL_FLIGHT_NUMBERS);
      expect(screen.getByText('4 flights')).not.toBeNull();
      expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull();
    });

    it('renders flight row details (time, gate, delay)', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      expect(screen.getByText('06:05')).not.toBeNull();
      expect(screen.getByText('B14')).not.toBeNull();
      expect(screen.getByText('+25m')).not.toBeNull();
    });

    it('syncs initialFlights into the store', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      expect(useFlightsStore.getState().flights).toEqual(FLIGHTS);
    });

    it('builds the destination filter options from flights, sorted', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      const options = Array.from(getFilterSelect('All Destinations').options).map(
        (o) => o.value,
      );
      expect(options).toEqual(['All', 'Budapest', 'Dublin', 'Frankfurt', 'London Heathrow']);
    });

    it('uses singular "flight" when exactly one flight is shown', () => {
      render(<FlightBoard initialFlights={[FLIGHTS[0]]} />);

      expect(screen.getByText('1 flight')).not.toBeNull();
    });
  });

  describe('filtering', () => {
    it('filters by terminal', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      fireEvent.change(getFilterSelect('All Terminals'), { target: { value: 'T2' } });

      expect(useFlightsStore.getState().filters.terminal).toBe('T2');
      expectVisibleFlights(['FR 8421', 'W6 3304']);
      expect(screen.getByText('2 flights')).not.toBeNull();
    });

    it('filters by airline', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      fireEvent.change(getFilterSelect('All Airlines'), { target: { value: 'Lufthansa' } });

      expectVisibleFlights(['LH 1611']);
    });

    it('filters by status', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      fireEvent.change(getFilterSelect('All Statuses'), { target: { value: 'Delayed' } });

      expectVisibleFlights(['W6 3304']);
    });

    it('filters by destination', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      fireEvent.change(getFilterSelect('All Destinations'), { target: { value: 'Dublin' } });

      expectVisibleFlights(['FR 8421']);
    });

    it('combines multiple filters (AND semantics)', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      fireEvent.change(getFilterSelect('All Terminals'), { target: { value: 'T1' } });
      fireEvent.change(getFilterSelect('All Statuses'), { target: { value: 'Boarding' } });

      expectVisibleFlights(['LH 1611']);
    });

    it('reacts to filters set directly on the store', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      act(() => {
        useFlightsStore.getState().setFilter('airline', 'LOT');
      });

      expectVisibleFlights(['LO 261']);
      expect(getFilterSelect('LOT').value).toBe('LOT');
    });

    it('shows all flights again when a filter is reset to "All"', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      const terminal = getFilterSelect('All Terminals');
      fireEvent.change(terminal, { target: { value: 'T1' } });
      expectVisibleFlights(['LO 261', 'LH 1611']);

      fireEvent.change(terminal, { target: { value: 'All' } });
      expectVisibleFlights(ALL_FLIGHT_NUMBERS);
    });
  });

  describe('empty state', () => {
    it('shows the empty message when there are no flights', () => {
      render(<FlightBoard initialFlights={[]} />);

      expect(screen.getByText(EMPTY_MESSAGE)).not.toBeNull();
      expect(screen.getByText('0 flights')).not.toBeNull();
      expectVisibleFlights([]);
    });

    it('shows the empty message when filters match no flights', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      // Emirates exists in ALL_AIRLINES but not in the fixtures.
      fireEvent.change(getFilterSelect('All Airlines'), { target: { value: 'Emirates' } });

      expect(screen.getByText(EMPTY_MESSAGE)).not.toBeNull();
      expect(screen.getByText('0 flights')).not.toBeNull();
      expectVisibleFlights([]);
    });

    it('shows the empty message when combined filters exclude everything', () => {
      render(<FlightBoard initialFlights={FLIGHTS} />);

      fireEvent.change(getFilterSelect('All Terminals'), { target: { value: 'T1' } });
      fireEvent.change(getFilterSelect('All Destinations'), { target: { value: 'Dublin' } });

      expect(screen.getByText(EMPTY_MESSAGE)).not.toBeNull();
    });
  });
});
