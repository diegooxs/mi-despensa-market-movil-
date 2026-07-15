import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { api } from '../api';
import { Card, EmptyState, Feedback, PrimaryButton, ScreenHeader, sharedStyles } from '../components';
import { colors, fonts } from '../theme';
import type { CartResponse, Product } from '../types';

export function CartScreen({
  isUser,
  refreshKey,
  onCartChanged,
  onCheckout,
  onRequireLogin,
  onBrowse,
}: {
  isUser: boolean;
  refreshKey: number;
  onCartChanged: () => void;
  onCheckout: () => void;
  onRequireLogin: () => void;
  onBrowse: () => void;
}) {
  const [cart, setCart] = useState<CartResponse>({ items: [], total_items: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const total = cart.items.reduce((sum, item) => sum + Number(item.producto.precio) * item.cantidad, 0);

  async function loadCart() {
    if (!isUser) return;
    setLoading(true);
    setError('');
    try {
      const [cartData, products] = await Promise.all([
        api.get<CartResponse>('/carrito/'),
        api.get<Product[]>('/productos/'),
      ]);
      const images = new Map(products.map((product) => [product.id, product.imagen_url]));
      setCart({
        ...cartData,
        items: cartData.items.map((item) => ({
          ...item,
          producto: { ...item.producto, imagen_url: images.get(item.producto_id) },
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu carrito.');
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(id: string, quantity: number) {
    if (quantity < 1) return;
    try {
      await api.patch(`/carrito/${id}/`, { cantidad: quantity });
      await loadCart();
      onCartChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cantidad.');
    }
  }

  async function removeItem(id: string) {
    try {
      await api.delete(`/carrito/${id}/`);
      await loadCart();
      onCartChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el producto.');
    }
  }

  async function clearCart() {
    try {
      await api.delete('/carrito/');
      await loadCart();
      onCartChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vaciar el carrito.');
    }
  }

  useEffect(() => { loadCart(); }, [isUser, refreshKey]);

  if (!isUser) {
    return (
      <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
        <ScreenHeader title="Tu carrito" copy="Necesitas una cuenta para guardar productos y comprar." />
        <EmptyState icon="lock-closed-outline" title="Inicia sesión para continuar" copy="Compra de forma segura y consulta el historial de tus pedidos." action={<PrimaryButton label="Iniciar sesión" onPress={onRequireLogin} />} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <View style={sharedStyles.rowBetween}>
        <ScreenHeader title="Tu carrito" copy="Revisa tus productos antes de pagar." />
        {cart.items.length ? (
          <Pressable onPress={clearCart} accessibilityLabel="Vaciar carrito" style={styles.clearButton}>
            <Ionicons name="trash-outline" size={22} color={colors.terracotta} />
          </Pressable>
        ) : null}
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Feedback message={error} />

      {!loading && !cart.items.length ? (
        <EmptyState icon="basket-outline" title="Tu carrito está vacío" copy="Explora el catálogo y agrega lo que necesitas para tu hogar." action={<PrimaryButton label="Ver productos" onPress={onBrowse} />} />
      ) : null}

      {cart.items.map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemTop}>
            <View style={styles.itemImageBox}>
              {item.producto.imagen_url ? <Image source={{ uri: item.producto.imagen_url }} style={styles.itemImage} /> : <Ionicons name="cube-outline" size={28} color={colors.muted} />}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.producto.nombre}</Text>
              <Text style={styles.itemPrice}>${Number(item.producto.precio).toFixed(2)} c/u</Text>
            </View>
            <Pressable onPress={() => removeItem(item.id)} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={21} color={colors.terracotta} />
            </Pressable>
          </View>
          <View style={styles.quantityControl}>
            <Pressable onPress={() => updateQuantity(item.id, item.cantidad - 1)} style={styles.quantityButton}><Text style={styles.quantitySymbol}>−</Text></Pressable>
            <Text style={styles.quantity}>{item.cantidad}</Text>
            <Pressable onPress={() => updateQuantity(item.id, item.cantidad + 1)} style={styles.quantityButton}><Text style={styles.quantitySymbol}>+</Text></Pressable>
            <Text style={styles.subtotal}>${(Number(item.producto.precio) * item.cantidad).toFixed(2)}</Text>
          </View>
        </Card>
      ))}

      {cart.items.length ? (
        <Card style={styles.summary}>
          <Text style={styles.summaryLabel}>Resumen de compra</Text>
          <View style={sharedStyles.rowBetween}><Text style={sharedStyles.body}>Subtotal</Text><Text style={sharedStyles.body}>${total.toFixed(2)}</Text></View>
          <View style={sharedStyles.rowBetween}><Text style={sharedStyles.body}>Envío</Text><Text style={styles.free}>Gratis</Text></View>
          <View style={styles.divider} />
          <View style={sharedStyles.rowBetween}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>${total.toFixed(2)}</Text></View>
          <PrimaryButton label="Ir a pagar" icon="arrow-forward-outline" onPress={onCheckout} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  itemCard: { gap: 14 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemImageBox: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 12, backgroundColor: colors.surfaceSoft },
  itemImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  itemInfo: { flex: 1, gap: 6 },
  itemName: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 16, lineHeight: 21 },
  itemPrice: { color: colors.primary, fontFamily: fonts.headingMedium, fontSize: 15 },
  deleteButton: { alignSelf: 'flex-start', width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantityButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.surfaceStrong },
  quantitySymbol: { color: colors.primary, fontFamily: fonts.headingMedium, fontSize: 20 },
  quantity: { minWidth: 20, color: colors.text, fontFamily: fonts.headingMedium, fontSize: 17, textAlign: 'center' },
  subtotal: { marginLeft: 'auto', color: colors.text, fontFamily: fonts.headingMedium, fontSize: 16 },
  summary: { marginTop: 8, gap: 15 },
  summaryLabel: { color: colors.text, fontFamily: fonts.label, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' },
  free: { color: colors.success, fontFamily: fonts.headingMedium, fontSize: 15 },
  divider: { height: 1, backgroundColor: colors.line },
  totalLabel: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 19 },
  total: { color: colors.primary, fontFamily: fonts.heading, fontSize: 26 },
});
