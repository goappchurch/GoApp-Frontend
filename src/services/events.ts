import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  Event,
  EventFormData,
  Venue,
  EventOrganizer,
  Travel,
  Accommodation,
  Note,
  Document,
  Task,
  Notification,
  ConnectionStop,
} from '../types';

export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues(*),
      organizer:event_organizers(*),
      travel:travel(
        id, event_id,
        flight_booked, boarding_point, deboarding_point,
        flight_number, airline, departure_time, checkin_time, arrival_time,
        flight_ticket_url,
        return_flight_booked, return_boarding_point, return_deboarding_point,
        return_flight_number, return_airline, return_departure_time,
        return_checkin_time, return_arrival_time, return_ticket_pdf_url
      ),
      accommodation:accommodation(*)
    `)
    .order('date_start', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeEvent);
}

export async function getUpcomingEvents(limit = 5): Promise<Event[]> {
  // Include events from 7 days ago so recently created/past events still appear
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues(*),
      organizer:event_organizers(*),
      travel:travel(*),
      accommodation:accommodation(*)
    `)
    .gte('date_start', cutoff.toISOString())
    .order('date_start', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(normalizeEvent);
}

export async function getEventById(id: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      venue:venues(*),
      organizer:event_organizers(*),
      travel:travel(*),
      accommodation:accommodation(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return normalizeEvent(data);
}

export async function getEventsByMonth(year: number, month: number): Promise<Event[]> {
  const start = new Date(year, month - 1, 1).toISOString();
  const end = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Fetch any event that overlaps with this month:
  //   • Multi-day:  date_start <= month_end  AND  date_end >= month_start
  //   • Single-day: date_end IS NULL  AND  date_start within month
  const { data, error } = await supabase
    .from('events')
    .select('*, venue:venues(*), travel:travel(*)')
    .lte('date_start', end)
    .or(`date_end.gte.${start},and(date_end.is.null,date_start.gte.${start})`)
    .order('date_start', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeEvent);
}

export async function createEvent(formData: EventFormData, userId: string): Promise<Event> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert({
      title: formData.title,
      event_type: formData.event_type,
      date_start: formData.date_start,
      date_end: formData.date_end,
      timezone: formData.timezone || 'Asia/Kolkata',
      speaking_topic: formData.speaking_topic,
      expected_audience: formData.expected_audience,
      companions: formData.companions ?? [],
      poster_url: formData.poster_url,
      created_by: userId,
    })
    .select()
    .single();

  if (eventError) throw eventError;

  const eventId = event.id;

  await Promise.all([
    supabase.from('venues').insert({
      event_id: eventId,
      name: formData.venue_name,
      address: formData.venue_address,
      city: formData.venue_city,
      country: formData.venue_country,
      region: formData.venue_region,
    }),
    supabase.from('event_organizers').insert({
      event_id: eventId,
      contact_id: formData.contact_id,
      name: formData.organizer_name,
      phone: formData.organizer_phone,
      email: formData.organizer_email,
    }),
    supabase.from('travel').insert({
      event_id: eventId,
      flight_booked: formData.flight_booked ?? false,
      boarding_point: formData.boarding_point,
      deboarding_point: formData.deboarding_point,
      flight_number: formData.flight_number,
      airline: formData.airline,
      departure_time: formData.departure_time,
      checkin_time: formData.flight_checkin_time,
      arrival_time: formData.arrival_time,
      flight_ticket_url: formData.ticket_pdf_url,
      connections: formData.connections ?? [],
      return_flight_booked: formData.return_flight_booked ?? false,
      return_boarding_point: formData.return_boarding_point,
      return_deboarding_point: formData.return_deboarding_point,
      return_flight_number: formData.return_flight_number,
      return_airline: formData.return_airline,
      return_departure_time: formData.return_departure_time,
      return_checkin_time: formData.return_flight_checkin_time,
      return_arrival_time: formData.return_arrival_time,
      return_ticket_pdf_url: formData.return_ticket_pdf_url,
      return_connections: formData.return_connections ?? [],
    }),
    supabase.from('accommodation').insert({
      event_id: eventId,
      hotel_name: formData.hotel_name,
      address: formData.hotel_address,
      check_in: formData.check_in,
      check_out: formData.check_out,
    }),
  ]);

  return getEventById(eventId);
}

