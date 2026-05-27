import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store has a 2KB limit per key — chunk large values
const CHUNK_SIZE = 1800;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return localStorage.getItem(key);
      const count = await SecureStore.getItemAsync(`${key}_count`);
      if (!count) return await SecureStore.getItemAsync(key);
      const chunks: string[] = [];
      for (let i = 0; i < parseInt(count); i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (chunk == null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      const chunks = Math.ceil(value.length / CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}_count`, String(chunks));
      for (let i = 0; i < chunks; i++) {
        await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
    } catch (e) {
      console.warn('SecureStore setItem failed:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
      const count = await SecureStore.getItemAsync(`${key}_count`);
      if (count) {
        for (let i = 0; i < parseInt(count); i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_count`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
