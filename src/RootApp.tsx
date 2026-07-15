import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as useJakartaFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  WorkSans_600SemiBold,
  useFonts as useWorkFonts,
} from '@expo-google-fonts/work-sans';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { api, setAccessToken } from './api';
import { BottomTabs, BrandHeader, PrimaryButton } from './components';
import { AccountScreen } from './screens/AccountScreen';
import { AssistantScreen } from './screens/AssistantScreen';
import { AuthScreen } from './screens/AuthScreen';
import { CartScreen } from './screens/CartScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { colors, fonts } from './theme';
import type { AuthResponse, CartResponse, Order, TabKey, User, Address } from './types';

const SESSION_KEY = 'mi_despensa_mobile_session';
const logo = require('../assets/brand/logo.png');

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 450, fade: true });

export default function RootApp() {
  const [jakartaLoaded, jakartaError] = useJakartaFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [workLoaded, workError] = useWorkFonts({ WorkSans_600SemiBold });
  const fontsReady = (jakartaLoaded || Boolean(jakartaError)) && (workLoaded || Boolean(workError));

  const [sessionReady, setSessionReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [entered, setEntered] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('home');
  const [cartCount, setCartCount] = useState(0);
  const [cartRefreshKey, setCartRefreshKey] = useState(0);
  const [checkoutRequested, setCheckoutRequested] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{ order: Order; address?: Address } | null>(null);

  const isUser = Boolean(user && user.rol === 'usuario');

  useEffect(() => {
    async function restoreSession() {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const data = JSON.parse(raw) as AuthResponse;
        setAccessToken(data.access);
        setRefreshToken(data.refresh);
        setUser(data.usuario);
        setEntered(data.usuario.rol === 'usuario');
      } catch {
        await AsyncStorage.removeItem(SESSION_KEY);
      } finally {
        setSessionReady(true);
      }
    }
    restoreSession();
  }, []);

  useEffect(() => {
    if (!fontsReady || !sessionReady) return;
    SplashScreen.hideAsync();
    const timer = setTimeout(() => setShowIntro(false), 1850);
    return () => clearTimeout(timer);
  }, [fontsReady, sessionReady]);

  async function saveSession(data: AuthResponse) {
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    setUser(data.usuario);
    setEntered(true);
    setTab('home');
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  async function logout() {
    try {
      if (refreshToken) await api.post('/auth/logout/', { refresh: refreshToken });
    } catch {
      // Always finish the local logout, even if the server token already expired.
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setEntered(false);
    setTab('home');
    setCartCount(0);
    setCheckoutRequested(false);
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  async function refreshCart() {
    setCartRefreshKey((current) => current + 1);
    if (!isUser) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await api.get<CartResponse>('/carrito/');
      setCartCount(cart.items.reduce((sum, item) => sum + item.cantidad, 0));
    } catch {
      setCartCount(0);
    }
  }

  useEffect(() => { refreshCart(); }, [isUser]);

  function requireLogin() {
    setEntered(false);
    setTab('account');
  }

  function goToTab(nextTab: TabKey) {
    setCompletedOrder(null);
    if (nextTab !== 'orders') setCheckoutRequested(false);
    setTab(nextTab);
  }

  if (!fontsReady || !sessionReady) return null;
  if (showIntro) return <AnimatedIntro />;

  if (!entered) {
    return (
      <SafeAreaView style={styles.shell}>
        <StatusBar style="dark" />
        <AuthScreen onAuthenticated={saveSession} onGuest={() => { setUser(null); setEntered(true); setTab('home'); }} />
      </SafeAreaView>
    );
  }

  if (completedOrder) {
    return (
      <SafeAreaView style={styles.shell}>
        <StatusBar style="dark" />
        <OrderSuccess
          order={completedOrder.order}
          address={completedOrder.address}
          onOrders={() => { setCompletedOrder(null); setCheckoutRequested(false); setTab('orders'); refreshCart(); }}
          onShop={() => { setCompletedOrder(null); setCheckoutRequested(false); setTab('home'); refreshCart(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="dark" />
      <BrandHeader name={user?.nombre} guest={!isUser} />
      <View style={styles.content}>
        {tab === 'home' ? <CatalogScreen isUser={isUser} onRequireLogin={requireLogin} onCartChanged={refreshCart} onOpenCart={() => setTab('cart')} cartCount={cartCount} /> : null}
        {tab === 'assistant' ? <AssistantScreen isUser={isUser} onRequireLogin={requireLogin} onCartChanged={refreshCart} /> : null}
        {tab === 'cart' ? <CartScreen isUser={isUser} refreshKey={cartRefreshKey} onCartChanged={refreshCart} onCheckout={() => { setCheckoutRequested(true); setTab('orders'); }} onRequireLogin={requireLogin} onBrowse={() => setTab('home')} /> : null}
        {tab === 'orders' ? <OrdersScreen isUser={isUser} checkoutRequested={checkoutRequested} onCheckoutClosed={() => { setCheckoutRequested(false); setTab('cart'); }} onPaid={(order, address) => { setCompletedOrder({ order, address }); refreshCart(); }} onRequireLogin={requireLogin} onBrowse={() => setTab('home')} /> : null}
        {tab === 'account' ? <AccountScreen user={isUser ? user : null} onLogin={requireLogin} onLogout={logout} onNavigate={(destination) => goToTab(destination)} /> : null}
      </View>
      <BottomTabs active={tab} onChange={goToTab} cartCount={cartCount} />
    </SafeAreaView>
  );
}

function AnimatedIntro() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }),
    ]).start();
    Animated.timing(lineWidth, { toValue: 1, duration: 1300, useNativeDriver: false }).start();
  }, []);

  return (
    <View style={styles.intro}>
      <Animated.View style={[styles.introContent, { opacity, transform: [{ scale }] }]}>
        <Image source={logo} style={styles.introLogo} />
        <Text style={styles.introTitle}>Mi Despensa Market</Text>
        <Text style={styles.introCopy}>Tu despensa, más cerca.</Text>
      </Animated.View>
      <View style={styles.loaderTrack}><Animated.View style={[styles.loaderLine, { width: lineWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} /></View>
    </View>
  );
}

function OrderSuccess({ order, address, onOrders, onShop }: { order: Order; address?: Address; onOrders: () => void; onShop: () => void }) {
  return (
    <View style={styles.successPage}>
      <View style={styles.successIcon}>
        <Ionicons name="basket" size={58} color={colors.primary} />
        <View style={styles.checkBadge}><Ionicons name="checkmark" size={23} color={colors.white} /></View>
      </View>
      <Text style={styles.successTitle}>¡Pedido realizado correctamente!</Text>
      <Text style={styles.successCopy}>Tu pedido <Text style={styles.successOrder}>#{order.id.slice(-6).toUpperCase()}</Text> fue registrado.</Text>
      <View style={styles.deliveryCard}>
        <View style={styles.deliveryRow}><Text style={styles.deliveryLabel}>Estado inicial</Text><Text style={styles.deliveryValue}>Pagado</Text></View>
        {address ? <Text style={styles.deliveryAddress}>Entrega en: {address.calle} {address.numero}, {address.colonia}, {address.ciudad}</Text> : null}
      </View>
      <PrimaryButton label="Ver mis pedidos" onPress={onOrders} />
      <PrimaryButton label="Seguir comprando" onPress={onShop} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 42, backgroundColor: colors.background },
  introContent: { alignItems: 'center' },
  introLogo: { width: 190, height: 190, resizeMode: 'contain' },
  introTitle: { marginTop: 26, color: colors.primary, fontFamily: fonts.heading, fontSize: 29, textAlign: 'center' },
  introCopy: { marginTop: 8, color: colors.text, fontFamily: fonts.body, fontSize: 17 },
  loaderTrack: { position: 'absolute', bottom: 88, width: 118, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.surfaceStrong },
  loaderLine: { height: 3, borderRadius: 2, backgroundColor: colors.primary },
  successPage: { flex: 1, justifyContent: 'center', gap: 18, paddingHorizontal: 24, backgroundColor: colors.background },
  successIcon: { alignSelf: 'center', width: 150, height: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 75, backgroundColor: colors.surface },
  checkBadge: { position: 'absolute', right: 1, bottom: 10, width: 47, height: 47, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.background, borderRadius: 24, backgroundColor: colors.primary },
  successTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 38, textAlign: 'center' },
  successCopy: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  successOrder: { color: colors.primary, fontFamily: fonts.headingMedium },
  deliveryCard: { gap: 12, padding: 18, borderRadius: 16, backgroundColor: colors.surface },
  deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  deliveryLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 14 },
  deliveryValue: { color: colors.success, fontFamily: fonts.headingMedium, fontSize: 14 },
  deliveryAddress: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
});
