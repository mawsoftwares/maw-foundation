import { describe, it, expect } from 'vitest';
import { componentStateCss, createTheme, parseDesignMarkdown, tokensToCssVars, type ComponentStateSpec } from '../index';

const DESIGN = `---
name: Test
colors:
  primary: "#0a7a5a"
components:
  button-primary:
    backgroundColor: "#0a7a5a"
  button-primary-hover:
    backgroundColor: "#086148"
  input-focus:
    borderColor: "#0a7a5a"
  input-error:
    borderColor: "#b91c1c"
  table-row-hover:
    backgroundColor: "#eef"
---
`;

describe('componentStateCss', () => {
  it('emits nothing when the theme defines no state tokens', () => {
    expect(componentStateCss(tokensToCssVars(false, createTheme()))).toBe('');
  });

  it('turns design.md state components into state rules end to end', () => {
    const { overrides } = parseDesignMarkdown(DESIGN);
    const css = componentStateCss(tokensToCssVars(false, createTheme(overrides)));
    expect(css).toContain('.maw-btn--primary:hover:not(:disabled){background:var(--maw-comp-buttons-primary-hover-background) !important;}');
    expect(css).toContain('.maw-input:focus{border-color:var(--maw-comp-inputs-focus-border-color) !important;}');
    expect(css).toContain('.maw-input.maw-input--error{border-color:var(--maw-comp-inputs-error-border-color) !important;}');
    expect(css).not.toContain('.maw-btn--secondary');
  });

  it('table state tokens use the same family naming the table reads', () => {
    const { overrides } = parseDesignMarkdown(DESIGN);
    expect(tokensToCssVars(false, createTheme(overrides))['--maw-comp-tables-row-hover-background']).toBe('#eef');
  });

  it('supports specs for components the engine has never heard of', () => {
    const spec: ComponentStateSpec = {
      family: 'chips', variant: '', selector: '.maw-chip',
      states: { hover: ':hover' },
      props: [{ token: 'background', cssProp: 'background' }],
    };
    const css = componentStateCss({ '--maw-comp-chips-hover-background': '#fff' }, [spec]);
    expect(css).toBe('.maw-chip:hover{background:var(--maw-comp-chips-hover-background) !important;}');
  });
});
