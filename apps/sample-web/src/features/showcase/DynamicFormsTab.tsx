import type { ReactNode } from 'react';
import { Card, Stack, DynamicForm, useToast } from '@mawsoftwares/ui-web';
import type { FormSchema } from '@mawsoftwares/sdk';

const CUSTOMER_FORM_SCHEMA: FormSchema = {
  id: 'customer.create',
  version: 1,
  title: 'Create Customer',
  description: 'Schema-driven form — no manual JSX needed.',
  fields: [
    { name: 'name', type: 'text', label: 'Full Name', required: true, placeholder: 'John Doe', validation: [{ type: 'minLength', value: 2 }] },
    { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'john@example.com' },
    { name: 'phone', type: 'phone', label: 'Phone', placeholder: '+1234567890' },
    { name: 'age', type: 'number', label: 'Age', min: 18, max: 120, validation: [{ type: 'min', value: 18, message: 'Must be 18 or older' }] },
    { name: 'gender', type: 'select', label: 'Gender', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }] },
    { name: 'dob', type: 'date', label: 'Date of Birth' },
    { name: 'notes', type: 'textarea', label: 'Notes', placeholder: 'Additional information…', rows: 3 },
    { name: 'newsletter', type: 'switch', label: 'Subscribe to newsletter', defaultValue: true },
  ],
  layout: { type: 'two-column' },
  focusFirstError: true,
};

const CONDITIONAL_FORM_SCHEMA: FormSchema = {
  id: 'customer.conditional',
  version: 1,
  title: 'Customer Type Form',
  description: 'Conditional fields — business fields appear only when type is "business".',
  fields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    {
      name: 'customerType', type: 'select', label: 'Customer Type', required: true,
      options: [{ value: 'individual', label: 'Individual' }, { value: 'business', label: 'Business' }],
    },
    {
      name: 'companyName', type: 'text', label: 'Company Name',
      visibleWhen: { field: 'customerType', operator: 'eq', value: 'business' },
      requiredWhen: { field: 'customerType', operator: 'eq', value: 'business' },
    },
    {
      name: 'gstNumber', type: 'text', label: 'GST Number', placeholder: 'e.g. 22AAAAA0000A1Z5',
      visibleWhen: { field: 'customerType', operator: 'eq', value: 'business' },
      requiredWhen: { field: 'customerType', operator: 'eq', value: 'business' },
    },
    { name: 'email', type: 'email', label: 'Email', required: true },
  ],
  layout: { type: 'single' },
};

const SECTIONED_FORM_SCHEMA: FormSchema = {
  id: 'employee.create',
  version: 1,
  title: 'New Employee',
  description: 'Sectioned layout with grouped fields.',
  fields: [
    { name: 'firstName', type: 'text', label: 'First Name', required: true },
    { name: 'lastName', type: 'text', label: 'Last Name', required: true },
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'phone', type: 'phone', label: 'Phone' },
    { name: 'department', type: 'select', label: 'Department', options: [{ value: 'engineering', label: 'Engineering' }, { value: 'sales', label: 'Sales' }, { value: 'hr', label: 'HR' }, { value: 'finance', label: 'Finance' }] },
    { name: 'designation', type: 'text', label: 'Designation' },
    { name: 'joiningDate', type: 'date', label: 'Joining Date', required: true },
    { name: 'active', type: 'switch', label: 'Active', defaultValue: true },
  ],
  sections: [
    { id: 'personal', title: 'Personal Information', fields: ['firstName', 'lastName'], columns: 2 },
    { id: 'contact', title: 'Contact Information', fields: ['email', 'phone'], columns: 2 },
    { id: 'work', title: 'Work Details', fields: ['department', 'designation', 'joiningDate', 'active'], columns: 2 },
  ],
  layout: { type: 'sections' },
};

export function DynamicFormsTab(): ReactNode {
  const toast = useToast();

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <DynamicForm
          schema={CUSTOMER_FORM_SCHEMA}
          onSubmit={(values) => { toast.success(`Customer: ${JSON.stringify(values).slice(0, 80)}…`); }}
          onCancel={() => toast.info('Cancelled')}
          submitLabel="Create Customer"
        />
      </Card>
      <Card>
        <DynamicForm
          schema={CONDITIONAL_FORM_SCHEMA}
          onSubmit={(values) => { toast.success(`Conditional: ${JSON.stringify(values).slice(0, 80)}…`); }}
          submitLabel="Save"
        />
      </Card>
      <Card>
        <DynamicForm
          schema={SECTIONED_FORM_SCHEMA}
          onSubmit={(values) => { toast.success(`Employee: ${JSON.stringify(values).slice(0, 80)}…`); }}
          onCancel={() => toast.info('Cancelled')}
          submitLabel="Create Employee"
        />
      </Card>
    </Stack>
  );
}
