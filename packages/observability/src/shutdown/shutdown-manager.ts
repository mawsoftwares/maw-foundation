import type { Logger } from '@mawsoftwares/sdk/kernel/logger';

export interface ShutdownHook {
  name: string;
  fn: () => Promise<void> | void;
  order?: number;
}

export class ShutdownManager {
  private readonly hooks: ShutdownHook[] = [];
  private readonly logger: Logger;
  private readonly hookTimeoutMs: number;
  private shutdownInProgress = false;
  private signalCount = 0;

  constructor(logger: Logger, hookTimeoutMs = 10_000) {
    this.logger = logger;
    this.hookTimeoutMs = hookTimeoutMs;
  }

  register(hook: ShutdownHook): void {
    this.hooks.push(hook);
  }

  async shutdown(reason?: string): Promise<void> {
    if (this.shutdownInProgress) return;
    this.shutdownInProgress = true;

    this.logger.info('Shutdown initiated', { reason });

    const sorted = [...this.hooks].sort(
      (a, b) => (a.order ?? 100) - (b.order ?? 100),
    );

    for (const hook of sorted) {
      try {
        await Promise.race([
          Promise.resolve(hook.fn()),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Hook "${hook.name}" timed out after ${this.hookTimeoutMs}ms`)),
              this.hookTimeoutMs,
            ),
          ),
        ]);
        this.logger.info(`Shutdown hook completed: ${hook.name}`);
      } catch (err) {
        this.logger.error(`Shutdown hook failed: ${hook.name}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.logger.info('Shutdown complete');
  }

  listen(signals: string[] = ['SIGTERM', 'SIGINT']): void {
    for (const signal of signals) {
      process.on(signal, () => {
        this.signalCount++;
        if (this.signalCount > 1) {
          this.logger.warn('Forced exit on repeated signal');
          process.exit(1);
        }
        void this.shutdown(signal);
      });
    }
  }
}
