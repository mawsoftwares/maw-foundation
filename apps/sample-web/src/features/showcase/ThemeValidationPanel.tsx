import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, Stack, TextField } from '@mawsoftwares/ui-web';
import type { AreaStatus, DesignToThemeResult, ValidationFinding, ValidationReport } from '@mawsoftwares/theme';

const MARK: Readonly<Record<AreaStatus, { symbol: string; color: string; hint: string }>> = {
  match: { symbol: '✓', color: 'var(--maw-success)', hint: 'Checked, nothing to flag' },
  review: { symbol: '!', color: 'var(--maw-warning)', hint: 'Needs a look' },
  fail: { symbol: '✕', color: 'var(--maw-danger)', hint: 'Open error' },
  defaults: { symbol: '–', color: 'var(--maw-fgSubtle)', hint: 'Design is silent; built-in defaults used' },
};

const LABEL: Readonly<Record<string, string>> = {
  colors: 'Colors', typography: 'Typography', spacing: 'Spacing', radius: 'Radius', shadows: 'Shadows', buttons: 'Buttons',
  forms: 'Forms', cards: 'Cards', navigation: 'Navigation', components: 'Other components', responsive: 'Responsive', accessibility: 'Accessibility',
};

const SEVERITY_VARIANT = { error: 'danger', warning: 'warning', info: 'info' } as const;

interface Props {
  readonly report: ValidationReport;
  readonly result: DesignToThemeResult | null;
  readonly onAccept: (findingId: string, reason: string) => void;
  readonly onUndoAccept: (findingId: string) => void;
  readonly onApplyFix: (findingId: string) => void;
}

