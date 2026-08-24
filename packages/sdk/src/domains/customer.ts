export const CustomerType = {
  individual: 'individual',
  business: 'business',
} as const;

export type CustomerTypeValue = (typeof CustomerType)[keyof typeof CustomerType];

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly type: CustomerTypeValue;
  readonly company?: string;
  readonly gstNumber?: string;
  readonly address?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface CreateCustomerInput {
  readonly name: string;
  readonly email?: string;
  readonly phone?: string;
  readonly type: CustomerTypeValue;
  readonly company?: string;
  readonly gstNumber?: string;
  readonly address?: string;
}

export function validateCustomerInput(input: CreateCustomerInput): string | undefined {
  if (!input.name || input.name.trim() === '') return 'Customer name is required';
  if (input.type === 'business' && (!input.company || input.company.trim() === '')) {
    return 'Company name is required for business customers';
  }
  return undefined;
}
