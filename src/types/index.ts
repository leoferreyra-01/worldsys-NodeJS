export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  age?: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductRequest {
  name: string;
  price: number;
  description: string;
  category: string;
  inStock: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  description?: string;
  category?: string;
  inStock?: boolean;
}

export interface Order {
  id: number;
  userId: number;
  products: string; // JSON string for SQL Server compatibility
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderRequest {
  userId: string | number;
  products: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface UpdateOrderRequest {
  userId?: string | number;
  products?: Array<{
    productId: string;
    quantity: number;
  }>;
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
} 