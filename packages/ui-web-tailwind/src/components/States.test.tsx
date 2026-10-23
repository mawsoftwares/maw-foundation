import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { PageLoader } from './PageLoader';
import { SearchBar } from './SearchBar';

const noop = (): void => undefined;

describe('SearchBar', () => {
  it('shows the clear button only when there is text', () => {
    expect(renderToStaticMarkup(createElement(SearchBar, { value: '', onChange: noop }))).not.toContain('Clear search');
    expect(renderToStaticMarkup(createElement(SearchBar, { value: 'abc', onChange: noop }))).toContain('Clear search');
  });

  it('gives the input an accessible name from the placeholder', () => {
    const html = renderToStaticMarkup(createElement(SearchBar, { value: '', onChange: noop, placeholder: 'Find orders' }));
    expect(html).toContain('aria-label="Find orders"');
    expect(html).toContain('placeholder="Find orders"');
  });

  it('shows a spinner while loading', () => {
    expect(renderToStaticMarkup(createElement(SearchBar, { value: '', onChange: noop, loading: true }))).toContain('role="status"');
    expect(renderToStaticMarkup(createElement(SearchBar, { value: '', onChange: noop }))).not.toContain('role="status"');
  });
});

describe('ErrorState', () => {
  it('is announced as an alert and offers retry only when given a handler', () => {
    const withRetry = renderToStaticMarkup(createElement(ErrorState, { title: 'Failed to load', message: 'Boom', retry: noop }));
    expect(withRetry).toContain('role="alert"');
    expect(withRetry).toContain('Failed to load');
    expect(withRetry).toContain('Boom');
    expect(withRetry).toContain('Try again');
    expect(renderToStaticMarkup(createElement(ErrorState, {}))).not.toContain('Try again');
  });
});

describe('EmptyState', () => {
  it('defaults to the inbox emoji and title, and renders message and action when given', () => {
    const html = renderToStaticMarkup(createElement(EmptyState, { message: 'Add one', action: createElement('button', null, 'Create') }));
    expect(html).toContain('📭');
    expect(html).toContain('Nothing here yet');
    expect(html).toContain('Add one');
    expect(html).toContain('Create');
  });

  it('resolves kit icon names to an svg instead of printing the name', () => {
    const html = renderToStaticMarkup(createElement(EmptyState, { icon: 'users' }));
    expect(html).toContain('<svg');
    expect(html).not.toContain('>users<');
  });
});

describe('PageLoader', () => {
  it('renders a status spinner and the message', () => {
    const html = renderToStaticMarkup(createElement(PageLoader, { message: 'Loading bills...' }));
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading bills...');
    expect(renderToStaticMarkup(createElement(PageLoader, {}))).not.toContain('aria-live');
  });
});
