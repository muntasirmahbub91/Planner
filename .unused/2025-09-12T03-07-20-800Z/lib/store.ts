// src/lib/store.ts
// Minimal external store using useSyncExternalStore + localStorage versioning.

import { useSyncExternalStore } from "react";
import { persist, restore } from "./persist";

type Listener<T> = (state: T) => void;

export interface Store<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (fn: Listener<T>) => () => void;
  use: () => T;
}

/**
 * Create a simple reactive store.
 * @param key storage key
 * @param version schema version
 * @param fallback default state
 * @param migrate optional migration from legacy raw payloads
 */
export function createStore<T>(opts: {
  key: string;
  version?: number;
  fallback: T;
  migrate?: (raw: any) => T;
}): Store<T> {
  let state = restore<T>({
    key: opts.key,
    version: opts.version,
    migrate: opts.migrate,
    fallback: opts.fallback
  });

  const listeners = new Set<Listener<T>>();

  function get() {
    return state;
  }

  function set(next: T) {
    state = next;
    persist(opts.key, state, opts.version);
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn: Listener<T>) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function use() {
    return useSyncExternalStore(subscribe, get);
  }

  return { get, set, subscribe, use };
}