export async function updateEvent(id: string, formData: Partial<EventFormData>): Promise<Event> {
  const eventUpdates: Record<string, unknown> = {};
  if (formData.title !== undefined) eventUpdates.title = formData.title;
  if (formData.event_type !== undefined) eventUpdates.event_type = formData.event_type;
  if (formData.date_start !== undefined) eventUpdates.date_start = formData.date_start;
  if (formData.date_end !== undefined) eventUpdates.date_end = formData.date_end;
  if (formData.timezone !== undefined) eventUpdates.timezone = formData.timezone;
  if (formData.speaking_topic !== undefined) eventUpdates.speaking_topic = formData.speaking_topic;
  if (formData.expected_audience !== undefined) eventUpdates.expected_audience = formData.expected_audience;
  if (formData.companions !== undefined) eventUpdates.companions = formData.companions;
  if (formData.poster_url !== undefined) eventUpdates.poster_url = formData.poster_url;

  if (Object.keys(eventUpdates).length > 0) {
    const { error } = await supabase.from('events').update(eventUpdates).eq('id', id);
    if (error) throw error;
  }

  if (formData.venue_name !== undefined || formData.venue_city !== undefined || formData.venue_region !== undefined) {
    await supabase.from('venues').upsert({
      event_id: id,
      name: formData.venue_name,
      address: formData.venue_address,
      city: formData.venue_city,
      country: formData.venue_country,
      region: formData.venue_region,
    }, { onConflict: 'event_id' });
  }

  if (formData.organizer_name !== undefined) {
    await supabase.from('event_organizers').upsert({
      event_id: id,
      contact_id: formData.contact_id,
      name: formData.organizer_name,
      phone: formData.organizer_phone,
      email: formData.organizer_email,
    }, { onConflict: 'event_id' });
  }

  if (formData.flight_booked !== undefined) {
    await supabase.from('travel').upsert({
      event_id: id,
      flight_booked: formData.flight_booked,
      boarding_point: formData.boarding_point,
      deboarding_point: formData.deboarding_point,
      flight_number: formData.flight_number,
      airline: formData.airline,
      departure_time: formData.departure_time,
      checkin_time: formData.flight_checkin_time,
      arrival_time: formData.arrival_time,
      flight_ticket_url: formData.ticket_pdf_url,
      connections: formData.connections ?? [],
      return_flight_booked: formData.return_flight_booked,
      return_boarding_point: formData.return_boarding_point,
      return_deboarding_point: formData.return_deboarding_point,
      return_flight_number: formData.return_flight_number,
      return_airline: formData.return_airline,
      return_departure_time: formData.return_departure_time,
      return_checkin_time: formData.return_flight_checkin_time,
      return_arrival_time: formData.return_arrival_time,
      return_ticket_pdf_url: formData.return_ticket_pdf_url,
      return_connections: formData.return_connections ?? [],
    }, { onConflict: 'event_id' });
  }

  if (formData.hotel_name !== undefined) {
    await supabase.from('accommodation').upsert({
      event_id: id,
      hotel_name: formData.hotel_name,
      address: formData.hotel_address,
      check_in: formData.check_in,
      check_out: formData.check_out,
    }, { onConflict: 'event_id' });
  }

  return getEventById(id);
}

export async function duplicateEvent(event: Event, userId: string): Promise<Event> {
  const formData: EventFormData = {
    title: `Copy of ${event.title}`,
    event_type: event.event_type,
    date_start: event.date_start,
    date_end: event.date_end,
    timezone: event.timezone,
    speaking_topic: event.speaking_topic,
    expected_audience: event.expected_audience,
    companions: event.companions,
    // venue — copy everything
    venue_name: event.venue?.name,
    venue_address: event.venue?.address,
    venue_city: event.venue?.city,
    venue_country: event.venue?.country,
    venue_region: event.venue?.region,
    // organizer — copy contact info
    organizer_name: event.organizer?.name,
    organizer_phone: event.organizer?.phone,
    organizer_email: event.organizer?.email,
    contact_id: event.organizer?.contact_id,
    // travel — keep route prefs, clear date-specific times & tickets
    flight_booked: event.travel?.flight_booked ?? false,
    boarding_point: event.travel?.boarding_point,
    deboarding_point: event.travel?.deboarding_point,
    airline: event.travel?.airline,
    return_flight_booked: event.travel?.return_flight_booked ?? false,
    return_boarding_point: event.travel?.return_boarding_point,
    return_deboarding_point: event.travel?.return_deboarding_point,
    return_airline: event.travel?.return_airline,
    // accommodation — keep hotel info, clear dates
    hotel_name: event.accommodation?.hotel_name,
    hotel_address: event.accommodation?.address,
  };
  return createEvent(formData, userId);
}

