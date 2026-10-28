export * from './types';
export {
  BUILT_IN_PAGE_TEMPLATES,
  calendarTemplate,
  communicationTemplate,
  dashboardTemplate,
  detailsTemplate,
  formTemplate,
  kanbanTemplate,
  listingTemplate,
} from './templates';
export {
  DEFAULT_PAGE_TEMPLATE_ID,
  createPageTemplateRegistry,
  defaultPageTemplateRegistry,
  type CreatePageTemplateRegistryOptions,
  type PageTemplateRegistry,
} from './registry';
export { resolvePageTemplate } from './resolve';
export {
  MAX_WIDGET_PLACEMENTS,
  MAX_WIDGET_TITLE_LENGTH,
  missingRequiredSlots,
  validatePageSettings,
  validateStoredPageConfig,
  validateWidgetPlacements,
} from './validate';
