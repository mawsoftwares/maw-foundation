import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTheme, tokensToCssVars } from '../index';
import { normalizeDesignMarkdown, parseDesignMarkdown } from '../design-md';

const SPEC = `---
version: alpha
name: Spec Sample
description: "A full design file."
colors:
  primary: "#fe6e00"
  on-primary: "#ffffff"
  background: "#fcfaf7"
  status-mock-bg: "#fef9c2"
  status-mock-fg: "#874b00"
typography:
  display-hero:
    fontFamily: "Inter, sans-serif"
    fontSize: "6rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
spacing:
  md: "12px"
  container-padding: "32px"
  4xl: "64px"
layout:
  container-max: "1400px"
  shell-header-height: "64px"
motion:
  fast: "150ms"
  panel: "500ms"
  easing-standard: "cubic-bezier(0.4, 0, 0.2, 1)"
elevation:
  shell-blur: "12px"
  chart-fill-opacity: "0.60"
rounded:
  md: "8px"
  sm: "6px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
---

## Overview

Warm and calm.

## Do's and Don'ts

- Do use primary only for actions.
- Don't mix rounded and square corners.
`;

describe('design.md — every section is captured', () => {
  const parsed = parseDesignMarkdown(SPEC);

  it('captures the type scale with size, weight, line-height and tracking', () => {
    expect(parsed.overrides.typography?.scale?.['display-hero']).toEqual({
      family: 'Inter, sans-serif', size: '6rem', weight: '600', lineHeight: '1', letterSpacing: '-0.025em',
    });
    expect(Object.keys(parsed.overrides.typography?.scale ?? {})).not.toContain('color');
  });

  it('captures components with token references resolved', () => {
    expect(parsed.overrides.components?.['button-primary']).toMatchObject({
      backgroundColor: '#fe6e00', textColor: '#ffffff', rounded: '6px', height: '40px', typography: 'body-md',
    });
  });

  it('keeps layout, extra spacing, motion, elevation and status colors', () => {
    expect(parsed.overrides.extraTokens).toMatchObject({
      'layout-container-max': '1400px',
      'layout-shell-header-height': '64px',
      'space-container-padding': '32px',
      'space-4xl': '64px',
      'motion-panel': '500ms',
      'elevation-chart-fill-opacity': '0.6',
      'color-status-mock-bg': '#fef9c2',
      'color-status-mock-fg': '#874b00',
    });
  });

  it('keeps the name, description and prose sections', () => {
    expect(parsed.name).toBe('Spec Sample');
    expect(parsed.description).toBe('A full design file.');
    expect(parsed.sections.map((s) => s.heading)).toEqual(['Overview', "Do's and Don'ts"]);
    expect(parsed.sections[1]?.content).toContain("Don't mix rounded");
  });

  it('warns about sections outside the spec', () => {
    const r = parseDesignMarkdown('---\nname: X\ncolors:\n  primary: "#123456"\nfoo:\n  a: b\n---');
    expect(r.warnings.some((w) => w.includes('"foo"'))).toBe(true);
  });

  it('round-trips through the canonical form without losing anything', () => {
    const { canonical, overrides, sections, description } = normalizeDesignMarkdown(SPEC);
    const again = parseDesignMarkdown(canonical);
    expect(again.overrides.typography?.scale?.['display-hero']).toEqual(overrides.typography?.scale?.['display-hero']);
    expect(again.overrides.components?.['button-primary']).toEqual(overrides.components?.['button-primary']);
    expect(again.overrides.extraTokens).toEqual(overrides.extraTokens);
    expect(again.sections).toEqual(sections);
    expect(again.description).toBe(description);
  });

  it('emits CSS variables the UI kit consumes', () => {
    const vars = tokensToCssVars(false, createTheme(parsed.overrides));
    expect(vars['--maw-text-display-hero-size']).toBe('6rem');
    expect(vars['--maw-text-hero-size']).toBe('6rem');
    expect(vars['--maw-text-hero-ls']).toBe('-0.025em');
    expect(vars['--maw-text-body-size']).toBe('0.875rem');
    expect(vars['--maw-layout-container-max']).toBe('1400px');
    expect(vars['--maw-color-status-mock-bg']).toBe('#fef9c2');
    expect(vars['--maw-comp-button-primary-backgroundColor']).toBe('#fe6e00');
    expect(vars['--maw-comp-buttons-primary-background']).toBe('#fe6e00');
    expect(vars['--maw-comp-buttons-medium-height']).toBe('40px');
    expect(vars['--maw-comp-buttons-border-radius']).toBe('6px');
  });

  it('handles the bundled sample design.md', () => {
    const file = resolve(__dirname, '../../../../apps/sample-web/public/design.md');
    const r = parseDesignMarkdown(readFileSync(file, 'utf8'));
    expect(r.warnings).toEqual([]);
    expect(Object.keys(r.overrides.typography?.scale ?? {})).toContain('headline-xl');
    expect(r.overrides.components?.['nav-item-active']).toBeDefined();
    expect(r.overrides.extraTokens?.['layout-container-max']).toBe('1400px');
    expect(r.overrides.extraTokens?.['color-status-production-fg']).toBe('#016630');
    expect(r.sections.length).toBeGreaterThan(0);
  });

  describe('component variable mapping', () => {
    const vars = tokensToCssVars(false, createTheme(parseDesignMarkdown(`---
name: Map
colors:
  primary: "#112233"
  on-primary: "#ffffff"
typography:
  body-sm:
    fontFamily: "Inter"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: "1rem"
components:
  input:
    backgroundColor: "#ffffff"
    rounded: "6px"
    padding: "0 12px"
    height: "40px"
  dialog:
    backgroundColor: "#fafafa"
    rounded: "12px"
  badge-success:
    backgroundColor: "#dcfce7"
    textColor: "#016630"
    typography: "{typography.body-sm}"
  tab-active:
    textColor: "#112233"
  dropdown:
    rounded: "4px"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    rounded: "8px"
---`).overrides));

    it('maps singular design names to the UI kit families', () => {
      expect(vars['--maw-comp-inputs-background']).toBe('#ffffff');
      expect(vars['--maw-comp-inputs-border-radius']).toBe('6px');
      expect(vars['--maw-comp-inputs-height']).toBe('40px');
      expect(vars['--maw-comp-modals-background']).toBe('#fafafa');
      expect(vars['--maw-comp-modals-border-radius']).toBe('12px');
      expect(vars['--maw-comp-menus-border-radius']).toBe('4px');
      expect(vars['--maw-comp-tabs-active-text-color']).toBe('#112233');
    });

    it('expands a typography reference into font properties', () => {
      expect(vars['--maw-comp-badges-success-background']).toBe('#dcfce7');
      expect(vars['--maw-comp-badges-success-font-size']).toBe('0.8125rem');
      expect(vars['--maw-comp-badges-success-font-weight']).toBe('700');
    });

    it('keeps names with no UI-kit family under their own prefix', () => {
      expect(vars['--maw-comp-nav-item-active-background']).toBe('#112233');
      expect(vars['--maw-comp-nav-item-active-border-radius']).toBe('8px');
    });
  });
});
