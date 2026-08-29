import type { ReactNode } from 'react';
import { useState } from 'react';
import { Drawer, Form, Input, Button, useToast } from '@mawsoftwares/ui-web';
import type { EntityResponseDto, CreateEntityDto, UpdateEntityDto } from '../../server/application/dto';

/**
 * CRUD Module Template — Create / Edit Form
 *
 * REPLACE: `Entity` / `entity` → your domain noun.
 * ADD: project-specific fields matching your domain entity.
 */

interface EntityFormProps {
  item?: EntityResponseDto;      // undefined = create mode, defined = edit mode
  onClose: () => void;
  onSuccess: () => void;
}

// TODO: replace with real API calls using @mawsoftwares/api-client
async function createEntity(_data: CreateEntityDto): Promise<void> { /* POST /api/v1/entities */ }
async function updateEntity(_id: string, _data: UpdateEntityDto): Promise<void> { /* PATCH /api/v1/entities/:id */ }

export function EntityForm({ item, onClose, onSuccess }: EntityFormProps): ReactNode {
  const { addToast } = useToast();
  const isEdit = item !== undefined;

  const [name,        setName]        = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [saving,      setSaving]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ type: 'error', message: 'Name is required' });
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateEntity(item.id, { name: name.trim(), description: description.trim() || undefined });
      } else {
        await createEntity({ tenantId: '', name: name.trim(), description: description.trim() || undefined });
      }
      addToast({ type: 'success', message: isEdit ? 'Updated successfully' : 'Created successfully' });
      onSuccess();
    } catch {
      addToast({ type: 'error', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      title={isEdit ? 'Edit Entity' : 'New Entity'}
      onClose={onClose}
      width={480}
    >
      <Form onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id="entity-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Input
          id="entity-description"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* ADD project-specific fields here */}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
