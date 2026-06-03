/**
 * Sign-in / Sign-up screen.
 * Centered card on the warm-paper background — works on tablet & phone.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, fontSize, radius } from '../src/theme/tokens';
import { Wordmark } from '../src/components/Wordmark';
import { Btn } from '../src/components/Btn';
import { signInWithEmail, signUpWithEmail } from '../src/lib/auth';

type Mode = 'signin' | 'signup';

export default function SignInScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, fullName.trim() || undefined);
      }
      // Auth listener updates the store; go home.
      router.replace('/(tabs)/');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.brand}>
          <Wordmark size={40} />
          <Text style={styles.tagline}>Travel, together.</Text>
        </View>

        {/* mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'signin' && styles.modeBtnActive]}
            onPress={() => { setMode('signin'); setError(null); }}
          >
            <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'signup' && styles.modeBtnActive]}
            onPress={() => { setMode('signup'); setError(null); }}
          >
            <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>

        {/* form */}
        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder="Display name"
            placeholderTextColor={colors.sub}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.sub}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.sub}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={submit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Btn solid full onPress={submit} style={styles.submit}>
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Btn>
        {loading && <ActivityIndicator color={colors.acc} style={{ marginTop: 8 }} />}

        {/* skip / browse */}
        <TouchableOpacity onPress={() => router.replace('/(tabs)/')} style={styles.skip}>
          <Text style={styles.skipText}>Browse without an account →</Text>
        </TouchableOpacity>

        {/* dev hint */}
        <Text style={styles.devHint}>
          Demo: somchai@trailr.app · password123
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xxl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brand: { alignItems: 'center', gap: 6, marginBottom: spacing.md },
  tagline: { fontSize: fontSize.md, color: colors.sub },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.sm,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  modeBtnActive: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  modeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.sub },
  modeTextActive: { color: colors.ink },

  input: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  error: {
    color: '#c0392b',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  submit: { marginTop: spacing.sm },
  skip: { alignItems: 'center', marginTop: spacing.sm },
  skipText: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },
  devHint: {
    fontSize: fontSize.xs,
    color: colors.sub,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontFamily: 'monospace',
  },
});
