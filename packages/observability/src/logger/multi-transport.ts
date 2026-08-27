import type { LogTransport, LogEntry } from '@mawsoftwares/sdk/kernel/logger';

export function createMultiTransport(transports: LogTransport[]): LogTransport {
  return {
    write(entry: LogEntry): void {
      for (const transport of transports) {
        try {
          transport.write(entry);
        } catch (err) {
          process.stderr.write(
            `[observability] transport write failed: ${err instanceof Error ? err.message : String(err)}\n`,
          );
        }
      }
    },
  };
}
