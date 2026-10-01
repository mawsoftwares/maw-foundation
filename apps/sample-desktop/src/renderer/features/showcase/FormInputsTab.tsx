import type { ReactNode } from 'react';
import {
  Card,
  TextArea,
  Select,
  Checkbox,
  Toggle,
  Stack,
} from '@mawsoftwares/ui-web';

interface Props {
  textareaVal: string;
  setTextareaVal: (v: string) => void;
  selectVal: string;
  setSelectVal: (v: string) => void;
  checkboxVal: boolean;
  setCheckboxVal: (v: boolean) => void;
  toggleVal: boolean;
  setToggleVal: (v: boolean) => void;
}

export function FormInputsTab({
  textareaVal, setTextareaVal,
  selectVal, setSelectVal,
  checkboxVal, setCheckboxVal,
  toggleVal, setToggleVal,
}: Props): ReactNode {
  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>TextArea</h3>
      <TextArea
        label="Description"
        value={textareaVal}
        onChange={(e) => setTextareaVal(e.target.value)}
        placeholder="Type something..."
      />

      <h3 style={{ color: 'var(--maw-fg)' }}>Select</h3>
      <Select
        label="Category"
        placeholder="Choose..."
        value={selectVal}
        onChange={(e) => setSelectVal(e.target.value)}
        options={[
          { value: 'electronics', label: 'Electronics' },
          { value: 'clothing', label: 'Clothing' },
          { value: 'food', label: 'Food & Beverages' },
        ]}
      />

      <h3 style={{ color: 'var(--maw-fg)' }}>Checkbox &amp; Toggle</h3>
      <Stack direction="column" gap="var(--maw-space-md)">
        <Checkbox label="Enable notifications" checked={checkboxVal} onChange={setCheckboxVal} />
        <Checkbox label="Disabled option" checked={false} onChange={() => {}} disabled />
        <Toggle label="Dark mode" checked={toggleVal} onChange={setToggleVal} />
      </Stack>
    </Card>
  );
}