export async function deleteEvent(id: string): Promise<void> {
  // Delete child records first (foreign key constraints)
  await Promise.all([
    supabase.from('notes').delete().eq('event_id', id),
    supabase.from('documents').delete().eq('event_id', id),
    supabase.from('tasks').delete().eq('event_id', id),
    supabase.from('notifications').delete().eq('event_id', id),
  ]);
  await supabase.from('venues').delete().eq('event_id', id);
  await supabase.from('event_organizers').delete().eq('event_id', id);
  await supabase.from('travel').delete().eq('event_id', id);
  await supabase.from('accommodation').delete().eq('event_id', id);

  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadEventPoster(localUri: string, eventId: string): Promise<string> {
  const basePath = `${eventId}/poster-${Date.now()}`;

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const path = `${basePath}.${ext}`;
    const { data, error } = await supabase.storage
      .from('event-posters')
      .upload(path, blob, { upsert: true, contentType: mimeType });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabase.storage.from('event-posters').getPublicUrl(data.path);
    return publicUrl;
  }

  const ext = (localUri.split('.').pop() ?? 'jpg').toLowerCase().replace(/\?.*/, '');
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
  const path = `${basePath}.${ext}`;
  const formData = new FormData();
  formData.append('file', { uri: localUri, name: `poster.${ext}`, type: mimeType } as any);
  const { data, error } = await supabase.storage
    .from('event-posters')
    .upload(path, formData as any, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('event-posters').getPublicUrl(data.path);
  return publicUrl;
}

export async function uploadTicketPdf(localUri: string, eventId: string, prefix = 'ticket'): Promise<string> {
  const path = `${eventId}/${prefix}-${Date.now()}.pdf`;

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const { data, error } = await supabase.storage
      .from('event-tickets')
      .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
    if (error) throw new Error(error.message);
    const { data: { publicUrl } } = supabase.storage.from('event-tickets').getPublicUrl(data.path);
    return publicUrl;
  }

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: 'ticket.pdf', type: 'application/pdf' } as any);
  const { data, error } = await supabase.storage
    .from('event-tickets')
    .upload(path, formData as any, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from('event-tickets').getPublicUrl(data.path);
  return publicUrl;
}

export async function getNotes(eventId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*, author:users(full_name, role)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Note[];
}

export async function addNote(
  eventId: string | undefined,
  authorId: string,
  type: 'text' | 'voice',
  content?: string,
  voiceUrl?: string,
  durationSeconds?: number
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      event_id: eventId,
      author_id: authorId,
      type,
      content,
      voice_url: voiceUrl,
      duration_seconds: durationSeconds,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Note;
}

export async function getDocuments(eventId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Document[];
}

export async function getTasks(eventId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Task[];
}

export async function createTask(eventId: string, title: string, dueDate?: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ event_id: eventId, title, due_date: dueDate })
    .select()
    .single();

  if (error) throw error;
  return data as Task;
}

export async function toggleTask(taskId: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', taskId);
  if (error) throw error;
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

function normalizeEvent(raw: Record<string, unknown>): Event {
  return {
    ...raw,
    venue: Array.isArray(raw.venue) ? raw.venue[0] : raw.venue,
    organizer: Array.isArray(raw.organizer) ? raw.organizer[0] : raw.organizer,
    travel: Array.isArray(raw.travel) ? raw.travel[0] : raw.travel,
    accommodation: Array.isArray(raw.accommodation) ? raw.accommodation[0] : raw.accommodation,
  } as Event;
}
