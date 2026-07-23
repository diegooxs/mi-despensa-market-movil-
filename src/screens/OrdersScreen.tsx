import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../api';
import { Card, EmptyState, Feedback, ListSkeleton, PrimaryButton, ScreenHeader, Toast, sharedStyles } from '../components';
import { colors, fonts } from '../theme';
import type { Address, CartResponse, Order, Product } from '../types';

type AddressForm = Omit<Address, 'id'>;
type PaymentResponse = {
  mensaje: string;
  pedido: Order;
  pago?: { id: string; estado: 'pendiente' | 'pagado' | 'reembolsado' | 'cancelado'; metodo?: 'tarjeta' | 'efectivo'; qr_codigo?: string };
};

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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
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
    if (paymentMethod === 'card' && (!cardNumber || !cardName.trim() || !cardExpiry || !cardCvc)) {
      setError('Completa los datos de la tarjeta para confirmar el pago.');
      return;
    }
    setPaying(true);
    try {
      let address = addresses.find((item) => item.id === selectedAddress);
      if (showNewAddress || !address) address = (await createAddress()) || undefined;
      if (!address) return;
      const response = await api.post<PaymentResponse>('/ventas/pagar/', {
        direccion_id: address.id,
        metodo_pago: paymentMethod === 'cash' ? 'efectivo' : 'tarjeta',
      });
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
    const totalItems = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
    return (
      <View style={sharedStyles.screen}>
      <ScrollView
        style={sharedStyles.screen}
        contentContainerStyle={styles.checkoutContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <Pressable onPress={onCheckoutClosed} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
          <Text style={styles.backText}>Volver al carrito</Text>
        </Pressable>
        <ScreenHeader title="Pedidos y pago" copy="Confirma tu dirección, elige cómo pagar y revisa tu compra." eyebrow="Checkout" />
        <Feedback message={error} />
        <Feedback
          message={invalidCartItems.length ? 'Hay productos sin stock suficiente. Vuelve al carrito y ajusta las cantidades.' : ''}
        />

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="home-outline" size={19} color={colors.primary} />
            </View>
            <View>
              <Text style={sharedStyles.sectionTitle}>Dirección de entrega</Text>
              <Text style={sharedStyles.muted}>Selecciona dónde quieres recibir tu pedido.</Text>
            </View>
          </View>
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
        </Card>

        {showNewAddress || !addresses.length ? (
          <Card style={styles.sectionCard}>
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

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionIcon}>
              <Ionicons name="card-outline" size={19} color={colors.primary} />
            </View>
            <View>
              <Text style={sharedStyles.sectionTitle}>Método de pago</Text>
              <Text style={sharedStyles.muted}>Este pago se registra dentro del sistema como compra completada.</Text>
            </View>
          </View>

          <View style={styles.paymentTabs}>
            <Pressable onPress={() => setPaymentMethod('card')} style={[styles.paymentTab, paymentMethod === 'card' && styles.paymentTabActive]}>
              <Ionicons name="card-outline" size={21} color={paymentMethod === 'card' ? colors.white : colors.primaryDark} />
              <Text style={[styles.paymentTabText, paymentMethod === 'card' && styles.paymentTabTextActive]}>Tarjeta</Text>
            </Pressable>
            <Pressable onPress={() => setPaymentMethod('cash')} style={[styles.paymentTab, paymentMethod === 'cash' && styles.paymentTabActive]}>
              <Ionicons name="qr-code-outline" size={21} color={paymentMethod === 'cash' ? colors.white : colors.primaryDark} />
              <Text style={[styles.paymentTabText, paymentMethod === 'cash' && styles.paymentTabTextActive]}>Efectivo</Text>
            </Pressable>
          </View>

          {paymentMethod === 'card' ? (
            <View style={styles.cardPayment}>
              <View style={styles.cardPreview}>
                <View style={styles.cardTopRow}>
                  <View style={styles.cardChip} />
                  <CardBrand number={cardNumber} />
                </View>
                <Text style={styles.cardNumber}>{formatCardPreview(cardNumber)}</Text>
                <View style={styles.cardBottomRow}>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardMetaLabel}>Titular</Text>
                    <Text numberOfLines={1} style={styles.cardMetaValue}>{cardName || 'Nombre Apellido'}</Text>
                  </View>
                  <View style={styles.cardMetaRight}>
                    <Text style={styles.cardMetaLabel}>Vence</Text>
                    <Text style={styles.cardMetaValue}>{cardExpiry || 'MM/AA'}</Text>
                  </View>
                </View>
              </View>

              <TextInput
                value={cardNumber}
                onChangeText={(value) => setCardNumber(formatCardNumber(value))}
                placeholder="0000 0000 0000 0000"
                keyboardType="number-pad"
                maxLength={19}
                placeholderTextColor={colors.muted}
                style={sharedStyles.input}
              />
              <TextInput
                value={cardName}
                onChangeText={setCardName}
                placeholder="Nombre como aparece en la tarjeta"
                placeholderTextColor={colors.muted}
                style={sharedStyles.input}
              />
              <View style={styles.paymentFieldsRow}>
                <TextInput
                  value={cardExpiry}
                  onChangeText={(value) => setCardExpiry(formatExpiry(value))}
                  placeholder="MM/AA"
                  keyboardType="number-pad"
                  maxLength={5}
                  placeholderTextColor={colors.muted}
                  style={[sharedStyles.input, styles.paymentHalfInput]}
                />
                <TextInput
                  value={cardCvc}
                  onChangeText={(value) => setCardCvc(value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CVC"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                  style={[sharedStyles.input, styles.paymentHalfInput]}
                />
              </View>
            </View>
          ) : (
            <View style={styles.cashPayment}>
              <QrPreview value={`MDM|EFECTIVO|TOTAL:${total.toFixed(2)}|ITEMS:${totalItems}`} />
              <Text style={styles.cashTitle}>Pago pendiente en caja</Text>
              <Text style={styles.cashCopy}>Al finalizar, se generará un pedido pendiente por pagar. Muestra el QR o folio en caja para confirmar el cobro.</Text>
            </View>
          )}
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={sharedStyles.sectionTitle}>Resumen del pedido</Text>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.summaryRow}>
              <View style={styles.summaryImageWrap}>
                {item.producto.imagen_url ? (
                  <Image source={{ uri: item.producto.imagen_url }} style={styles.summaryImage} />
                ) : (
                  <Ionicons name="cube-outline" size={24} color={colors.primary} />
                )}
              </View>
              <View style={styles.summaryItem}>
                <Text numberOfLines={2} style={styles.summaryName}>{item.producto.nombre}</Text>
                <Text style={[
                  sharedStyles.muted,
                  typeof item.producto.stock === 'number' && item.cantidad > item.producto.stock && styles.stockError,
                ]}>
                  {item.cantidad} unidad(es) · ${Number(item.producto.precio).toFixed(2)} c/u
                  {typeof item.producto.stock === 'number' ? ` · ${item.producto.stock} disponibles` : ''}
                </Text>
              </View>
              <Text style={styles.summaryPrice}>${(Number(item.producto.precio) * item.cantidad).toFixed(2)}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={sharedStyles.rowBetween}><Text style={styles.summaryMeta}>{totalItems} productos</Text><Text style={styles.summaryMeta}>${total.toFixed(2)}</Text></View>
          <View style={sharedStyles.rowBetween}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>${total.toFixed(2)}</Text></View>
          <Text style={styles.secureText}>Transacción segura dentro de Mi Despensa Market</Text>
        </Card>
      </ScrollView>
      <View style={styles.payBar}>
        <View>
          <Text style={styles.payBarLabel}>Total a pagar</Text>
          <Text style={styles.payBarTotal}>${total.toFixed(2)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={paying || !cart.items.length || Boolean(invalidCartItems.length)}
          onPress={pay}
          style={({ pressed }) => [
            styles.payButton,
            (pressed || paying || !cart.items.length || Boolean(invalidCartItems.length)) && styles.payButtonDisabled,
          ]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.white} />
          <Text style={styles.payButtonText}>{paying ? 'Procesando...' : paymentMethod === 'cash' ? 'Generar QR' : 'Confirmar pago'}</Text>
        </Pressable>
      </View>
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
          {order.estado === 'pendiente' && order.pago?.metodo === 'efectivo' && order.pago.qr_codigo ? (
            <PrimaryButton label="Ver QR de pago" icon="qr-code-outline" onPress={() => setQrOrder(order)} />
          ) : null}
        </Card>
      ))}
    </ScrollView>
    {qrOrder ? (
      <View style={styles.qrOverlay}>
        <Pressable style={styles.qrBackdrop} onPress={() => setQrOrder(null)} />
        <Card style={styles.qrModal}>
          <View style={sharedStyles.rowBetween}>
            <View>
              <Text style={styles.qrModalEyebrow}>Pago pendiente</Text>
              <Text style={styles.qrModalTitle}>#{qrOrder.id.slice(-6).toUpperCase()}</Text>
            </View>
            <Pressable onPress={() => setQrOrder(null)} style={styles.qrClose}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <QrPreview value={qrOrder.pago?.qr_codigo || qrOrder.id} />
          <Text style={styles.cashTitle}>Muestra este QR en caja</Text>
          <Text style={styles.cashCopy}>El pago sigue pendiente hasta que el administrador confirme el cobro.</Text>
          <View style={styles.qrCodeBox}>
            <Text selectable style={styles.qrCodeText}>{qrOrder.pago?.qr_codigo}</Text>
          </View>
          <View style={sharedStyles.rowBetween}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.orderTotal}>${Number(qrOrder.total).toFixed(2)}</Text>
          </View>
        </Card>
      </View>
    ) : null}
    <Toast message={toast} onDone={() => setToast('')} />
    </View>
  );
}

