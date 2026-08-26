import { describe, it, expect } from 'vitest';
import { validateCreateMaster, validateCreateField, validateCreateValue } from '../validation/index';
import { FieldDataType } from '../types/entities';

describe('validateCreateMaster', () => {
  it('passes with valid input', () => {
    expect(() => validateCreateMaster({ code: 'COLOR', name: 'Color' })).not.toThrow();
  });

  it('passes with long UPPER_SNAKE_CASE code', () => {
    expect(() => validateCreateMaster({ code: 'PAYMENT_METHOD', name: 'Payment Method' })).not.toThrow();
  });

  it('rejects empty code', () => {
    expect(() => validateCreateMaster({ code: '', name: 'Color' })).toThrow('Validation failed');
  });

  it('rejects lowercase code', () => {
    expect(() => validateCreateMaster({ code: 'color', name: 'Color' })).toThrow('Validation failed');
  });

  it('rejects code starting with number', () => {
    expect(() => validateCreateMaster({ code: '1COLOR', name: 'Color' })).toThrow('Validation failed');
  });

  it('rejects too short code', () => {
    expect(() => validateCreateMaster({ code: 'AB', name: 'Color' })).toThrow('Validation failed');
  });

  it('rejects empty name', () => {
    expect(() => validateCreateMaster({ code: 'COLOR', name: '' })).toThrow('Validation failed');
  });

  it('rejects description over 1000 chars', () => {
    expect(() => validateCreateMaster({ code: 'COLOR', name: 'Color', description: 'x'.repeat(1001) })).toThrow('Validation failed');
  });
});

describe('validateCreateField', () => {
  it('passes with valid input', () => {
    expect(() => validateCreateField({ code: 'requires_ref', name: 'Requires Ref', dataType: FieldDataType.BOOLEAN })).not.toThrow();
  });

  it('rejects UPPER_CASE field code', () => {
    expect(() => validateCreateField({ code: 'REQUIRES_REF', name: 'Req', dataType: FieldDataType.STRING })).toThrow('Validation failed');
  });

  it('rejects invalid data type', () => {
    expect(() => validateCreateField({ code: 'field', name: 'Field', dataType: 'invalid' as never })).toThrow('Invalid data type');
  });

  it('rejects reference field without referenceMaster', () => {
    expect(() => validateCreateField({ code: 'country', name: 'Country', dataType: FieldDataType.REFERENCE })).toThrow('config.referenceMaster');
  });

  it('passes reference field with referenceMaster', () => {
    expect(() => validateCreateField({
      code: 'country',
      name: 'Country',
      dataType: FieldDataType.REFERENCE,
      config: { referenceMaster: 'COUNTRY' },
    })).not.toThrow();
  });
});

describe('validateCreateValue', () => {
  it('passes with valid input', () => {
    expect(() => validateCreateValue({ code: 'RED', label: 'Red' })).not.toThrow();
  });

  it('rejects empty code', () => {
    expect(() => validateCreateValue({ code: '', label: 'Red' })).toThrow('Validation failed');
  });

  it('rejects empty label', () => {
    expect(() => validateCreateValue({ code: 'RED', label: '' })).toThrow('Validation failed');
  });
});
