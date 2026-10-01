import { useState, useRef, type ReactNode } from 'react';
import {
  Button,
  Card,
  Modal,
  Progress,
  Spinner,
  Skeleton,
  EmptyState,
  ErrorState,
  Alert,
  Banner,
  Drawer,
  Dialog,
  Popover,
  ConfirmationDialog,
  Stack,
  useToast,
  useI18n,
} from '@mawsoftwares/ui-web';

interface Props {
  toggleVal: boolean;
}

export function FeedbackTab({ toggleVal: _toggleVal }: Props): ReactNode {
  const toast = useToast();
  const { t } = useI18n();

  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState(65);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const popoverAnchor = useRef<HTMLButtonElement>(null);

  return (
    <Stack direction="column" gap="var(--maw-space-lg)">
      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Toast Notifications</h3>
        <Stack direction="row" gap="var(--maw-space-sm)">
          <Button onClick={() => toast.success('Operation successful!')}>Success</Button>
          <Button variant="danger" onClick={() => toast.error('Something went wrong', 'Check the console for details')}>Error</Button>
          <Button variant="ghost" onClick={() => toast.warning('Low stock alert')}>Warning</Button>
          <Button variant="ghost" onClick={() => toast.info('New version available')}>Info</Button>
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Modal</h3>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Sample Modal"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => { setModalOpen(false); toast.success('Confirmed!'); }}>{t('common.save')}</Button>
            </>
          }
        >
          <p style={{ color: 'var(--maw-fg)' }}>This is a modal dialog with a title, content, and footer actions.</p>
          <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>Press Escape or click outside to close.</p>
        </Modal>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Progress &amp; Spinner</h3>
        <Stack direction="row" gap="var(--maw-space-md)" align="center">
          <div style={{ flex: 1 }}>
            <Progress value={progress} />
            <Stack direction="row" gap="var(--maw-space-sm)" style={{ marginTop: 'var(--maw-space-sm)' }}>
              <Button variant="ghost" onClick={() => setProgress(Math.max(0, progress - 10))}>-10</Button>
              <Button variant="ghost" onClick={() => setProgress(Math.min(100, progress + 10))}>+10</Button>
            </Stack>
          </div>
          <Spinner size={32} />
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Skeleton Loading</h3>
        <Stack direction="column" gap="var(--maw-space-sm)">
          <Skeleton width="60%" height={20} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="80%" height={14} />
          <Skeleton width={120} height={32} borderRadius="var(--maw-radius-md)" />
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Empty &amp; Error States</h3>
        <Stack direction="row" gap="var(--maw-space-lg)">
          <div style={{ flex: 1 }}>
            <EmptyState icon="📦" title="No orders" message="Create your first order to get started" action={<Button>Create Order</Button>} />
          </div>
          <div style={{ flex: 1 }}>
            <ErrorState title="Connection failed" message="Could not reach the server" retry={() => toast.info('Retrying...')} />
          </div>
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Alert</h3>
        <Stack direction="column" gap="var(--maw-space-sm)">
          <Alert variant="info" title="System update">Scheduled maintenance on Sunday 2–4 AM.</Alert>
          <Alert variant="success" title="Payment received">Invoice #1042 has been paid.</Alert>
          <Alert variant="warning">Your subscription expires in 3 days.</Alert>
          <Alert variant="danger" title="Error">Failed to sync 2 records.</Alert>
          {!alertDismissed && (
            <Alert variant="info" onDismiss={() => setAlertDismissed(true)}>This alert is dismissible — click ✕ to remove.</Alert>
          )}
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Banner</h3>
        <Stack direction="column" gap="var(--maw-space-sm)">
          <Banner variant="info">New version 2.1 available.</Banner>
          <Banner variant="warning" action={<Button variant="ghost" onClick={() => toast.info('Upgrading...')}>Upgrade</Button>}>Your plan is expiring soon.</Banner>
          {!bannerDismissed && (
            <Banner variant="success" onDismiss={() => setBannerDismissed(true)}>All systems operational. Click ✕ to dismiss.</Banner>
          )}
        </Stack>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Drawer</h3>
        <Button onClick={() => setDrawerOpen(true)}>Open Drawer</Button>
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="Order Details"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Close</Button>
              <Button onClick={() => { setDrawerOpen(false); toast.success('Saved!'); }}>Save</Button>
            </>
          }
        >
          <p style={{ color: 'var(--maw-fg)' }}>This is a slide-in drawer panel from the right side.</p>
          <p style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>Press Escape or click the overlay to close.</p>
        </Drawer>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Dialog</h3>
        <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Edit Profile"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success('Profile updated!'); }}>Save Changes</Button>
            </>
          }
        >
          <p style={{ color: 'var(--maw-fg)' }}>Dialog with role=&quot;dialog&quot;, aria-modal, close button, and overlay click-to-close.</p>
        </Dialog>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Popover</h3>
        <button
          ref={popoverAnchor}
          onClick={() => setPopoverOpen(!popoverOpen)}
          style={{ padding: '8px 16px', borderRadius: 'var(--maw-radius-md)', border: '1px solid var(--maw-border)', background: 'var(--maw-bg)', color: 'var(--maw-fg)', cursor: 'pointer' }}
        >
          Toggle Popover
        </button>
        <Popover open={popoverOpen} onClose={() => setPopoverOpen(false)} anchorRef={popoverAnchor}>
          <p style={{ margin: 0, color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>Popover content anchored to the button.</p>
          <p style={{ margin: '4px 0 0', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>Click outside or press Escape to close.</p>
        </Popover>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>ConfirmationDialog</h3>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete Item</Button>
        <ConfirmationDialog
          open={confirmOpen}
          onConfirm={() => { setConfirmOpen(false); toast.success('Item deleted'); }}
          onCancel={() => setConfirmOpen(false)}
          title="Delete item?"
          message="This action cannot be undone. The item and all associated data will be permanently removed."
          confirmLabel="Delete"
          cancelLabel="Keep it"
          variant="danger"
        />
      </Card>
    </Stack>
  );
}