function Finding({ finding, actions }: { finding: ValidationFinding; actions?: ReactNode }): ReactNode {
  return (
    <li style={{ margin: 'var(--maw-space-sm) 0', fontSize: 'var(--maw-text-sm)', color: 'var(--maw-fg)', opacity: finding.overridden !== undefined ? 0.7 : 1 }}>
      <Stack direction="row" gap="var(--maw-space-sm)" align="center" style={{ flexWrap: 'wrap' }}>
        <Badge variant={SEVERITY_VARIANT[finding.severity]}>{finding.overridden !== undefined ? 'accepted' : finding.severity}</Badge>
        <span>{finding.message}</span>
        {actions}
      </Stack>
      {finding.fix !== undefined && finding.overridden === undefined && (
        <div style={{ marginLeft: 'var(--maw-space-xl)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>Suggestion: {finding.fix.description}</div>
      )}
      {finding.overridden !== undefined && (
        <div style={{ marginLeft: 'var(--maw-space-xl)', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>Accepted: {finding.overridden.reason}</div>
      )}
    </li>
  );
}

function AcceptControl({ onAccept }: { onAccept: (reason: string) => void }): ReactNode {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (!open) return <Button variant="ghost" onClick={() => setOpen(true)}>Accept…</Button>;
  return (
    <Stack direction="row" gap="var(--maw-space-xs)" align="center">
      <TextField placeholder="Why is this acceptable?" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minWidth: 220 }} />
      <Button disabled={reason.trim() === ''} onClick={() => { onAccept(reason.trim()); setOpen(false); setReason(''); }}>Confirm</Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </Stack>
  );
}

/** Theme validation: per-area status, mismatches, accessibility (reported, never auto-changed), and confidence. */
export function ThemeValidationPanel({ report, result, onAccept, onUndoAccept, onApplyFix }: Props): ReactNode {
  const mismatches = report.findings.filter((f) => f.accessibility !== true && f.severity !== 'info');
  const notes = report.findings.filter((f) => f.accessibility !== true && f.severity === 'info');
  const { summary } = report;
  const sources = result?.analysis.sources;

  return (
    <Card>
      <h3 style={{ marginTop: 0, color: 'var(--maw-fg)' }}>Theme Validation</h3>
      <div style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)', marginBottom: 'var(--maw-space-md)' }}>
        {summary.errors} error(s) · {summary.warnings} warning(s) · {summary.info} note(s) · {summary.overridden} accepted
      </div>

      <div style={{ display: 'grid', gap: '2px var(--maw-space-xl)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {report.areas.map(({ area, status }) => (
          <div key={area} title={MARK[status].hint} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)' }}>
            <span>{LABEL[area] ?? area}</span>
            <strong style={{ color: MARK[status].color }} aria-label={MARK[status].hint}>{MARK[status].symbol}</strong>
          </div>
        ))}
      </div>
      <div style={{ color: 'var(--maw-fgSubtle)', fontSize: 'var(--maw-text-xs)', marginTop: 'var(--maw-space-sm)' }}>
        ✓ checked · ! needs a look · ✕ error · – design is silent, built-in defaults used
      </div>

      {mismatches.length > 0 && (
        <>
          <h4 style={{ color: 'var(--maw-fg)', marginBottom: 0 }}>Potential mismatches</h4>
          <ul style={{ paddingLeft: 'var(--maw-space-lg)', margin: 0 }}>{mismatches.map((f) => <Finding key={f.id} finding={f} />)}</ul>
        </>
      )}

      <h4 style={{ color: 'var(--maw-fg)', marginBottom: 0 }}>Accessibility</h4>
      <div style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>
        Reported from the design as given. Nothing here changes the theme unless you apply a fix or accept the finding.
      </div>
      {report.accessibility.length === 0 ? (
        <div style={{ color: 'var(--maw-success)', fontSize: 'var(--maw-text-sm)', marginTop: 'var(--maw-space-sm)' }}>No accessibility issues found.</div>
      ) : (
        <ul style={{ paddingLeft: 'var(--maw-space-lg)', margin: 0 }}>
          {report.accessibility.map((f) => (
            <Finding
              key={f.id}
              finding={f}
              actions={f.overridden !== undefined
                ? <Button variant="ghost" onClick={() => onUndoAccept(f.id)}>Undo</Button>
                : (
                  <>
                    {f.fix !== undefined && <Button variant="outline" onClick={() => onApplyFix(f.id)}>Apply fix</Button>}
                    <AcceptControl onAccept={(reason) => onAccept(f.id, reason)} />
                  </>
                )}
            />
          ))}
        </ul>
      )}
      {report.skipped.length > 0 && (
        <div style={{ color: 'var(--maw-fgSubtle)', fontSize: 'var(--maw-text-xs)', marginTop: 'var(--maw-space-sm)' }}>
          Not evaluated (needs the browser to resolve): {report.skipped.slice(0, 6).join('; ')}{report.skipped.length > 6 ? '…' : ''}
        </div>
      )}

      {result !== null && sources !== undefined && (
        <>
          <h4 style={{ color: 'var(--maw-fg)', marginBottom: 0 }}>Confidence</h4>
          <Stack direction="row" gap="var(--maw-space-sm)" style={{ flexWrap: 'wrap', margin: 'var(--maw-space-sm) 0' }}>
            <Badge variant="success">{sources.design} exact</Badge>
            <Badge variant="info">{sources.derived} derived</Badge>
            <Badge variant="warning">{sources.estimated} estimated</Badge>
            <Badge variant="default">{sources.manual} manual</Badge>
          </Stack>
          <div style={{ color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-xs)' }}>
            Spacing: {result.analysis.spacingSystem.kind}{result.analysis.spacingSystem.base !== undefined ? ` (${result.analysis.spacingSystem.base}px base)` : ''}
            {' '}({result.analysis.spacingSystemBasis}) · Radius: {result.analysis.radiusStyle ?? 'not stated'} · Dark mode: {result.analysis.hasDarkMode ? 'specified' : 'derived'}
            {result.analysis.coverage.missing.length > 0 ? ` · Missing colour roles: ${result.analysis.coverage.missing.join(', ')}` : ''}
          </div>
          {result.review.length > 0 && (
            <>
              <div style={{ color: 'var(--maw-fg)', fontSize: 'var(--maw-text-sm)', margin: 'var(--maw-space-sm) 0 0' }}>Needs manual review ({result.review.length})</div>
              <ul style={{ paddingLeft: 'var(--maw-space-lg)', margin: 0, fontSize: 'var(--maw-text-xs)', color: 'var(--maw-fgMuted)' }}>
                {result.review.slice(0, 10).map(({ path, meta }) => <li key={path}>{path} — {meta.source}, {Math.round(meta.confidence * 100)}%</li>)}
              </ul>
            </>
          )}
        </>
      )}

      {notes.length > 0 && (
        <details style={{ marginTop: 'var(--maw-space-md)' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--maw-fgMuted)', fontSize: 'var(--maw-text-sm)' }}>{notes.length} note(s)</summary>
          <ul style={{ paddingLeft: 'var(--maw-space-lg)', margin: 0 }}>{notes.map((f) => <Finding key={f.id} finding={f} />)}</ul>
        </details>
      )}
    </Card>
  );
}
