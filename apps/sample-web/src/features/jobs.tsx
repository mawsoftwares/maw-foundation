import { useState, useCallback, type ReactNode, type ChangeEvent } from 'react';
import { ApiError } from '@mawsoftwares/api-client';
import type { ApiSuccessResponse } from '@mawsoftwares/api/response/types';
import {
  Card,
  Badge,
  Button,
  Stack,
  Divider,
  DataTable,
  ListPage,
  useToast,
  ErrorState,
  PageLoader,
  Modal,
  TextField,
  Select,
  type ColumnDef,
} from '@mawsoftwares/ui-web';
import { client } from '../api';

interface JobRecord {
  readonly id: string;
  readonly type: string;
  readonly status: string;
  readonly priority: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly failedAt?: string;
  readonly error?: string;
  readonly data?: unknown;
  readonly result?: unknown;
}

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  COMPLETED: 'success',
  FAILED: 'danger',
  PROCESSING: 'warning',
  QUEUED: 'info',
  RETRYING: 'warning',
  CANCELLED: 'default',
  PENDING: 'default',
};

const JOB_TYPES = ['audit.cleanup', 'notification.send'];

const COLUMNS: ColumnDef<JobRecord>[] = [
  { key: 'id', header: 'Job ID', width: 120, render: (r: JobRecord) => <code style={{ fontSize: 11 }}>{r.id.slice(0, 8)}...</code> },
  { key: 'type', header: 'Type', sortable: true },
  {
    key: 'status', header: 'Status', width: 110,
    render: (r: JobRecord) => <Badge variant={STATUS_VARIANT[r.status] ?? 'default'}>{r.status}</Badge>,
  },
  { key: 'priority', header: 'Priority', width: 80, align: 'right' },
  { key: 'attempts', header: 'Attempts', width: 90, align: 'right', render: (r: JobRecord) => `${r.attempts}/${r.maxAttempts}` },
  {
    key: 'createdAt', header: 'Created', width: 160,
    render: (r: JobRecord) => new Date(r.createdAt).toLocaleString(),
  },
  {
    key: 'error', header: 'Error', width: 200,
    render: (r: JobRecord) => r.error ? <span style={{ color: 'var(--maw-error)', fontSize: 'var(--maw-text-xs)' }}>{r.error}</span> : '—',
  },
];

