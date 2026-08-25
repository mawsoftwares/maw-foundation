import type { ComputedColumnDefinition, ComputedColumnExpression } from '../definition/types';
import { ReportValidationError } from '../errors';

export function resolveComputedColumns(
  rows: readonly Record<string, unknown>[],
  computedColumns: readonly ComputedColumnDefinition[],
): readonly Record<string, unknown>[] {
  if (computedColumns.length === 0) {
    return rows;
  }
  return rows.map((row) => {
    const enriched = { ...row };
    for (const col of computedColumns) {
      enriched[col.field] = evaluateExpression(col.expression, enriched);
    }
    return enriched;
  });
}

function evaluateExpression(
  expr: ComputedColumnExpression,
  row: Record<string, unknown>,
): number {
  const left = resolveOperand(expr.left, row);
  const right = resolveOperand(expr.right, row);

  switch (expr.op) {
    case 'add':
      return left + right;
    case 'subtract':
      return left - right;
    case 'multiply':
      return left * right;
    case 'divide':
      if (right === 0) return 0;
      return left / right;
    case 'modulo':
      if (right === 0) return 0;
      return left % right;
    default:
      throw new ReportValidationError(`Unknown computed column operator: ${expr.op as string}`);
  }
}

function resolveOperand(
  operand: string | ComputedColumnExpression,
  row: Record<string, unknown>,
): number {
  if (typeof operand === 'string') {
    const val = row[operand];
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }
  return evaluateExpression(operand, row);
}
