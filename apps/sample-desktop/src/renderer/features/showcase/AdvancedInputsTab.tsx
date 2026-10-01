import type { ReactNode } from 'react';
import {
  Card,
  RadioGroup,
  MultiSelect,
  SearchableSelect,
  DatePicker,
  DateRangePicker,
  TimePicker,
  Stack,
  type DateRange,
} from '@mawsoftwares/ui-web';

interface Props {
  radioVal: string;
  setRadioVal: (v: string) => void;
  multiVal: readonly string[];
  setMultiVal: (v: readonly string[]) => void;
  searchVal: string;
  setSearchVal: (v: string) => void;
  dateVal: string;
  setDateVal: (v: string) => void;
  rangeVal: DateRange;
  setRangeVal: (v: DateRange) => void;
  timeVal: string;
  setTimeVal: (v: string) => void;
}

export function AdvancedInputsTab({
  radioVal, setRadioVal,
  multiVal, setMultiVal,
  searchVal, setSearchVal,
  dateVal, setDateVal,
  rangeVal, setRangeVal,
  timeVal, setTimeVal,
}: Props): ReactNode {
  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>RadioGroup</h3>
        <RadioGroup
          label="Notification method"
          name="notify"
          value={radioVal}
          onChange={setRadioVal}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'sms', label: 'SMS' },
            { value: 'push', label: 'Push notification' },
            { value: 'none', label: 'None', disabled: true },
          ]}
        />
        <RadioGroup
          label="Layout direction"
          name="direction"
          value={radioVal}
          onChange={setRadioVal}
          direction="row"
          options={[
            { value: 'email', label: 'Email' },
            { value: 'sms', label: 'SMS' },
            { value: 'push', label: 'Push' },
          ]}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>MultiSelect</h3>
        <MultiSelect
          label="Assign tags"
          value={multiVal}
          onChange={setMultiVal}
          options={[
            { value: 'urgent', label: 'Urgent' },
            { value: 'bug', label: 'Bug' },
            { value: 'feature', label: 'Feature' },
            { value: 'docs', label: 'Documentation' },
            { value: 'perf', label: 'Performance' },
            { value: 'security', label: 'Security' },
          ]}
          placeholder="Search tags..."
          maxSelections={4}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>SearchableSelect</h3>
        <SearchableSelect
          label="Country"
          value={searchVal}
          onChange={setSearchVal}
          options={[
            { value: 'us', label: 'United States' },
            { value: 'uk', label: 'United Kingdom' },
            { value: 'in', label: 'India' },
            { value: 'de', label: 'Germany' },
            { value: 'fr', label: 'France' },
            { value: 'jp', label: 'Japan' },
            { value: 'au', label: 'Australia' },
            { value: 'ca', label: 'Canada' },
          ]}
          placeholder="Search countries..."
          clearable
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>DatePicker</h3>
        <DatePicker
          label="Start date"
          value={dateVal}
          onChange={setDateVal}
          required
        />

        <h3 style={{ color: 'var(--maw-fg)' }}>DateRangePicker</h3>
        <DateRangePicker
          label="Report period"
          value={rangeVal}
          onChange={setRangeVal}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>TimePicker</h3>
        <Stack direction="row" gap="var(--maw-space-lg)">
          <div style={{ flex: 1 }}>
            <TimePicker
              label="Meeting time (12h)"
              value={timeVal}
              onChange={setTimeVal}
              step={30}
            />
          </div>
          <div style={{ flex: 1 }}>
            <TimePicker
              label="Meeting time (24h)"
              value={timeVal}
              onChange={setTimeVal}
              step={15}
              use24Hour
            />
          </div>
        </Stack>
      </Card>
    </Stack>
  );
}
