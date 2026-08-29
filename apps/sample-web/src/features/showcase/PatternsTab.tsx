import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Toggle,
  Select,
  Wizard,
  SearchBar,
  SettingsLayout,
  Stack,
  useToast,
  useColorMode,
} from '@mawsoftwares/ui-web';

interface Props {
  toggleVal: boolean;
  setToggleVal: (v: boolean) => void;
  selectVal: string;
}

export function PatternsTab({ toggleVal, setToggleVal, selectVal }: Props): ReactNode {
  const toast = useToast();
  const { isDark, toggleColorMode } = useColorMode();
  const [wizardStep, setWizardStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Wizard</h3>
        <Wizard
          steps={[
            { key: 'info', title: 'Basic Info', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Enter your name and email address.</p> },
            { key: 'plan', title: 'Choose Plan', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Select a subscription plan that fits your needs.</p> },
            { key: 'payment', title: 'Payment', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Add your payment method to continue.</p> },
            { key: 'review', title: 'Review', content: <p style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Review your selections and confirm.</p> },
          ]}
          activeStep={wizardStep}
          onStepChange={setWizardStep}
          onComplete={() => { setWizardStep(0); toast.success('Wizard completed!'); }}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>SearchBar</h3>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search orders, items, users…"
          onSearch={(q) => toast.info(`Searching: "${q}"`)}
        />
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>SettingsLayout</h3>
        <SettingsLayout
          groups={[
            {
              key: 'notifications',
              title: 'Email notifications',
              description: 'Choose which emails you want to receive.',
              children: <Toggle checked={toggleVal} onChange={setToggleVal} label="Marketing emails" />,
            },
            {
              key: 'language',
              title: 'Language',
              description: 'Select your preferred language for the interface.',
              children: (
                <Select value={selectVal || 'en'} onChange={(v) => toast.info(`Language: ${v}`)} options={[{ value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' }, { value: 'mr', label: 'Marathi' }]} />
              ),
            },
            {
              key: 'theme',
              title: 'Appearance',
              description: 'Toggle between light and dark mode.',
              children: <Toggle checked={isDark} onChange={toggleColorMode} label={isDark ? 'Dark mode' : 'Light mode'} />,
            },
          ]}
        />
      </Card>
    </Stack>
  );
}
