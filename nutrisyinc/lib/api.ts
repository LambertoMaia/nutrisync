import { mockCooks } from '@/data/mocks/cooks';
import { mockPedidos } from '@/data/mocks/pedidos';
import type { Cook, Pedido } from '@/types/models';

/**
 * API-shaped helpers returning mock data for now.
 * Swap implementations for real `fetch` + auth headers when the backend is ready.
 */

function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchCooks(): Promise<Cook[]> {
  return delay(80, [...mockCooks]);
}

export async function fetchPedidos(): Promise<Pedido[]> {
  return delay(80, [...mockPedidos]);
}
