import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, shadow } from './theme';
import type { TabKey } from './types';

const logo = require('../assets/brand/logo.png');

export function BrandHeader({ name, guest }: { name?: string; guest: boolean }) {
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brandLockup}>
        <Image source={logo} style={styles.brandLogo} />
        <View>
          <Text style={styles.brandName}>Mi Despensa</Text>
          <Text style={styles.brandName}>Market</Text>
        </View>
      </View>
      <View style={styles.identityPill}>
        <Ionicons name="person-circle-outline" size={17} color={colors.primaryDark} />
        <Text numberOfLines={1} style={styles.identityText}>{guest ? 'Invitado' : name || 'Usuario'}</Text>
      </View>
    </View>
  );
}

export function ScreenHeader({ title, copy, eyebrow }: { title: string; copy?: string; eyebrow?: string }) {
  return (
    <View style={styles.screenHeader}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {copy ? <Text style={styles.subtitle}>{copy}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (pressed || disabled) && styles.buttonPressed,
      ]}>
      {icon ? <Ionicons name={icon as never} size={18} color={variant === 'primary' ? colors.white : variant === 'danger' ? colors.error : colors.primaryDark} /> : null}
      <Text style={[
        styles.buttonLabel,
        variant === 'secondary' && styles.buttonLabelSecondary,
        variant === 'danger' && styles.buttonLabelDanger,
      ]}>{label}</Text>
    </Pressable>
  );
}

export function Feedback({ message, kind = 'error' }: { message?: string; kind?: 'error' | 'success' }) {
  if (!message) return null;
  return (
    <View style={[styles.feedback, kind === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
      <Ionicons
        name={kind === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={20}
        color={kind === 'success' ? colors.success : colors.error}
      />
      <Text style={[styles.feedbackText, kind === 'success' ? styles.successText : styles.errorText]}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({
  icon,
  title,
  copy,
  action,
}: {
  icon: string;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon as never} size={34} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
      {action}
    </Card>
  );
}

const tabItems: Array<{ key: TabKey; label: string; icon: string; protected?: boolean }> = [
  { key: 'home', label: 'Inicio', icon: 'storefront-outline' },
  { key: 'assistant', label: 'Asistente', icon: 'sparkles-outline' },
  { key: 'cart', label: 'Carrito', icon: 'basket-outline', protected: true },
  { key: 'orders', label: 'Pedidos', icon: 'receipt-outline', protected: true },
  { key: 'account', label: 'Cuenta', icon: 'person-outline' },
];

export function BottomTabs({
  active,
  onChange,
  cartCount,
}: {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  cartCount: number;
}) {
  return (
    <View style={styles.tabs}>
      {tabItems.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === item.key }}
          onPress={() => onChange(item.key)}
          style={[styles.tab, active === item.key && styles.tabActive]}>
          <View>
            <Ionicons name={item.icon as never} size={21} color={active === item.key ? colors.primaryDark : colors.muted} />
            {item.key === 'cart' && cartCount > 0 ? (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{Math.min(cartCount, 99)}</Text></View>
            ) : null}
          </View>
          <Text style={[styles.tabLabel, active === item.key && styles.tabLabelActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 122, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 21 },
  body: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  label: { color: colors.text, fontFamily: fonts.label, fontSize: 13, letterSpacing: 0.3 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingHorizontal: 16,
  },
});

const styles = StyleSheet.create({
  brandHeader: {
    minHeight: 78,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.background,
  },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  brandLogo: { width: 34, height: 34, resizeMode: 'contain' },
  brandName: { color: colors.primaryDark, fontFamily: fonts.heading, fontSize: 15, lineHeight: 18 },
  identityPill: {
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  identityText: { flexShrink: 1, color: colors.primaryDark, fontFamily: fonts.bodyMedium, fontSize: 12 },
  screenHeader: { gap: 5 },
  eyebrow: { color: colors.terracotta, fontFamily: fonts.label, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 37, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.primary,
  },
  buttonSecondary: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  buttonDanger: { borderWidth: 1, borderColor: '#efb7b3', backgroundColor: '#fff8f7' },
  buttonPressed: { opacity: 0.65 },
  buttonLabel: { color: colors.white, fontFamily: fonts.headingMedium, fontSize: 15 },
  buttonLabelSecondary: { color: colors.primaryDark },
  buttonLabelDanger: { color: colors.error },
  feedback: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 12, padding: 13 },
  feedbackError: { borderLeftWidth: 4, borderLeftColor: colors.error, backgroundColor: colors.errorSoft },
  feedbackSuccess: { borderLeftWidth: 4, borderLeftColor: colors.success, backgroundColor: colors.successSoft },
  feedbackText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  errorText: { color: '#7f1515' },
  successText: { color: colors.success },
  card: { padding: 16, gap: 12, borderRadius: 16, backgroundColor: colors.surface, ...shadow },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  emptyTitle: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 20, textAlign: 'center' },
  emptyCopy: { maxWidth: 280, color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  tabs: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    minHeight: 68,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    backgroundColor: colors.surface,
    ...shadow,
  },
  tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 20 },
  tabActive: { backgroundColor: '#c8ddcb' },
  tabLabel: { color: colors.muted, fontFamily: fonts.label, fontSize: 9 },
  tabLabelActive: { color: colors.primaryDark },
  tabBadge: { position: 'absolute', right: -10, top: -7, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  tabBadgeText: { color: colors.white, fontFamily: fonts.label, fontSize: 9 },
});