const addressLabels: Record<keyof AddressForm, string> = { calle: 'Calle', numero: 'Número', colonia: 'Colonia', ciudad: 'Ciudad', estado: 'Estado', codigo_postal: 'Código postal', referencias: 'Referencias (opcional)' };
const addressPlaceholders: Record<keyof AddressForm, string> = { calle: 'Ej. Avenida Juárez', numero: 'Interior / exterior', colonia: 'Ej. Centro', ciudad: 'Ciudad de México', estado: 'CDMX', codigo_postal: '00000', referencias: 'Portón azul, junto a la tienda...' };
const statusLabels = { pendiente: 'Pendiente', pagado: 'Pagado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };
const statusStyles = StyleSheet.create({ pendiente: { color: colors.terracotta, backgroundColor: '#fff0d8' }, pagado: { color: colors.navy, backgroundColor: '#e7ecf5' }, enviado: { color: colors.terracotta, backgroundColor: '#fbe4da' }, entregado: { color: colors.success, backgroundColor: colors.successSoft }, cancelado: { color: colors.error, backgroundColor: colors.errorSoft } });

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatCardPreview(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits ? digits.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••';
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function cardBrand(number: string) {
  const digits = number.replace(/\D/g, '');
  const firstFour = Number(digits.slice(0, 4));
  if (digits.startsWith('4')) return 'visa';
  if (digits.startsWith('5') || (firstFour >= 2221 && firstFour <= 2720)) return 'mastercard';
  return 'unknown';
}

function CardBrand({ number }: { number: string }) {
  const brand = cardBrand(number);

  if (brand === 'visa') {
    return (
      <View style={styles.visaLogo}>
        <Text style={styles.visaText}>VISA</Text>
      </View>
    );
  }

  if (brand === 'mastercard') {
    return (
      <View style={styles.mastercardLogo}>
        <View style={[styles.mastercardCircle, styles.mastercardRed]} />
        <View style={[styles.mastercardCircle, styles.mastercardOrange]} />
      </View>
    );
  }

  return <Ionicons name="wifi-outline" size={28} color="rgba(255,255,255,0.78)" />;
}

function QrPreview({ value }: { value: string }) {
  const bits = Array.from({ length: 49 }).map((_, index) => {
    const charCode = value.charCodeAt(index % value.length) || 0;
    return (charCode + index * 7) % 3 !== 0;
  });

  return (
    <View style={styles.qrBox}>
      <View style={styles.qrGrid}>
        {bits.map((active, index) => (
          <View key={index} style={[styles.qrDot, active && styles.qrDotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  checkoutContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 210, gap: 16 },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  backText: { color: colors.primaryDark, fontFamily: fonts.bodyMedium, fontSize: 14 },
  sectionCard: { gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  sectionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  addressCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addressInfo: { flex: 1, gap: 4 },
  addressTitle: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 14 },
  newAddressToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  newAddressText: { color: colors.primary, fontFamily: fonts.headingMedium, fontSize: 14 },
  field: { gap: 7 },
  references: { minHeight: 86, paddingTop: 14, textAlignVertical: 'top' },
  paymentTabs: { flexDirection: 'row', gap: 10 },
  paymentTab: { flex: 1, minHeight: 70, borderWidth: 1, borderColor: colors.line, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surfaceSoft },
  paymentTabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  paymentTabText: { color: colors.primaryDark, fontFamily: fonts.headingMedium, fontSize: 13 },
  paymentTabTextActive: { color: colors.white },
  cardPayment: { gap: 12 },
  cardPreview: { minHeight: 184, borderRadius: 22, padding: 20, justifyContent: 'space-between', backgroundColor: colors.primary, shadowColor: colors.primaryDark, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 22, elevation: 5 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardChip: { width: 48, height: 34, borderRadius: 8, backgroundColor: '#dfc66b' },
  visaLogo: { minWidth: 74, minHeight: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25479a' },
  visaText: { color: colors.white, fontFamily: fonts.heading, fontSize: 22, fontStyle: 'italic', letterSpacing: 1 },
  mastercardLogo: { width: 72, height: 38, alignItems: 'center', justifyContent: 'center' },
  mastercardCircle: { position: 'absolute', width: 38, height: 38, borderRadius: 19 },
  mastercardRed: { left: 6, backgroundColor: '#eb001b', opacity: 0.95 },
  mastercardOrange: { right: 6, backgroundColor: '#f79e1b', opacity: 0.9 },
  cardNumber: { color: colors.white, fontFamily: fonts.headingMedium, fontSize: 20, letterSpacing: 2 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  cardMeta: { flex: 1 },
  cardMetaRight: { alignItems: 'flex-end' },
  cardMetaLabel: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardMetaValue: { color: colors.white, fontFamily: fonts.bodyMedium, fontSize: 13, textTransform: 'uppercase' },
  paymentFieldsRow: { flexDirection: 'row', gap: 10 },
  paymentHalfInput: { flex: 1 },
  cashPayment: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  qrBox: { width: 136, height: 136, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.primarySoft, backgroundColor: colors.surface },
  qrGrid: { width: 98, height: 98, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  qrDot: { width: 10, height: 10, borderRadius: 2, backgroundColor: colors.surfaceSoft },
  qrDotActive: { backgroundColor: colors.primary },
  cashTitle: { color: colors.primary, fontFamily: fonts.headingMedium, fontSize: 20 },
  cashCopy: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  summaryCard: { gap: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryImageWrap: { width: 58, height: 58, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.surfaceSoft },
  summaryImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  summaryItem: { flex: 1, gap: 2 },
  summaryName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  summaryPrice: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 14 },
  stockError: { color: colors.error, fontFamily: fonts.bodyMedium },
  divider: { height: 1, backgroundColor: colors.line },
  summaryMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  totalLabel: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 19 },
  total: { color: colors.primary, fontFamily: fonts.heading, fontSize: 25 },
  secureText: { color: colors.muted, fontFamily: fonts.body, fontSize: 10, textAlign: 'center' },
  payBar: { position: 'absolute', left: 12, right: 12, bottom: 86, zIndex: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 12, backgroundColor: colors.surface, shadowColor: colors.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.13, shadowRadius: 18, elevation: 8 },
  payBarLabel: { color: colors.muted, fontFamily: fonts.label, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  payBarTotal: { color: colors.primary, fontFamily: fonts.heading, fontSize: 23 },
  payButton: { flex: 1, minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: colors.white, fontFamily: fonts.headingMedium, fontSize: 15 },
  orderId: { color: colors.primary, fontFamily: fonts.heading, fontSize: 17 },
  status: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontFamily: fonts.label, fontSize: 10, textTransform: 'uppercase' },
  orderTotal: { color: colors.primary, fontFamily: fonts.heading, fontSize: 20 },
  qrOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 30, alignItems: 'center', justifyContent: 'center', padding: 20 },
  qrBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(27,28,28,0.35)' },
  qrModal: { width: '100%', maxWidth: 380, alignItems: 'center', gap: 14 },
  qrClose: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  qrModalEyebrow: { color: colors.terracotta, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
  qrModalTitle: { color: colors.primary, fontFamily: fonts.heading, fontSize: 24 },
  qrCodeBox: { alignSelf: 'stretch', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, backgroundColor: colors.surfaceSoft },
  qrCodeText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