export function JobsView(): ReactNode {
  const toast = useToast();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [filterType, setFilterType] = useState('audit.cleanup');
  const [filterStatus, setFilterStatus] = useState('');
  const [showEnqueue, setShowEnqueue] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);

  const loadJobs = useCallback(() => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams({ type: filterType });
    if (filterStatus) params.set('status', filterStatus);
    client
      .request<ApiSuccessResponse<JobRecord[]>>(`/api/v1/jobs?${params}`)
      .then((r) => { setJobs(r.data); setLoaded(true); })
      .catch((e: ApiError) => setError(`${e.status}: ${e.message}`))
      .finally(() => setLoading(false));
  }, [filterType, filterStatus]);

  const handleEnqueue = useCallback((type: string, data: Record<string, unknown>) => {
    client
      .request<ApiSuccessResponse<{ jobId: string; status: string }>>('/api/v1/jobs', {
        method: 'POST',
        body: JSON.stringify({ type, data }),
      })
      .then((r) => {
        toast.success(`Job enqueued: ${r.data.jobId.slice(0, 8)}...`);
        setShowEnqueue(false);
        loadJobs();
      })
      .catch((e: ApiError) => toast.error(`Enqueue failed: ${e.message}`));
  }, [toast, loadJobs]);

  const label: React.CSSProperties = { fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)', fontWeight: 500 };

  if (!loaded && !loading && !error) {
    return (
      <ListPage
        title="Jobs"
        description="Queue monitoring — view, filter, and enqueue background jobs"
        createLabel="Enqueue Job"
        onCreate={() => setShowEnqueue(true)}
        toolbar={
          <Stack direction="row" gap="var(--maw-space-sm)" align="center" style={{ flexWrap: 'wrap' }}>
            <Select
              value={filterType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
              options={JOB_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Select
              value={filterStatus}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'QUEUED', value: 'QUEUED' },
                { label: 'PROCESSING', value: 'PROCESSING' },
                { label: 'COMPLETED', value: 'COMPLETED' },
                { label: 'FAILED', value: 'FAILED' },
                { label: 'RETRYING', value: 'RETRYING' },
                { label: 'CANCELLED', value: 'CANCELLED' },
              ]}
            />
          </Stack>
        }
      >
        <Card style={{ padding: 'var(--maw-space-xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--maw-fgMuted)', marginBottom: 'var(--maw-space-md)' }}>
            Select a job type and click Load to view queue status
          </p>
          <Button onClick={loadJobs}>Load Jobs</Button>
        </Card>
        <EnqueueModal open={showEnqueue} onClose={() => setShowEnqueue(false)} onSubmit={handleEnqueue} />
      </ListPage>
    );
  }

  if (error) return <ErrorState title="Failed to load jobs" message={error} retry={loadJobs} />;
  if (loading && !loaded) return <PageLoader message="Loading jobs..." />;

  return (
    <>
      <ListPage
        title="Jobs"
        description={`${jobs.length} jobs loaded`}
        createLabel="Enqueue Job"
        onCreate={() => setShowEnqueue(true)}
        toolbar={
          <Stack direction="row" gap="var(--maw-space-sm)" align="center" style={{ flexWrap: 'wrap' }}>
            <Select
              value={filterType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
              options={JOB_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Select
              value={filterStatus}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
              options={[
                { label: 'All Statuses', value: '' },
                { label: 'QUEUED', value: 'QUEUED' },
                { label: 'PROCESSING', value: 'PROCESSING' },
                { label: 'COMPLETED', value: 'COMPLETED' },
                { label: 'FAILED', value: 'FAILED' },
                { label: 'RETRYING', value: 'RETRYING' },
                { label: 'CANCELLED', value: 'CANCELLED' },
              ]}
            />
            <Button variant="ghost" onClick={loadJobs}>Refresh</Button>
          </Stack>
        }
      >
        <DataTable<JobRecord>
          data={jobs}
          columns={COLUMNS}
          keyField="id"
          onRowClick={(row) => setSelectedJob(row)}
          loading={loading}
          emptyMessage="No jobs found. Try changing filters or enqueue a new job."
        />
      </ListPage>

      <EnqueueModal open={showEnqueue} onClose={() => setShowEnqueue(false)} onSubmit={handleEnqueue} />

      {selectedJob && (
        <Modal open onClose={() => setSelectedJob(null)} title={`Job ${selectedJob.id.slice(0, 8)}...`}>
          <div style={{ padding: 'var(--maw-space-lg)' }}>
            <Stack gap="var(--maw-space-sm)">
              <div><span style={label}>ID:</span> <code>{selectedJob.id}</code></div>
              <div><span style={label}>Type:</span> {selectedJob.type}</div>
              <div><span style={label}>Status:</span> <Badge variant={STATUS_VARIANT[selectedJob.status] ?? 'default'}>{selectedJob.status}</Badge></div>
              <div><span style={label}>Priority:</span> {selectedJob.priority}</div>
              <div><span style={label}>Attempts:</span> {selectedJob.attempts}/{selectedJob.maxAttempts}</div>
              <div><span style={label}>Created:</span> {new Date(selectedJob.createdAt).toLocaleString()}</div>
              {selectedJob.startedAt && <div><span style={label}>Started:</span> {new Date(selectedJob.startedAt).toLocaleString()}</div>}
              {selectedJob.completedAt && <div><span style={label}>Completed:</span> {new Date(selectedJob.completedAt).toLocaleString()}</div>}
              {selectedJob.failedAt && <div><span style={label}>Failed:</span> {new Date(selectedJob.failedAt).toLocaleString()}</div>}
              {selectedJob.error && <div><span style={label}>Error:</span> <span style={{ color: 'var(--maw-error)' }}>{selectedJob.error}</span></div>}
              <Divider />
              <div>
                <div style={label}>Data</div>
                <pre style={{ fontSize: 11, background: 'var(--maw-surface)', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 150 }}>
                  {JSON.stringify(selectedJob.data, null, 2)}
                </pre>
              </div>
              {selectedJob.result !== undefined && (
                <div>
                  <div style={label}>Result</div>
                  <pre style={{ fontSize: 11, background: 'var(--maw-surface)', padding: 8, borderRadius: 4, overflow: 'auto', maxHeight: 150 }}>
                    {JSON.stringify(selectedJob.result, null, 2)}
                  </pre>
                </div>
              )}
            </Stack>
          </div>
        </Modal>
      )}
    </>
  );
}

function EnqueueModal({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (type: string, data: Record<string, unknown>) => void;
}): ReactNode {
  const [type, setType] = useState('audit.cleanup');
  const [jsonData, setJsonData] = useState('{}');

  if (!open) return null;

  return (
    <Modal open onClose={onClose} title="Enqueue Job">
      <div style={{ padding: 'var(--maw-space-lg)' }}>
        <Stack gap="var(--maw-space-md)">
          <div>
            <Select
              label="Job Type"
              value={type}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setType(e.target.value)}
              options={JOB_TYPES.map((t) => ({ label: t, value: t }))}
            />
          </div>
          <TextField
            label="Job Data (JSON)"
            value={jsonData}
            onChange={(e) => setJsonData(e.target.value)}
          />
          <Stack direction="row" gap="var(--maw-space-sm)" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => {
              try {
                onSubmit(type, JSON.parse(jsonData) as Record<string, unknown>);
              } catch {
                // invalid JSON
              }
            }}>
              Enqueue
            </Button>
          </Stack>
        </Stack>
      </div>
    </Modal>
  );
}
