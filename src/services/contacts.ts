import { supabase } from '../lib/supabase';
import { Contact } from '../types';

export async function getContacts(): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return (data || []) as Contact[];
}

export async function createContact(
  contact: Omit<Contact, 'id' | 'created_at' | 'created_by'>,
  userId: string
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...contact, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(
  id: string,
  contact: Partial<Omit<Contact, 'id' | 'created_at' | 'created_by'>>
): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .update(contact)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}
