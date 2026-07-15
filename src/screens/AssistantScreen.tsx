import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../api';
import { Card, Feedback, PrimaryButton, ScreenHeader, sharedStyles } from '../components';
import { colors, fonts } from '../theme';
import type { AssistantResponse } from '../types';

const suggestions = ['Algo para tomar', 'Limpiar ropa', 'Botanas', 'Desayuno'];

export function AssistantScreen({ isUser, onRequireLogin, onCartChanged }: { isUser: boolean; onRequireLogin: () => void; onCartChanged: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function ask(value = prompt) {
    if (!value.trim()) {
      setError('Cuéntanos qué producto necesitas.');
      return;
    }
    setPrompt(value);
    setLoading(true);
    setError('');
    setMessage('');
    setResult(null);
    try {
      setResult(await api.post<AssistantResponse>('/ia/asistente/', { mensaje: value.trim(), limite: 5 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el asistente.');
    } finally {
      setLoading(false);
    }
  }

  async function addToCart(productId: string) {
    if (!isUser) {
      onRequireLogin();
      return;
    }
    setError('');
    try {
      await api.post('/carrito/agregar/', { producto_id: productId, cantidad: 1 });
      setMessage('Producto agregado a tu carrito.');
      onCartChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el producto.');
    }
  }

  return (
    <ScrollView style={sharedStyles.screen} contentContainerStyle={sharedStyles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="¿Cómo te ayudo hoy?" copy="Dinos qué necesitas y te sugerimos productos disponibles." eyebrow="Asistente de compras" />

      <Card>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ej. quiero algo para limpiar ropa blanca"
          placeholderTextColor={colors.muted}
          multiline
          style={[sharedStyles.input, styles.prompt]}
        />
        <PrimaryButton label={loading ? 'Buscando...' : 'Buscar recomendación'} icon="sparkles-outline" onPress={() => ask()} disabled={loading} />
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
        {suggestions.map((suggestion) => (
          <Pressable key={suggestion} onPress={() => ask(suggestion)} style={styles.suggestionChip}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}
      <Feedback message={error} />
      <Feedback message={message} kind="success" />

      {result ? (
        <Card>
          <View style={styles.smartLabel}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            <Text style={styles.smartLabelText}>Recomendación inteligente</Text>
          </View>
          <Text style={sharedStyles.body}>{result.respuesta}</Text>
          {result.ia_error ? <Text style={styles.fallback}>Usamos la búsqueda del catálogo porque la IA no estuvo disponible.</Text> : null}
        </Card>
      ) : null}

      <View style={styles.grid}>
        {result?.productos.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.imageArea}>
              {product.imagen_url ? <Image source={{ uri: product.imagen_url }} style={styles.image} /> : null}
            </View>
            <View style={styles.productBody}>
              <Text numberOfLines={1} style={styles.category}>{product.categoria_nombre}</Text>
              <Text numberOfLines={2} style={styles.name}>{product.nombre}</Text>
              <Text style={styles.price}>${Number(product.precio).toFixed(2)}</Text>
              <Pressable onPress={() => addToCart(product.id)} style={[styles.addButton, !isUser && styles.addButtonGuest]}>
                <Text style={[styles.addText, !isUser && styles.addTextGuest]}>{isUser ? 'Agregar' : 'Inicia sesión'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  prompt: { minHeight: 116, paddingTop: 14, textAlignVertical: 'top' },
  suggestions: { gap: 10, paddingRight: 20 },
  suggestionChip: { minHeight: 42, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 21, backgroundColor: colors.primarySoft },
  suggestionText: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 13 },
  smartLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smartLabelText: { color: colors.primary, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  fallback: { color: colors.terracotta, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 17 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { width: '48%', overflow: 'hidden', borderRadius: 16, backgroundColor: colors.surface },
  imageArea: { height: 125, backgroundColor: colors.surfaceSoft },
  image: { width: '100%', height: '100%', resizeMode: 'contain' },
  productBody: { padding: 12, gap: 8 },
  category: { color: colors.navy, fontFamily: fonts.label, fontSize: 9, textTransform: 'uppercase' },
  name: { minHeight: 42, color: colors.text, fontFamily: fonts.headingMedium, fontSize: 15, lineHeight: 20 },
  price: { color: colors.primary, fontFamily: fonts.heading, fontSize: 17 },
  addButton: { minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.primary },
  addButtonGuest: { borderWidth: 1, borderColor: colors.navy, backgroundColor: colors.surface },
  addText: { color: colors.white, fontFamily: fonts.label, fontSize: 11 },
  addTextGuest: { color: colors.navy },
});
