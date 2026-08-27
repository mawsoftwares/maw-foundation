import type { EventBus, EventHandler } from '@mawsoftwares/sdk/modules/events';

export interface EmittedEvent {
  readonly event: string;
  readonly payload: unknown;
}

export class MockEventBus implements EventBus {
  readonly emitted: EmittedEvent[] = [];
  private readonly handlers = new Map<string, Set<{ fn: EventHandler; once: boolean }>>();

  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    this.emitted.push({ event, payload });
    const set = this.handlers.get(event);
    if (!set) return;
    const toRemove: { fn: EventHandler; once: boolean }[] = [];
    for (const entry of set) {
      await entry.fn(payload);
      if (entry.once) toRemove.push(entry);
    }
    for (const entry of toRemove) set.delete(entry);
  }

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const entry = { fn: handler as EventHandler, once: false };
    this.getSet(event).add(entry);
    return () => this.getSet(event).delete(entry);
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const entry = { fn: handler as EventHandler, once: true };
    this.getSet(event).add(entry);
    return () => this.getSet(event).delete(entry);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const entry of set) {
      if (entry.fn === handler) { set.delete(entry); break; }
    }
  }

  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  assertEmitted(event: string, payloadMatcher?: (payload: unknown) => boolean): void {
    const matches = this.emitted.filter((e) => e.event === event);
    if (matches.length === 0) {
      throw new Error(`Expected event "${event}" to have been emitted but it was not.\nEmitted: ${JSON.stringify(this.emitted.map((e) => e.event))}`);
    }
    if (payloadMatcher && !matches.some((e) => payloadMatcher(e.payload))) {
      throw new Error(`Event "${event}" was emitted but no payload matched the predicate.\nPayloads: ${JSON.stringify(matches.map((e) => e.payload), null, 2)}`);
    }
  }

  assertNotEmitted(event: string): void {
    const found = this.emitted.find((e) => e.event === event);
    if (found) {
      throw new Error(`Expected event "${event}" NOT to have been emitted but it was.`);
    }
  }

  reset(): void {
    this.emitted.length = 0;
    this.handlers.clear();
  }

  private getSet(event: string): Set<{ fn: EventHandler; once: boolean }> {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    return set;
  }
}
