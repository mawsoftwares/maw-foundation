import { ImportFormat } from '../types';
import { UnsupportedFormatError } from '../errors';
import type { IParser, ParseResult, ParserOptions } from './types';

export class ExcelParser implements IParser {
  readonly format = ImportFormat.EXCEL;

  async parse(_data: string | Buffer, _options?: ParserOptions): Promise<ParseResult> {
    throw new UnsupportedFormatError(
      'Excel parsing requires a provider implementation. Register an ExcelParser adapter backed by a library such as exceljs or xlsx.',
    );
  }
}
