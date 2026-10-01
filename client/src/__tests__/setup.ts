import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom in this project does not expose a Storage implementation, so any
// component reading localStorage (ThemeContext, Sidebar avatar fetch) throws
// while mounting. Provide a minimal in-memory stand-in.
class MemoryStorage {
  #store = new Map();

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null;
  }

  setItem(key, value) {
    this.#store.set(key, String(value));
  }

  removeItem(key) {
    this.#store.delete(key);
  }

  clear() {
    this.#store.clear();
  }

  key(index) {
    return Array.from(this.#store.keys())[index] ?? null;
  }

  get length() {
    return this.#store.size;
  }
}

if (typeof globalThis.localStorage === 'undefined'
  || typeof globalThis.localStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof globalThis.sessionStorage === 'undefined'
  || typeof globalThis.sessionStorage.getItem !== 'function') {
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

if (typeof globalThis.URL.createObjectURL !== 'function') {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
}

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});
