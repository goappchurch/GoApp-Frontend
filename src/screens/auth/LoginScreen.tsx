import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { showAlert } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { colors, radius, shadow } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Missing fields', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      showAlert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Text style={styles.logoChar}>G</Text>
              </View>
            </View>
          </View>
          <Text style={styles.appName}>GraceLink</Text>
          <Text style={styles.tagline}>Go and preach the Gospel</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, shadow.md]}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account</Text>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.inactive}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.inactive}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>GoAppChurch · Private Access Only</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 40 },
  hero: { alignItems: 'center', marginBottom: 32 },
  logoWrap: { marginBottom: 16 },
  logoOuter: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoChar: { fontSize: 36, fontWeight: '800', color: colors.primary },
  appName: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    padding: 28,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.textPrimary },
  eyeBtn: { padding: 4 },

  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...shadow.lg,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 24 },
});
