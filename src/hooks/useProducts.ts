import { useState, useEffect } from 'react';
import { Product } from '@/types/order';
import { defaultProducts } from '@/data/products';

const STORAGE_KEY = 'smartklimat-products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultProducts;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const toggleActive = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const resetToDefaults = () => {
    setProducts(defaultProducts);
  };

  return { products, updateProduct, addProduct, toggleActive, resetToDefaults };
}
