import type { ReportDefinition } from '../definition/types';
import type { IReportDataSource } from '../datasource/types';

export interface IReportDefinitionRegistry {
  register(name: string, definition: ReportDefinition): void;
  get(name: string): ReportDefinition | undefined;
  list(): readonly string[];
}

export interface IReportDataSourceRegistry {
  register(name: string, datasource: IReportDataSource): void;
  get(name: string): IReportDataSource | undefined;
}

export class ReportDefinitionRegistry implements IReportDefinitionRegistry {
  private readonly definitions = new Map<string, ReportDefinition>();

  register(name: string, definition: ReportDefinition): void {
    this.definitions.set(name, definition);
  }

  get(name: string): ReportDefinition | undefined {
    return this.definitions.get(name);
  }

  list(): readonly string[] {
    return [...this.definitions.keys()];
  }
}

export class ReportDataSourceRegistry implements IReportDataSourceRegistry {
  private readonly datasources = new Map<string, IReportDataSource>();

  register(name: string, datasource: IReportDataSource): void {
    this.datasources.set(name, datasource);
  }

  get(name: string): IReportDataSource | undefined {
    return this.datasources.get(name);
  }
}
