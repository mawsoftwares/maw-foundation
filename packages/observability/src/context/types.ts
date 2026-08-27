export interface ObservabilityContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly extra?: Record<string, unknown>;
}
