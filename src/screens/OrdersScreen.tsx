import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../api';
import { Card, EmptyState, Feedback, ListSkeleton, PrimaryButton, ScreenHeader, Toast, sharedStyles } from '../components';
import { colors, fonts } from '../theme';
import type { Address, CartResponse, Order, Product } from '../types';

type AddressForm = Omit<Address, 'id'>;
type PaymentResponse = { mensaje: string; pedido: Order };

const emptyAddress: AddressForm = {
  calle: '', numero: '', colonia: '', ciudad: '', estado: '', codigo_postal: '', referencias: '',
};

export function OrdersScreen({
  isUser,
  checkoutRequested,
  onCheckoutClosed,
  onPaid,
  onRequireLogin,
  onBrowse,
}: {
  isUser: boolean;
  checkoutRequested: boolean;
  onCheckoutClosed: () => void;
  onPaid: (order: Order, address?: Address) => void;
  onRequireLogin: () => void;
  onBrowse: () => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cart, setCart] = useState<CartResponse>({ items: [], total_items: 0 });
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [form, setForm] = useState<AddressForm>(emptyAddress);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const invalidCartItems = cart.items.filter((item) => {
    const stock = item.producto.stock;
    return item.producto.disponible === false || stock === 0 || (typeof stock === 'number' && item.cantidad > stock);
  });

  async function loadData() {
    if (!isUser) return;
    setLoading(true);
    setError('');
    try {
      const requests: [Promise<Order[]>, Promise<Address[]>, Promise<CartResponse>?, Promise<Product[]>?] = [
        api.get<Order[]>('/pedidos/'),
        api.get<Address[]>('/direcciones/'),
      ];
      if (checkoutRequested) {
        requests.push(api.get<CartResponse>('/carrito/'));
        requests.push(api.get<Product[]>('/productos/'));
      }
      const [orderData, addressData, cartData, productData] = await Promise.all(requests);
      setOrders(orderData.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()));
      setAddresses(addressData);
      if (cartData) {
        const productInfo = new Map((productData || []).map((product) => [product.id, product]));
        setCart({
          ...cartData,
          items: cartData.items.map((item) => ({
            ...item,
            producto: {
              ...item.producto,
              stock: productInfo.get(item.producto_id)?.stock,
              disponible: productInfo.get(item.producto_id)?.disponible,
            },
          })),
        });
      }
      if (addressData.length && !selectedAddress) setSelectedAddress(addressData[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la información de pedidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function createAddress(): Promise<Address | null> {
    const required = ['calle', 'numero', 'colonia', 'ciudad', 'estado', 'codigo_postal'] as const;
    if (required.some((field) => !form[field].trim())) {
      setError('Completa todos los datos obligatorios de la dirección.');
      return null;
    }
    const address = await api.post<Address>('/direcciones/', form);
    setToast('Dirección guardada.');
    setAddresses((current) => [...current, address]);
    setSelectedAddress(address.id);
    setShowNewAddress(false);
    setForm(emptyAddress);
    return address;
  }

  async function pay() {
    setError('');
    if (invalidCartItems.length) {
      setError('Hay productos sin stock suficiente. Vuelve al carrito y ajusta las cantidades.');
      return;
    }
    setPaying(true);
    try {
      let address = addresses.find((item) => item.id === selectedAddress);
      if (showNewAddress || !address) address = (await createAddress()) || undefined;
      if (!address) return;
      const response = await api.post<PaymentResponse>('/ventas/pagar/', { direccion_id: address.id });
      setToast(response.mensaje);
      onPaid(response.pedido, address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar el pago.');
    } finally {
      setPaying(false);
    }
  }

  useEffect(() => { loadData(); }, [isUser, checkoutRequested]);

  if (!isUser) {
    return (
      <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
        <ScreenHeader title="Mis pedidos" copy="Inicia sesión para comprar y consultar el estado de tus pedidos." />
        <EmptyState icon="lock-closed-outline" title="Acceso para usuarios" copy="Tu historial y pagos se guardan de forma segura en tu cuenta." action={<PrimaryButton label="Iniciar sesión" onPress={onRequireLogin} />} />
      </ScrollView>
    );
  }

  if (checkoutRequested) {
    const total = cart.items.reduce((sum, item) => sum + Number(item.producto.precio) * item.cantidad, 0);
    return (
      <View style={sharedStyles.screen}>
      <ScrollView
        style={sharedStyles.screen}
        contentContainerStyle={sharedStyles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <Pressable onPress={onCheckoutClosed} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
          <Text style={styles.backText}>Volver al carrito</Text>
        </Pressable>
        <ScreenHeader title="Pedidos y pago" copy="Confirma tu dirección y revisa tu compra antes de pagar." />
        <Feedback message={error} />
        <Feedback
          message={invalidCartItems.length ? 'Hay productos sin stock suficiente. Vuelve al carrito y ajusta las cantidades.' : ''}
        />

        <Text style={sharedStyles.sectionTitle}>Direcciones guardadas</Text>
        {loading && !addresses.length ? <ListSkeleton count={2} /> : null}
        {addresses.map((address) => (
          <Pressable key={address.id} onPress={() => { setSelectedAddress(address.id); setShowNewAddress(false); }} style={[styles.addressCard, selectedAddress === address.id && !showNewAddress && styles.addressCardActive]}>
            <Ionicons name={selectedAddress === address.id && !showNewAddress ? 'radio-button-on' : 'radio-button-off'} size={21} color={colors.primary} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressTitle}>{address.calle} {address.numero}</Text>
              <Text style={sharedStyles.muted}>{address.colonia}, {address.ciudad}, {address.estado}, CP {address.codigo_postal}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable onPress={() => setShowNewAddress((current) => !current)} style={styles.newAddressToggle}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.newAddressText}>{showNewAddress ? 'Ocultar nueva dirección' : 'Agregar nueva dirección'}</Text>
        </Pressable>

        {showNewAddress || !addresses.length ? (
          <Card>
            <Text style={sharedStyles.sectionTitle}>Nueva dirección</Text>
            {Object.keys(form).map((field) => (
              <View key={field} style={styles.field}>
                <Text style={sharedStyles.label}>{addressLabels[field as keyof AddressForm]}</Text>
                <TextInput
                  value={form[field as keyof AddressForm]}
                  onChangeText={(value) => setForm((current) => ({ ...current, [field]: value }))}
                  placeholder={addressPlaceholders[field as keyof AddressForm]}
                  placeholderTextColor={colors.muted}
                  style={[sharedStyles.input, field === 'referencias' && styles.references]}
                  multiline={field === 'referencias'}
                />
              </View>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={sharedStyles.sectionTitle}>Resumen del pedido</Text>
          {cart.items.map((item) => (
            <View key={item.id} style={sharedStyles.rowBetween}>
              <View style={styles.summaryItem}>
                <Text numberOfLines={1} style={styles.summaryName}>{item.producto.nombre}</Text>
                <Text style={[
                  sharedStyles.muted,
                  typeof item.producto.stock === 'number' && item.cantidad > item.producto.stock && styles.stockError,
                ]}>
                  {item.cantidad} unidad(es)
                  {typeof item.producto.stock === 'number' ? ` · ${item.producto.stock} disponibles` : ''}
                </Text>
              </View>
              <Text style={styles.summaryPrice}>${(Number(item.producto.precio) * item.cantidad).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={sharedStyles.rowBetween}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>${total.toFixed(2)}</Text></View>
          <PrimaryButton
            label={paying ? 'Procesando...' : 'Confirmar pago'}
            icon="lock-closed-outline"
            onPress={pay}
            disabled={paying || !cart.items.length || Boolean(invalidCartItems.length)}
          />
          <Text style={styles.secureText}>Transacción segura dentro de Mi Despensa Market</Text>
        </Card>
      </ScrollView>
      <Toast message={toast} onDone={() => setToast('')} />
      </View>
    );
  }

  return (
    <View style={sharedStyles.screen}>
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
      <ScreenHeader title="Mis pedidos" copy="Consulta tus compras y el estado actual de cada entrega." eyebrow="Historial" />
      <Feedback message={error} />
      {loading && !orders.length ? <ListSkeleton count={3} /> : null}
      {!loading && !orders.length ? <EmptyState icon="receipt-outline" title="Aún no tienes pedidos" copy="Cuando realices una compra aparecerá aquí para que puedas rastrearla." action={<PrimaryButton label="Comprar ahora" onPress={onBrowse} />} /> : null}
      {orders.map((order) => (
        <Card key={order.id}>
          <View style={sharedStyles.rowBetween}>
            <View><Text style={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</Text><Text style={sharedStyles.muted}>{new Date(order.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></View>
            <Text style={[styles.status, statusStyles[order.estado]]}>{statusLabels[order.estado]}</Text>
          </View>
          {order.items.map((item) => <Text key={item.producto_id} style={sharedStyles.body}>{item.cantidad} × {item.nombre}</Text>)}
          <View style={styles.divider} />
          <View style={sharedStyles.rowBetween}><Text style={styles.totalLabel}>Total</Text><Text style={styles.orderTotal}>${Number(order.total).toFixed(2)}</Text></View>
        </Card>
      ))}
    </ScrollView>
    <Toast message={toast} onDone={() => setToast('')} />
    </View>
  );
}

const addressLabels: Record<keyof AddressForm, string> = { calle: 'Calle', numero: 'Número', colonia: 'Colonia', ciudad: 'Ciudad', estado: 'Estado', codigo_postal: 'Código postal', referencias: 'Referencias (opcional)' };
const addressPlaceholders: Record<keyof AddressForm, string> = { calle: 'Ej. Avenida Juárez', numero: 'Interior / exterior', colonia: 'Ej. Centro', ciudad: 'Ciudad de México', estado: 'CDMX', codigo_postal: '00000', referencias: 'Portón azul, junto a la tienda...' };
const statusLabels = { pagado: 'Pagado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
const statusStyles = StyleSheet.create({ pagado: { color: colors.navy, backgroundColor: '#e7ecf5' }, enviado: { color: colors.terracotta, backgroundColor: '#fbe4da' }, entregado: { color: colors.success, backgroundColor: colors.successSoft }, cancelado: { color: colors.error, backgroundColor: colors.errorSoft } });

const styles = StyleSheet.create({
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  backText: { color: colors.primaryDark, fontFamily: fonts.bodyMedium, fontSize: 14 },
  addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  addressCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addressInfo: { flex: 1, gap: 4 },
  addressTitle: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 14 },
  newAddressToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  newAddressText: { color: colors.primary, fontFamily: fonts.headingMedium, fontSize: 14 },
  field: { gap: 7 },
  references: { minHeight: 86, paddingTop: 14, textAlignVertical: 'top' },
  summaryItem: { flex: 1, gap: 2 },
  summaryName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  summaryPrice: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 14 },
  stockError: { color: colors.error, fontFamily: fonts.bodyMedium },
  divider: { height: 1, backgroundColor: colors.line },
  totalLabel: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 19 },
  total: { color: colors.primary, fontFamily: fonts.heading, fontSize: 25 },
  secureText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, textAlign: 'center' },
  orderId: { color: colors.primary, fontFamily: fonts.heading, fontSize: 17 },
  status: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontFamily: fonts.label, fontSize: 10, textTransform: 'uppercase' },
  orderTotal: { color: colors.primary, fontFamily: fonts.heading, fontSize: 20 },
});
