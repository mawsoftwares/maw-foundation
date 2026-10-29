import type { PageTemplateDefinition, PageTemplateSettings } from './types';

const base: PageTemplateSettings = { width: 'contained', aside: false, columns: 3 };
const slot = (id: string, label: string, required = false) => ({ id, label, required });

export const dashboardTemplate: PageTemplateDefinition = {
  id: 'dashboard',
  label: 'Dashboard',
  description: 'KPI row and a grid of widgets, with optional free content and a side column.',
  slots: [slot('header', 'Header'), slot('kpis', 'KPIs'), slot('widgets', 'Widgets'), slot('content', 'Content'), slot('aside', 'Side column')],
  widgetSlots: ['kpis', 'widgets', 'aside'],
  defaults: { ...base, columns: 4 },
};

export const listingTemplate: PageTemplateDefinition = {
  id: 'listing',
  label: 'Listing',
  description: 'Header, filters and toolbar above a data table or card list.',
  slots: [slot('header', 'Header'), slot('filters', 'Filters'), slot('toolbar', 'Toolbar'), slot('content', 'Listing', true)],
  widgetSlots: [],
  defaults: { ...base, width: 'full' },
};

export const detailsTemplate: PageTemplateDefinition = {
  id: 'details',
  label: 'Details',
  description: 'A record page: header, summary strip, main content and an optional side column.',
  slots: [slot('header', 'Header'), slot('summary', 'Summary'), slot('content', 'Details', true), slot('aside', 'Side column')],
  widgetSlots: ['aside'],
  defaults: { ...base, aside: true },
};

export const formTemplate: PageTemplateDefinition = {
  id: 'form',
  label: 'Form',
  description: 'A focused, centred form with a sticky action bar.',
  slots: [slot('header', 'Header'), slot('content', 'Form', true), slot('footer', 'Actions')],
  widgetSlots: [],
  defaults: base,
};

export const kanbanTemplate: PageTemplateDefinition = {
  id: 'kanban',
  label: 'Kanban',
  description: 'A toolbar above horizontally scrolling lanes.',
  slots: [slot('header', 'Header'), slot('toolbar', 'Toolbar'), slot('board', 'Board', true)],
  widgetSlots: [],
  defaults: { ...base, width: 'full' },
};

export const calendarTemplate: PageTemplateDefinition = {
  id: 'calendar',
  label: 'Calendar',
  description: 'A toolbar, a calendar surface and an optional agenda side column.',
  slots: [slot('header', 'Header'), slot('toolbar', 'Toolbar'), slot('calendar', 'Calendar', true), slot('aside', 'Agenda')],
  widgetSlots: ['aside'],
  defaults: { ...base, width: 'full', aside: true },
};

export const communicationTemplate: PageTemplateDefinition = {
  id: 'communication',
  label: 'Communication',
  description: 'Conversation list, message thread and an optional details pane; one pane at a time on small screens.',
  slots: [slot('list', 'Conversations', true), slot('thread', 'Thread', true), slot('details', 'Details')],
  widgetSlots: [],
  defaults: { ...base, width: 'full', aside: true },
};

export const BUILT_IN_PAGE_TEMPLATES: readonly PageTemplateDefinition[] = [
  dashboardTemplate,
  listingTemplate,
  detailsTemplate,
  formTemplate,
  kanbanTemplate,
  calendarTemplate,
  communicationTemplate,
];
