import { useState, type ReactNode } from 'react';
import { Tabs, useI18n, type DateRange } from '@mawsoftwares/ui-web';
import {
  ButtonsBadgesTab,
  FormInputsTab,
  AdvancedInputsTab,
  FeedbackTab,
  LayoutDataTab,
  PatternsTab,
  DataGridTab,
  DynamicFormsTab,
  FileUploadTab,
} from './showcase/index';

const TABS = [
  { key: 'buttons', label: 'Buttons & Badges' },
  { key: 'inputs', label: 'Form Inputs' },
  { key: 'advanced', label: 'Advanced Inputs' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'layout', label: 'Layout & Data' },
  { key: 'patterns', label: 'Patterns' },
  { key: 'datagrid', label: 'DataGrid' },
  { key: 'forms', label: 'Dynamic Forms' },
  { key: 'upload', label: 'File Upload' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function ShowcaseView(): ReactNode {
  const { locale, setLocale } = useI18n();

  // shared form-input state (passed down to tabs that need it)
  const [activeTab, setActiveTab] = useState<TabKey>('buttons');
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [toggleVal, setToggleVal] = useState(false);
  const [textareaVal, setTextareaVal] = useState('');
  const [selectVal, setSelectVal] = useState('');
  const [radioVal, setRadioVal] = useState('email');
  const [multiVal, setMultiVal] = useState<readonly string[]>([]);
  const [searchVal, setSearchVal] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [rangeVal, setRangeVal] = useState<DateRange>({ start: '', end: '' });
  const [timeVal, setTimeVal] = useState('');

  return (
    <div>
      <h1 style={{ color: 'var(--maw-fg)', marginTop: 0, fontSize: 'var(--maw-text-xl)' }}>
        UI Component Showcase
      </h1>
      <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>
        All @mawsoftwares/ui-web components using CSS custom properties — responsive to dark mode and tenant branding.
      </p>

      <Tabs
        tabs={TABS as unknown as { key: string; label: string }[]}
        activeTab={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        style={{ marginBottom: 'var(--maw-space-xl)' }}
      />

      {activeTab === 'buttons' && (
        <ButtonsBadgesTab locale={locale} setLocale={setLocale} />
      )}

      {activeTab === 'inputs' && (
        <FormInputsTab
          textareaVal={textareaVal} setTextareaVal={setTextareaVal}
          selectVal={selectVal} setSelectVal={setSelectVal}
          checkboxVal={checkboxVal} setCheckboxVal={setCheckboxVal}
          toggleVal={toggleVal} setToggleVal={setToggleVal}
        />
      )}

      {activeTab === 'advanced' && (
        <AdvancedInputsTab
          radioVal={radioVal} setRadioVal={setRadioVal}
          multiVal={multiVal} setMultiVal={setMultiVal}
          searchVal={searchVal} setSearchVal={setSearchVal}
          dateVal={dateVal} setDateVal={setDateVal}
          rangeVal={rangeVal} setRangeVal={setRangeVal}
          timeVal={timeVal} setTimeVal={setTimeVal}
        />
      )}

      {activeTab === 'feedback' && <FeedbackTab toggleVal={toggleVal} />}

      {activeTab === 'layout' && <LayoutDataTab />}

      {activeTab === 'patterns' && (
        <PatternsTab
          toggleVal={toggleVal} setToggleVal={setToggleVal}
          selectVal={selectVal}
        />
      )}

      {activeTab === 'datagrid' && <DataGridTab />}

      {activeTab === 'forms' && <DynamicFormsTab />}

      {activeTab === 'upload' && <FileUploadTab />}
    </div>
  );
}
