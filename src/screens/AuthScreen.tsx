import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../api';
import { Feedback, PrimaryButton, sharedStyles } from '../components';
import { colors, fonts, shadow } from '../theme';
import type { AuthResponse } from '../types';

const logo = require('../../assets/brand/logo.png');
const waveFrames = [
  require('../../assets/brand/bread-wave-1.png'),
  require('../../assets/brand/bread-wave-2.png'),
  require('../../assets/brand/bread-wave-3.png'),
];
const breadCover = require('../../assets/brand/bread-cover.png');
const breadPeek = require('../../assets/brand/bread-peek.png');

export function AuthScreen({
  onAuthenticated,
  onGuest,
}: {
  onAuthenticated: (data: AuthResponse) => Promise<void>;
  onGuest: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [waveFrame, setWaveFrame] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (passwordFocused) return;
    const timer = setInterval(() => setWaveFrame((current) => (current + 1) % waveFrames.length), 420);
    return () => clearInterval(timer);
  }, [passwordFocused]);

  async function submit() {
    setError('');
    if (!correo.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    if (mode === 'register' && (!nombre.trim() || password !== confirmPassword)) {
      setError(!nombre.trim() ? 'Ingresa tu nombre completo.' : 'Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const data = mode === 'login'
        ? await api.post<AuthResponse>('/auth/login/', { correo: correo.trim(), password })
        : await api.post<AuthResponse>('/auth/registro/', { nombre: nombre.trim(), correo: correo.trim(), password });

      if (data.usuario.rol !== 'usuario') {
        setError('Esta aplicación móvil es para compradores. Usa el panel web para administrar.');
        return;
      }
      await onAuthenticated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible acceder.');
    } finally {
      setLoading(false);
    }
  }

  const character = passwordFocused ? (passwordVisible ? breadPeek : breadCover) : waveFrames[waveFrame];

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={logo} style={styles.logo} />
        <Image source={character} style={styles.character} />

        <View style={styles.intro}>
          <Text style={styles.title}>{mode === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}</Text>
          <Text style={styles.copy}>
            {mode === 'login'
              ? 'Ingresa a tu cuenta para comprar o continúa como invitado.'
              : 'Únete para comprar, pagar y dar seguimiento a tus pedidos.'}
          </Text>
        </View>

        <Feedback message={error} />

        <View style={styles.form}>
          {mode === 'register' ? (
            <Field label="Nombre completo">
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Juan Pérez"
                placeholderTextColor={colors.muted}
                style={sharedStyles.input}
                onFocus={() => setPasswordFocused(false)}
              />
            </Field>
          ) : null}

          <Field label="Correo electrónico">
            <TextInput
              value={correo}
              onChangeText={setCorreo}
              placeholder="ejemplo@correo.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={sharedStyles.input}
              onFocus={() => setPasswordFocused(false)}
            />
          </Field>

          <Field label="Contraseña">
            <View style={styles.passwordBox}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                placeholderTextColor={colors.muted}
                secureTextEntry={!passwordVisible}
                style={styles.passwordInput}
                onFocus={() => setPasswordFocused(true)}
              />
              <Pressable
                accessibilityLabel={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => {
                  setPasswordFocused(true);
                  setPasswordVisible((current) => !current);
                }}
                style={styles.eyeButton}>
                <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={23} color={colors.primary} />
              </Pressable>
            </View>
          </Field>

          {mode === 'register' ? (
            <Field label="Confirmar contraseña">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                placeholderTextColor={colors.muted}
                secureTextEntry={!passwordVisible}
                style={sharedStyles.input}
                onFocus={() => setPasswordFocused(true)}
              />
            </Field>
          ) : null}

          {loading ? <ActivityIndicator color={colors.primary} /> : null}
          <PrimaryButton label={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} onPress={submit} disabled={loading} />

          {mode === 'login' ? (
            <PrimaryButton label="Entrar como invitado" onPress={onGuest} variant="secondary" />
          ) : null}

          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={styles.modeLink}>
            <Text style={styles.modeCopy}>{mode === 'login' ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}</Text>
            <Text style={styles.modeAction}>{mode === 'login' ? ' Crear cuenta' : ' Inicia sesión'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={sharedStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { minHeight: '100%', paddingHorizontal: 24, paddingTop: 34, paddingBottom: 38, alignItems: 'center' },
  logo: { width: 84, height: 84, resizeMode: 'contain' },
  character: { width: 190, height: 126, marginTop: 14, resizeMode: 'contain' },
  intro: { alignItems: 'center', gap: 7, marginTop: 8, marginBottom: 24 },
  title: { color: colors.primary, fontFamily: fonts.heading, fontSize: 34, letterSpacing: -0.8 },
  copy: { maxWidth: 340, color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  form: { width: '100%', maxWidth: 440, gap: 16, marginTop: 14, padding: 18, borderRadius: 20, backgroundColor: colors.surface, ...shadow },
  field: { gap: 7 },
  passwordBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  passwordInput: { flex: 1, minHeight: 52, paddingHorizontal: 16, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  eyeButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  modeLink: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', paddingVertical: 6 },
  modeCopy: { color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  modeAction: { color: colors.primary, fontFamily: fonts.headingMedium, fontSize: 14 },
});
