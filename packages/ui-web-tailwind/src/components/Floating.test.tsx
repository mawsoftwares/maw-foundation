import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DropdownMenu } from './DropdownMenu';
import { Popover } from './Popover';
import { Tooltip } from './Tooltip';

describe('floating components (closed state, server render)', () => {
  it('Tooltip renders its child inside a wrapper that lets disabled children pass pointer events through', () => {
    const html = renderToStaticMarkup(
      createElement(Tooltip, { content: 'Only owners can delete' }, createElement('button', { disabled: true }, 'Delete')),
    );
    expect(html).toContain('Delete');
    expect(html).toContain('[&amp;&gt;:disabled]:pointer-events-none');
    expect(html).not.toContain('Only owners can delete'); // content is portalled and only mounted on hover/focus
  });

  it('DropdownMenu renders the trigger and keeps the items unmounted until opened', () => {
    const html = renderToStaticMarkup(
      createElement(DropdownMenu, {
        trigger: createElement('button', null, 'Actions'),
        items: [{ key: 'edit', label: 'Edit', onClick: () => undefined }],
      }),
    );
    expect(html).toContain('Actions');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toContain('>Edit<');
  });

  it('Popover renders nothing while closed', () => {
    const html = renderToStaticMarkup(
      createElement(Popover, { open: false, onClose: () => undefined, anchorRef: createRef<HTMLElement>() }, 'Body'),
    );
    expect(html).not.toContain('Body');
  });
});
