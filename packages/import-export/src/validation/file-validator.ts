import { getExtension, getMimeType, formatFileSize } from '@maw/sdk';
import type { ImportDefinition, ImportFormatValue } from '../types';
import { ImportFormat } from '../types';
import { FileValidationError } from '../errors';

const FORMAT_EXTENSIONS: Record<string, readonly string[]> = {
  [ImportFormat.CSV]: ['csv'],
  [ImportFormat.EXCEL]: ['xlsx', 'xls'],
  [ImportFormat.JSON]: ['json'],
};

const FORMAT_MIMES: Record<string, readonly string[]> = {
  [ImportFormat.CSV]: ['text/csv', 'application/csv'],
  [ImportFormat.EXCEL]: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  [ImportFormat.JSON]: ['application/json'],
};

export class FileValidator {
  validate(fileName: string, fileSize: number, definition: ImportDefinition): ImportFormatValue {
    const ext = getExtension(fileName);
    if (!ext) {
      throw new FileValidationError('File has no extension', { fileName });
    }

    const detectedFormat = this.detectFormat(ext);
    if (!detectedFormat) {
      throw new FileValidationError(`Unsupported file extension: .${ext}`, { ext });
    }

    if (definition.allowedFormats && !definition.allowedFormats.includes(detectedFormat)) {
      throw new FileValidationError(
        `Format ${detectedFormat} is not allowed. Allowed: ${definition.allowedFormats.join(', ')}`,
        { format: detectedFormat, allowed: definition.allowedFormats },
      );
    }

    if (definition.maxFileSize && fileSize > definition.maxFileSize) {
      throw new FileValidationError(
        `File size ${formatFileSize(fileSize)} exceeds maximum ${formatFileSize(definition.maxFileSize)}`,
        { fileSize, maxFileSize: definition.maxFileSize },
      );
    }

    const mime = getMimeType(fileName);
    const expectedMimes = FORMAT_MIMES[detectedFormat];
    if (expectedMimes && !expectedMimes.includes(mime) && mime !== 'application/octet-stream') {
      throw new FileValidationError(
        `Unexpected MIME type ${mime} for ${detectedFormat} file`,
        { mime, expected: expectedMimes },
      );
    }

    return detectedFormat;
  }

  private detectFormat(ext: string): ImportFormatValue | null {
    for (const [format, exts] of Object.entries(FORMAT_EXTENSIONS)) {
      if (exts.includes(ext.toLowerCase())) return format as ImportFormatValue;
    }
    return null;
  }
}
