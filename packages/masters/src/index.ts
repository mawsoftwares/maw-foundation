// Types
export {
  MasterStatus, FieldDataType,
  type MasterStatusValue, type FieldDataTypeValue,
  type MasterConfig, type FieldConfig,
  type Master, type MasterField, type MasterValue, type MasterOption,
  type CreateMasterInput, type UpdateMasterInput,
  type CreateFieldInput, type UpdateFieldInput,
  type CreateValueInput, type UpdateValueInput,
  type BulkCreateValuesInput, type ReorderValuesInput,
  type MasterListQuery, type ValueListQuery,
  type OperationContext,
  type IMasterRepository, type IMasterFieldRepository, type IMasterValueRepository,
} from './types/index';

// Errors
export {
  MasterErrorCode, type MasterErrorCodeValue,
  masterNotFound, masterCodeExists, masterSystemProtected, masterInactive,
  masterVersionConflict, fieldNotFound, fieldCodeExists,
  valueNotFound, valueCodeExists, referenceInvalid,
} from './errors/index';

// Validation
export { validateCreateMaster, validateCreateField, validateCreateValue, isValidDataType } from './validation/index';

// Repositories
export { PgMasterRepository } from './repositories/pg-master';
export { PgMasterFieldRepository } from './repositories/pg-field';
export { PgMasterValueRepository } from './repositories/pg-value';

// Services
export { MasterService, type MasterServiceOptions } from './services/index';
