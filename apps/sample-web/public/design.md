---
version: alpha
name: Evreghen Command Center
description: "Warm off-white security workspace with a dark frosted application shell and orange telemetry accents."
colors:
  background: "#fcfaf7"
  on-background: "#423d38"
  surface: "#f3f4f6"
  surface-soft: "#edebe9"
  surface-elevated: "#ffffff"
  on-surface: "#423d38"
  on-surface-muted: "#797067"
  outline: "#e3e0dd"
  outline-strong: "#d1d5dc"
  primary: "#fe6e00"
  primary-strong: "#ff6b00"
  primary-warm: "#ffb74d"
  primary-focus: "#f97015"
  on-primary: "#ffffff"
  shell-base: "#000000"
  on-shell: "#ffffff"
  shell-border: "#ffffff"
  success: "#00c758"
  warning: "#edb200"
  danger: "#fb2c36"
  info: "#3080ff"
  status-mock-bg: "#fef9c2"
  status-mock-fg: "#874b00"
  status-planned-bg: "#f3f4f6"
  status-planned-fg: "#364153"
  status-development-bg: "#dbeafe"
  status-development-fg: "#1447e6"
  status-integrated-bg: "#f3e8ff"
  status-integrated-fg: "#8200da"
  status-production-bg: "#dcfce7"
  status-production-fg: "#016630"
  dark-background: "#413830"
  dark-surface: "#4a423a"
  dark-on-surface: "#fafaf9"
  dark-on-surface-muted: "#b9b3ac"
typography:
  display-hero:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "6rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline-xl:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: "2.5rem"
    letterSpacing: "-0.025em"
  headline-lg:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  title-md:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  body-lg:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  body-md:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  body-sm:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: "1rem"
  label-md:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  label-sm:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.05em"
  code-sm:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "40px"
  "4xl": "64px"
  container-padding: "32px"
layout:
  container-max: "1400px"
  shell-header-height: "64px"
  shell-sidebar-expanded: "256px"
  shell-sidebar-collapsed: "64px"
motion:
  fast: "150ms"
  normal: "200ms"
  slow: "300ms"
  panel: "500ms"
  easing-standard: "cubic-bezier(0.4, 0, 0.2, 1)"
elevation:
  shell-blur: "12px"
  shell-opacity: "0.70"
  shell-border-opacity: "0.10"
  chart-fill-opacity: "0.60"
shadows:
  subtle: "0 1px 3px rgba(0, 0, 0, 0.10), 0 1px 2px rgba(0, 0, 0, 0.06)"
  raised: "0 4px 12px rgba(0, 0, 0, 0.12)"
  dialog: "0 20px 25px rgba(0, 0, 0, 0.10), 0 8px 10px rgba(0, 0, 0, 0.04)"
components:
  shell-sidebar:
    backgroundColor: "rgba(0, 0, 0, 0.70)"
    textColor: "{colors.on-shell}"
    rounded: "0px"
    width: "{layout.shell-sidebar-expanded}"
    padding: "{spacing.lg}"
  shell-header:
    backgroundColor: "rgba(0, 0, 0, 0.70)"
    textColor: "{colors.on-shell}"
    rounded: "0px"
    height: "{layout.shell-header-height}"
    padding: "0 16px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "rgba(255, 255, 255, 0.70)"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  nav-item-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 16px"
---

# Evreghen Command Center

Select this file from Theme Designer (Super Admin → Theme Designer) to apply the
warm off-white workspace, orange action color, and dark frosted shell.

YAML frontmatter is the preferred format. A simple list still works for a few
tokens, for example Primary Color, Font Family, and Border Radius.