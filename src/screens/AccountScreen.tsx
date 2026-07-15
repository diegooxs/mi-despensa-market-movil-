import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, ScreenHeader, sharedStyles } from '../components';
import { colors, fonts } from '../theme';
import type { User } from '../types';

export function AccountScreen({ user, onLogin, onLogout, onNavigate }: { user: User | null; onLogin: () => void; onLogout: () => void; onNavigate: (destination: 'orders' | 'cart' | 'assistant') => void }) {
  if (!user) {
    return (
      <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
        <ScreenHeader title="Tu cuenta" copy="Inicia sesión para comprar, guardar tu carrito y revisar tus pedidos." eyebrow="Perfil invitado" />
        <Card style={styles.guestCard}>
          <View style={styles.guestIcon}><Ionicons name="storefront-outline" size={42} color={colors.primary} /></View>
          <Text style={styles.guestTitle}>Compra con todos los beneficios</Text>
          <Text style={styles.guestCopy}>Al registrarte podrás guardar compras, consultar pedidos y escribir reseñas de productos que ya compraste.</Text>
          <PrimaryButton label="Iniciar sesión o crear cuenta" onPress={onLogin} />
        </Card>
        <View style={styles.benefitGrid}>
          <Benefit icon="cart-outline" label="Comprar productos" />
          <Benefit icon="basket-outline" label="Guardar carrito" />
          <Benefit icon="receipt-outline" label="Revisar pedidos" />
          <Benefit icon="chatbox-outline" label="Escribir reseñas" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <ScreenHeader title="Mi perfil" copy="Administra tu actividad en Mi Despensa Market." eyebrow="Cuenta" />
      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.nombre.slice(0, 1).toUpperCase()}</Text></View>
        <Text style={styles.name}>{user.nombre}</Text>
        <Text style={styles.email}>{user.correo}</Text>
        <Text style={styles.role}>Usuario</Text>
      </View>
      <Card style={styles.menuCard}>
        <MenuItem icon="receipt-outline" label="Mis pedidos" onPress={() => onNavigate('orders')} />
        <MenuItem icon="basket-outline" label="Mi carrito" onPress={() => onNavigate('cart')} />
        <MenuItem icon="sparkles-outline" label="Asistente de compras" onPress={() => onNavigate('assistant')} />
      </Card>
      <PrimaryButton label="Cerrar sesión" icon="log-out-outline" onPress={onLogout} variant="danger" />
    </ScrollView>
  );
}

function Benefit({ icon, label }: { icon: string; label: string }) {
  return <View style={styles.benefit}><Ionicons name={icon as never} size={23} color={colors.primary} /><Text style={styles.benefitText}>{label}</Text></View>;
}

function MenuItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <View style={styles.menuIcon}><Ionicons name={icon as never} size={23} color={colors.primary} /></View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  guestCard: { alignItems: 'center', paddingVertical: 28 },
  guestIcon: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', borderRadius: 38, backgroundColor: colors.primarySoft },
  guestTitle: { color: colors.primary, fontFamily: fonts.heading, fontSize: 24, textAlign: 'center' },
  guestCopy: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  benefit: { width: '48%', minHeight: 82, padding: 14, gap: 8, borderRadius: 14, backgroundColor: colors.surface },
  benefitText: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13 },
  profileHeader: { alignItems: 'center', gap: 7, paddingVertical: 14 },
  avatar: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: colors.surface, borderRadius: 52, backgroundColor: colors.primary },
  avatarText: { color: colors.white, fontFamily: fonts.heading, fontSize: 40 },
  name: { marginTop: 7, color: colors.text, fontFamily: fonts.heading, fontSize: 25 },
  email: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  role: { overflow: 'hidden', color: colors.primaryDark, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: colors.successSoft },
  menuCard: { paddingVertical: 0, gap: 0 },
  menuItem: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: colors.line },
  menuItemPressed: { opacity: 0.65 },
  menuIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft },
  menuLabel: { flex: 1, color: colors.text, fontFamily: fonts.headingMedium, fontSize: 16 },
});
