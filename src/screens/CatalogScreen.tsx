import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../api';
import { Card, EmptyState, Feedback, PrimaryButton, ScreenHeader, sharedStyles } from '../components';
import { colors, fonts, shadow } from '../theme';
import type { Category, Product, Review } from '../types';

export function CatalogScreen({
  isUser,
  onRequireLogin,
  onCartChanged,
  onOpenCart,
  cartCount,
}: {
  isUser: boolean;
  onRequireLogin: () => void;
  onCartChanged: () => void;
  onOpenCart: () => void;
  cartCount: number;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const cartScale = useRef(new Animated.Value(1)).current;

  const visibleProducts = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('es');
    return products.filter((product) => {
      const inCategory = selectedCategory === 'Todos' || product.categoria_nombre === selectedCategory;
      const matches = !search || `${product.nombre} ${product.descripcion} ${product.categoria_nombre}`.toLocaleLowerCase('es').includes(search);
      return product.disponible && inCategory && matches;
    });
  }, [products, query, selectedCategory]);

  async function loadData() {
    setError('');
    try {
      const [productData, categoryData] = await Promise.all([
        api.get<Product[]>('/productos/'),
        api.get<Category[]>('/categorias/'),
      ]);
      setProducts(productData);
      setCategories(categoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function addToCart(productId: string) {
    if (!isUser) {
      onRequireLogin();
      return;
    }
    setError('');
    setMessage('');
    try {
      await api.post('/carrito/agregar/', { producto_id: productId, cantidad: 1 });
      setMessage('Producto agregado a tu carrito.');
      onCartChanged();
      Animated.sequence([
        Animated.spring(cartScale, { toValue: 1.22, useNativeDriver: true }),
        Animated.spring(cartScale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el producto.');
    }
  }

  useEffect(() => { loadData(); }, []);

  if (selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        isUser={isUser}
        onBack={() => setSelectedProduct(null)}
        onRequireLogin={onRequireLogin}
        onAdd={() => addToCart(selectedProduct.id)}
      />
    );
  }

  return (
    <View style={sharedStyles.screen}>
      <ScrollView
        contentContainerStyle={sharedStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
        <ScreenHeader
          title="Compra fácil para tu despensa"
          copy="Explora productos de abarrotes, limpieza, bebidas y más."
        />

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar producto o categoría"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {['Todos', ...categories.map((category) => category.nombre)].map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[styles.chip, selectedCategory === category && styles.chipActive]}>
              <Text style={[styles.chipText, selectedCategory === category && styles.chipTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Feedback message={error} />
        <Feedback message={message} kind="success" />
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}

        {!loading && !visibleProducts.length ? (
          <EmptyState icon="search-outline" title="No encontramos productos" copy="Prueba con otra búsqueda o categoría." />
        ) : null}

        <View style={styles.grid}>
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isUser={isUser}
              onOpen={() => setSelectedProduct(product)}
              onAdd={() => addToCart(product.id)}
            />
          ))}
        </View>
      </ScrollView>

      {isUser && cartCount > 0 ? (
        <Animated.View style={[styles.floatingCartWrap, { transform: [{ scale: cartScale }] }]}>
          <Pressable onPress={onOpenCart} style={styles.floatingCart} accessibilityLabel={`Abrir carrito con ${cartCount} productos`}>
            <Ionicons name="cart-outline" size={26} color={colors.white} />
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function ProductCard({ product, isUser, onOpen, onAdd }: { product: Product; isUser: boolean; onOpen: () => void; onAdd: () => void }) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}>
      <View style={styles.imageArea}>
        {product.imagen_url ? <Image source={{ uri: product.imagen_url }} style={styles.productImage} /> : <Ionicons name="image-outline" size={34} color={colors.muted} />}
      </View>
      <View style={styles.productBody}>
        <Text numberOfLines={1} style={styles.categoryLabel}>{product.categoria_nombre}</Text>
        <Text numberOfLines={2} style={styles.productName}>{product.nombre}</Text>
        <Text numberOfLines={2} style={styles.productDescription}>{product.descripcion}</Text>
        <View style={sharedStyles.rowBetween}>
          <Text style={styles.price}>${Number(product.precio).toFixed(2)}</Text>
          <Text style={[styles.stock, product.stock <= 5 && styles.lowStock]}>{product.stock > 0 ? `${product.stock} ud.` : 'Agotado'}</Text>
        </View>
        <Pressable onPress={(event) => { event.stopPropagation(); onAdd(); }} style={[styles.addButton, !isUser && styles.addButtonGuest]}>
          <Text style={[styles.addButtonText, !isUser && styles.addButtonTextGuest]}>{isUser ? 'Agregar' : 'Inicia sesión'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function ProductDetail({
  product,
  isUser,
  onBack,
  onRequireLogin,
  onAdd,
}: {
  product: Product;
  isUser: boolean;
  onBack: () => void;
  onRequireLogin: () => void;
  onAdd: () => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.calificacion, 0) / reviews.length : 0;

  async function loadReviews() {
    try {
      setReviews(await api.get<Review[]>(`/productos/${product.id}/resenas/`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reseñas.');
    }
  }

  async function submitReview() {
    setError('');
    setMessage('');
    if (!comment.trim()) {
      setError('Escribe un comentario para publicar tu reseña.');
      return;
    }
    try {
      await api.post('/resenas/', { producto_id: product.id, calificacion: rating, comentario: comment.trim() });
      setComment('');
      setMessage('Tu reseña fue publicada.');
      loadReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar la reseña.');
    }
  }

  useEffect(() => { loadReviews(); }, [product.id, isUser]);

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={22} color={colors.primaryDark} />
        <Text style={styles.backText}>Catálogo</Text>
      </Pressable>

      <View style={styles.detailImageArea}>
        {product.imagen_url ? <Image source={{ uri: product.imagen_url }} style={styles.detailImage} /> : null}
      </View>
      <Text style={styles.categoryLabel}>{product.categoria_nombre}</Text>
      <View style={sharedStyles.rowBetween}>
        <Text style={styles.detailName}>{product.nombre}</Text>
        <Text style={styles.detailPrice}>${Number(product.precio).toFixed(2)}</Text>
      </View>
      <View style={styles.ratingRow}>
        <Text style={styles.stock}>{product.stock > 0 ? 'En stock' : 'Agotado'}</Text>
        {reviews.length ? <Text style={styles.ratingText}>★ {average.toFixed(1)} ({reviews.length} reseñas)</Text> : null}
      </View>
      <Text style={sharedStyles.body}>{product.descripcion}</Text>
      <PrimaryButton
        label={isUser ? 'Agregar al carrito' : 'Inicia sesión para comprar'}
        icon="cart-outline"
        onPress={isUser ? onAdd : onRequireLogin}
        disabled={!product.stock}
      />

      <View style={styles.divider} />
      <Text style={sharedStyles.sectionTitle}>Reseñas</Text>
      <Feedback message={error} />
      <Feedback message={message} kind="success" />

      {!isUser ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Inicia sesión para escribir reseñas"
          copy="Puedes leer opiniones como invitado. Para publicar una reseña necesitas una cuenta y haber comprado el producto."
          action={<PrimaryButton label="Iniciar sesión" onPress={onRequireLogin} variant="secondary" />}
        />
      ) : (
        <>
          <Card>
            <Text style={styles.reviewPrompt}>Tu opinión importa</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setRating(value)}>
                  <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={26} color={colors.terracotta} />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Comparte tu experiencia con este producto"
              placeholderTextColor={colors.muted}
              multiline
              style={[sharedStyles.input, styles.reviewInput]}
            />
            <PrimaryButton label="Publicar reseña" onPress={submitReview} />
          </Card>
          {!reviews.length ? <Text style={sharedStyles.muted}>Este producto todavía no tiene reseñas.</Text> : null}
        </>
      )}

      {reviews.map((review) => (
        <Card key={review.id}>
          <View style={sharedStyles.rowBetween}>
            <Text style={styles.reviewer}>{review.usuario_nombre}</Text>
            <Text style={sharedStyles.muted}>{new Date(review.creado_en).toLocaleDateString('es-MX')}</Text>
          </View>
          <Text style={styles.reviewStars}>{'★'.repeat(review.calificacion)}{'☆'.repeat(5 - review.calificacion)}</Text>
          <Text style={sharedStyles.body}>{review.comentario}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 27, backgroundColor: colors.surface },
  searchInput: { flex: 1, minHeight: 52, color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  chips: { gap: 10, paddingRight: 20 },
  chip: { minHeight: 40, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.surfaceStrong },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13 },
  chipTextActive: { color: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '48%', overflow: 'hidden', borderRadius: 16, backgroundColor: colors.surface, ...shadow },
  pressed: { opacity: 0.76 },
  imageArea: { height: 128, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft },
  productImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  productBody: { minHeight: 205, padding: 12, gap: 7 },
  categoryLabel: { color: colors.navy, fontFamily: fonts.label, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  productName: { minHeight: 40, color: colors.text, fontFamily: fonts.headingMedium, fontSize: 15, lineHeight: 20 },
  productDescription: { minHeight: 36, color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
  price: { color: colors.primary, fontFamily: fonts.heading, fontSize: 17 },
  stock: { alignSelf: 'flex-start', color: colors.success, fontFamily: fonts.bodyMedium, fontSize: 10, backgroundColor: colors.successSoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  lowStock: { color: colors.terracotta, backgroundColor: '#fbe4da' },
  addButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.primary },
  addButtonGuest: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  addButtonText: { color: colors.white, fontFamily: fonts.label, fontSize: 12 },
  addButtonTextGuest: { color: colors.primaryDark },
  floatingCartWrap: { position: 'absolute', right: 20, bottom: 92 },
  floatingCart: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, ...shadow },
  cartBadge: { position: 'absolute', right: -3, top: -3, minWidth: 21, height: 21, paddingHorizontal: 4, borderWidth: 2, borderColor: colors.background, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  cartBadgeText: { color: colors.white, fontFamily: fonts.label, fontSize: 10 },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  backText: { color: colors.primaryDark, fontFamily: fonts.bodyMedium, fontSize: 14 },
  detailImageArea: { height: 330, overflow: 'hidden', borderRadius: 18, backgroundColor: colors.surfaceSoft },
  detailImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  detailName: { flex: 1, color: colors.text, fontFamily: fonts.heading, fontSize: 25, lineHeight: 31 },
  detailPrice: { color: colors.primary, fontFamily: fonts.heading, fontSize: 23 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingText: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 5 },
  reviewPrompt: { color: colors.primary, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  stars: { flexDirection: 'row', gap: 4 },
  reviewInput: { minHeight: 94, paddingTop: 13, textAlignVertical: 'top' },
  reviewer: { color: colors.text, fontFamily: fonts.headingMedium, fontSize: 14 },
  reviewStars: { color: colors.terracotta, fontSize: 17, letterSpacing: 2 },
});
