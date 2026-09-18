import type { Occurrence, OccurrenceProduct } from '../types';

function cleanProduct(item: Partial<OccurrenceProduct> | null | undefined): OccurrenceProduct | null {
  const product = String(item?.product || '').replace(/\s+/g, ' ').trim();
  if (!product) return null;
  const quantity = Math.max(1, Math.trunc(Number(item?.quantity) || 1));
  return { product, quantity };
}

export function normalizeOccurrenceProducts(
  products: OccurrenceProduct[] | undefined,
  fallbackProduct = '',
  fallbackQuantity = 1,
) {
  const normalized = Array.isArray(products)
    ? products.map(cleanProduct).filter((item): item is OccurrenceProduct => item !== null)
    : [];
  if (normalized.length) return normalized;
  const fallback = cleanProduct({ product: fallbackProduct, quantity: fallbackQuantity });
  return fallback ? [fallback] : [];
}

export function occurrenceProducts(item: Pick<Occurrence, 'products' | 'product' | 'quantity'>) {
  return normalizeOccurrenceProducts(item.products, item.product, item.quantity);
}

export function occurrenceProductsLabel(item: Pick<Occurrence, 'products' | 'product' | 'quantity'>) {
  return occurrenceProducts(item).map((entry) => `${entry.product} ×${entry.quantity}`).join(' · ');
}

export function occurrenceTotalQuantity(item: Pick<Occurrence, 'products' | 'product' | 'quantity'>) {
  return occurrenceProducts(item).reduce((total, entry) => total + entry.quantity, 0);
}
