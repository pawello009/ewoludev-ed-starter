import fs from 'fs';
import path from 'path';
import type { Flight } from '@/types';

const dataPath = path.join(process.cwd(), 'data', 'flights.json');
const seedPath = path.join(process.cwd(), 'data', 'flights.seed.json');

const BOARDING_OPENS_BEFORE_MIN = 25;
const DEPARTED_AFTER_MIN = 10;

function getDepartureMinutes(flight: Flight): number {
  const [h, m] = flight.departureTime.split(':').map(Number);
  return h * 60 + m + (flight.delayMinutes ?? 0);
}

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isDeparted(depMinutes: number, nowMinutes: number): boolean {
  return nowMinutes > depMinutes + DEPARTED_AFTER_MIN;
}

function isBoarding(depMinutes: number, nowMinutes: number): boolean {
  return (
    nowMinutes >= depMinutes - BOARDING_OPENS_BEFORE_MIN &&
    !isDeparted(depMinutes, nowMinutes)
  );
}

function isDelayed(flight: Flight): boolean {
  return Boolean(flight.delayMinutes);
}

function computeFlightStatus(flight: Flight): Flight {
  if (flight.status === 'Cancelled') return flight;

  const depMinutes = getDepartureMinutes(flight);
  const nowMinutes = getNowMinutes();

  let status: Flight['status'] = 'On Time';
  if (isDeparted(depMinutes, nowMinutes)) status = 'Departed';
  else if (isBoarding(depMinutes, nowMinutes)) status = 'Boarding';
  else if (isDelayed(flight)) status = 'Delayed';

  return { ...flight, status };
}

export function readFlights(): Flight[] {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const flights = JSON.parse(raw) as Flight[];
  return flights.map(computeFlightStatus);
}

export function writeFlights(flights: Flight[]): void {
  fs.writeFileSync(dataPath, JSON.stringify(flights, null, 2), 'utf-8');
}

export function resetToSeed(): Flight[] {
  const raw = fs.readFileSync(seedPath, 'utf-8');
  const seed = JSON.parse(raw) as Flight[];
  writeFlights(seed);
  return seed.map(computeFlightStatus);
}
