/**
 * API Client - Base HTTP client for backend communication
 * 
 * Currently uses storage utility, can be swapped for real API calls
 */

import { storage } from '../../utils/storage';

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export interface ApiClient {
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, data: unknown): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string): Promise<ApiResponse<T>>;
}

// Mock API client using storage utility
export const createMockApiClient = (): ApiClient => ({
  get: async <T>(endpoint: string): Promise<ApiResponse<T>> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    const key = `pharma_${endpoint.replace(/^\//, '').replace(/\//g, '_')}`;
    const data = storage.get<T>(key, [] as unknown as T);
    return {
      data: data,
      status: 200
    };
  },

  post: async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const key = `pharma_${endpoint.replace(/^\//, '').replace(/\//g, '_')}`;
    const items = storage.get<any[]>(key, []);
    const newItem = { ...(data as object), id: Date.now().toString() };
    items.push(newItem);
    storage.set(key, items);
    return { data: newItem as T, status: 201 };
  },

  put: async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const [resource, id] = endpoint.replace(/^\//, '').split('/');
    const key = `pharma_${resource}`;
    const items = storage.get<any[]>(key, []);
    const index = items.findIndex((item: { id: string }) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...(data as object) };
      storage.set(key, items);
      return { data: items[index] as T, status: 200 };
    }
    throw { status: 404, message: 'Not found' } as ApiError;
  },

  patch: async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    // Same as put for mock
    await new Promise(resolve => setTimeout(resolve, 50));
    const [resource, id] = endpoint.replace(/^\//, '').split('/');
    const key = `pharma_${resource}`;
    const items = storage.get<any[]>(key, []);
    const index = items.findIndex((item: { id: string }) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...(data as object) };
      storage.set(key, items);
      return { data: items[index] as T, status: 200 };
    }
    throw { status: 404, message: 'Not found' } as ApiError;
  },

  delete: async <T>(endpoint: string): Promise<ApiResponse<T>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const [resource, id] = endpoint.replace(/^\//, '').split('/');
    const key = `pharma_${resource}`;
    const items = storage.get<any[]>(key, []);
    const filtered = items.filter((item: { id: string }) => item.id !== id);
    storage.set(key, filtered);
    return { data: { success: true } as unknown as T, status: 200 };
  }
});

// Real API client (for future use)
export const createRealApiClient = (config: ApiConfig): ApiClient => ({
  get: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> => {
    const url = new URL(endpoint, config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...config.headers }
    });
    const data = await response.json();
    return { data, status: response.status };
  },

  post: async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...config.headers },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return { data: result, status: response.status };
  },

  put: async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...config.headers },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return { data: result, status: response.status };
  },

  patch: async <T>(endpoint: string, data: unknown): Promise<ApiResponse<T>> => {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...config.headers },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    return { data: result, status: response.status };
  },

  delete: async <T>(endpoint: string): Promise<ApiResponse<T>> => {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...config.headers }
    });
    const result = await response.json();
    return { data: result, status: response.status };
  }
});

// Default client instance
export const apiClient = createMockApiClient();
