import type { IWorkerRegistry, JobHandler } from '@mawsoftwares/sdk';

export class WorkerRegistry implements IWorkerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register<TData, TResult>(type: string, handler: JobHandler<TData, TResult>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  resolve(type: string): JobHandler | undefined {
    return this.handlers.get(type);
  }

  types(): readonly string[] {
    return Array.from(this.handlers.keys());
  }
}
