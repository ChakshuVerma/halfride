import type { Request, Response } from 'express';

const DEFAULT_FLIGHTSTATS_URL =
  'https://www.flightstats.com/v2/api-next/flight-tracker/AI/2988/2026/1/19';

export async function publicData(req: Request, res: Response) {
  if (req.user) {
    return res.json({
      message: `Hello ${req.user.uid}`,
      personalized: true,
      timestamp: new Date().toISOString(),
    });
  }

  return res.json({
    message: 'Hello guest',
    personalized: false,
    timestamp: new Date().toISOString(),
  });
}

export async function publicFlightStatus(_req: Request, res: Response) {
  try {
    // Allow frontend to send flightNumber (e.g. "AI 2988") and flight date (YYYY-MM-DD)
    const flightNumberRaw = _req.query.flightNumber as string | undefined;
    const flightDateRaw = _req.query.date as string | undefined;

    let url = DEFAULT_FLIGHTSTATS_URL;
    if (flightNumberRaw && flightDateRaw) {
      const [carrierFs, numberPart] = flightNumberRaw.trim().split(/\s+/);
      const [yearStr, monthStr, dayStr] = flightDateRaw.split('-');

      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      if (carrierFs && numberPart && !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        url = `https://www.flightstats.com/v2/api-next/flight-tracker/${encodeURIComponent(
          carrierFs
        )}/${encodeURIComponent(numberPart)}/${year}/${month}/${day}`;
      }
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ ok: false, error: 'Failed to fetch flight status' });
    }
    const data = await response.json();
    return res.json({ ok: true, data });
  } catch (error) {
    console.error('Error fetching flight status', error);
    return res
      .status(500)
      .json({ ok: false, error: 'Flight status proxy failed' });
  }
}

