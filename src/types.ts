export type TabKey = 'home' | 'assistant' | 'cart' | 'orders' | 'account';

export type User = {
  id: string;
  nombre: string;
  correo: string;
  rol: 'usuario' | 'admin';
  activo: boolean;
};

export type AuthResponse = {
  access: string;
  refresh: string;
  usuario: User;
  rol: string;
};

export type Category = { id: string; nombre: string; descripcion: string };

export type Product = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria_id?: string;
  categoria_nombre: string;
  disponible: boolean;
  imagen_url?: string;
};

export type Review = {
  id: string;
  producto_id: string;
  producto_nombre: string;
  usuario_id: string;
  usuario_nombre: string;
  calificacion: number;
  comentario: string;
  creado_en: string;
};

export type CartItem = {
  id: string;
  producto_id: string;
  cantidad: number;
  producto: {
    nombre: string;
    descripcion: string;
    precio: number;
    imagen_url?: string;
    stock?: number;
    disponible?: boolean;
  };
};

export type CartResponse = { items: CartItem[]; total_items: number };

export type Address = {
  id: string;
  calle: string;
  numero: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  referencias: string;
};

export type Order = {
  id: string;
  items: Array<{ producto_id: string; nombre: string; cantidad: number; subtotal: number }>;
  total: number;
  estado: 'pagado' | 'enviado' | 'entregado' | 'cancelado';
  creado_en: string;
};

export type AssistantResponse = {
  respuesta: string;
  productos: Product[];
  origen: string;
  ia_error?: string;
};
