/**
 * Typed event bus for inter-module communication.
 * Modules declare events they emit; other modules subscribe without coupling.
 */

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface EventBus {
  emit<T = unknown>(event: string, payload: T): Promise<void>;
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void;
  once<T = unknown>(event: string, handler: EventHandler<T>): () => void;
  off(event: string, handler: EventHandler): void;
  clear(event?: string): void;
}

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<{ fn: EventHandler; once: boolean }>>();

  function getSet(event: string) {
    let set = handlers.get(event);
    if (!set) {
      set = new Set();
      handlers.set(event, set);
    }
    return set;
  }

  return {
    async emit<T = unknown>(event: string, payload: T) {
      const set = handlers.get(event);
      if (!set) return;
      const toRemove: { fn: EventHandler; once: boolean }[] = [];
      for (const entry of set) {
        await entry.fn(payload);
        if (entry.once) toRemove.push(entry);
      }
      for (const entry of toRemove) set.delete(entry);
    },

    on<T = unknown>(event: string, handler: EventHandler<T>) {
      const entry = { fn: handler as EventHandler, once: false };
      getSet(event).add(entry);
      return () => getSet(event).delete(entry);
    },

    once<T = unknown>(event: string, handler: EventHandler<T>) {
      const entry = { fn: handler as EventHandler, once: true };
      getSet(event).add(entry);
      return () => getSet(event).delete(entry);
    },

    off(event: string, handler: EventHandler) {
      const set = handlers.get(event);
      if (!set) return;
      for (const entry of set) {
        if (entry.fn === handler) { set.delete(entry); break; }
      }
    },

    clear(event?: string) {
      if (event) {
        handlers.delete(event);
      } else {
        handlers.clear();
      }
    },
  };
}
