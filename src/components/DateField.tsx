import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

interface Props {
  label?: string;
  value?: string;
  onChange: (iso: string) => void;
  mode?: 'datetime' | 'date';
  placeholder?: string;
  accentColor?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function parseValue(value: string | undefined, mode: 'datetime' | 'date'): Date | null {
  if (!value) return null;
  const d = new Date(value + (mode === 'date' && value.length === 10 ? 'T00:00:00' : ''));
  return isNaN(d.getTime()) ? null : d;
}

// Mask raw input → "DD/MM/YYYY"
function maskDate(t: string): string {
  const digits = t.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length >= 3) out += '/' + digits.slice(2, 4);
  if (digits.length >= 5) out += '/' + digits.slice(4, 8);
  return out;
}

// Mask raw input → "hh:mm"
function maskTime(t: string): string {
  const digits = t.replace(/\D/g, '').slice(0, 4);
  let out = digits.slice(0, 2);
  if (digits.length >= 3) out += ':' + digits.slice(2, 4);
  return out;
}

export default function DateField({
  label,
  value,
  onChange,
  mode = 'datetime',
  accentColor = colors.primary,
}: Props) {
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const selfEmit = useRef(false);

  // Sync local fields from an external value change (edit load, duplicate, defaultDate).
  // Skip when the change came from our own emit so we don't clobber typing.
  useEffect(() => {
    if (selfEmit.current) { selfEmit.current = false; return; }
    const d = parseValue(value, mode);
    if (!d) { setDateText(''); setTimeText(''); setAmpm('AM'); return; }
    setDateText(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
    if (mode === 'datetime') {
      setTimeText(`${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())}`);
      setAmpm(d.getHours() >= 12 ? 'PM' : 'AM');
    }
  }, [value, mode]);

  const commit = (dText: string, tText: string, ap: 'AM' | 'PM') => {
    const dm = dText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dm) return; // incomplete date — wait for full DD/MM/YYYY
    const day = +dm[1], month = +dm[2], year = +dm[3];
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return;

    // Reject impossible dates (e.g. 31/02) — JS would silently roll them over
    const check = new Date(year, month - 1, day);
    if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) return;

    if (mode === 'date') {
      selfEmit.current = true;
      onChange(`${year}-${pad(month)}-${pad(day)}`);
      return;
    }

    let h = 12, min = 0;
    const tm = tText.match(/^(\d{1,2}):(\d{2})$/);
    if (tm) { h = +tm[1]; min = +tm[2]; }
    if (h < 1 || h > 12 || min > 59) return;
    let hour24 = h % 12;
    if (ap === 'PM') hour24 += 12;
    selfEmit.current = true;
    onChange(new Date(year, month - 1, day, hour24, min).toISOString());
  };

  const onDateChange = (t: string) => {
    const masked = maskDate(t);
    setDateText(masked);
    commit(masked, timeText, ampm);
  };
  const onTimeChange = (t: string) => {
    const masked = maskTime(t);
    setTimeText(masked);
    commit(dateText, masked, ampm);
  };
  const toggleAmpm = (p: 'AM' | 'PM') => {
    setAmpm(p);
    commit(dateText, timeText, p);
  };

  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      {/* Date */}
      <View style={styles.field}>
        <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
          <Ionicons name="calendar-outline" size={11} color="#fff" />
        </View>
        <TextInput
          style={styles.input}
          value={dateText}
          onChangeText={onDateChange}
          placeholder="DD/MM/YYYY"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>

      {/* Time (datetime only) — own row below */}
      {mode === 'datetime' && (
        <View style={styles.timeRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              value={timeText}
              onChangeText={onTimeChange}
              placeholder="hh:mm"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <TouchableOpacity
            onPress={() => toggleAmpm(ampm === 'AM' ? 'PM' : 'AM')}
            activeOpacity={0.75}
            style={[styles.ampmToggle, { backgroundColor: accentColor }]}
          >
            <Text style={styles.ampmToggleText}>{ampm}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 4, marginLeft: 2 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#C4CDD8',
    backgroundColor: 'rgba(255,255,255,0.96)', paddingHorizontal: 10,
  },
  iconWrap: { width: 22, height: 22, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 13, fontWeight: '700', color: '#0F172A', paddingVertical: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ampmToggle: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  ampmToggleText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
