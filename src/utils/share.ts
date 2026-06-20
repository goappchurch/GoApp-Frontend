import { Linking, Platform } from 'react-native';

/**
 * Open WhatsApp with a pre-filled message (the user picks the recipient).
 * Tickets are stored as URLs, so we share the link as text — the recipient
 * taps it to view/download the PDF.
 */
export async function shareViaWhatsApp(message: string) {
  const encoded = encodeURIComponent(message);
  const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

  if (Platform.OS === 'web') {
    window.open(webUrl, '_blank');
    return;
  }

  const appUrl = `whatsapp://send?text=${encoded}`;
  try {
    const canOpen = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpen ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

function fmtDateTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export interface FlightShareLeg {
  label?: string | null;         // e.g. "Leg 1", "Connection 2"
  from?: string | null;
  to?: string | null;
  fromAirport?: string | null;
  toAirport?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  checkin?: string | null;       // ISO
  departure?: string | null;     // ISO
  arrival?: string | null;       // ISO
  ticketUrl?: string | null;
}

function legBlock(leg: FlightShareLeg): string {
  const lines: string[] = [];
  if (leg.label) lines.push(`*${leg.label}*`);
  const fromStr = [leg.from, leg.fromAirport].filter(Boolean).join(' · ');
  const toStr = [leg.to, leg.toAirport].filter(Boolean).join(' · ');
  if (fromStr) lines.push(`🛫 Boarding: ${fromStr}`);
  if (toStr) lines.push(`🛬 Deboarding: ${toStr}`);
  const flight = [leg.airline, leg.flightNumber].filter(Boolean).join(' · ');
  if (flight) lines.push(`✈️ ${flight}`);
  const checkin = fmtDateTime(leg.checkin);
  if (checkin) lines.push(`🧳 Check-in: ${checkin}`);
  const dep = fmtDateTime(leg.departure);
  if (dep) lines.push(`🕐 Departs: ${dep}`);
  const arr = fmtDateTime(leg.arrival);
  if (arr) lines.push(`🕓 Arrives: ${arr}`);
  if (leg.ticketUrl) lines.push(`📄 Ticket: ${leg.ticketUrl}`);
  return lines.join('\n');
}

export interface TripShareSection {
  title: string;            // "OUTBOUND" / "RETURN"
  legs: FlightShareLeg[];
}

/** Build one WhatsApp message covering the whole trip (all flights + tickets). */
export function tripShareMessage(eventTitle: string | undefined, sections: TripShareSection[]): string {
  const out: string[] = ['✈️ *GraceLink — Flight Details*'];
  if (eventTitle) out.push(`📌 ${eventTitle}`);
  for (const s of sections) {
    const legs = s.legs.filter(Boolean);
    if (!legs.length) continue;
    out.push('━━━━━━━━━━━━━━', `*${s.title}*`);
    legs.forEach((leg, i) => {
      if (i > 0) out.push('· · · · · · · ·');
      out.push(legBlock(leg));
    });
  }
  return out.join('\n');
}
