import { describe, expect, it } from 'vitest';
import { AnalyticsEvent, BlogPost, ContentPage } from '../src/models/cms.js';

describe('CMS and reporting models', () => {
  it('requires page identity and content', () => {
    const page = new ContentPage({});
    const errors = page.validateSync()?.errors;

    expect(errors?.['slug']).toBeDefined();
    expect(errors?.['title']).toBeDefined();
    expect(errors?.['body']).toBeDefined();
  });

  it('defaults blog posts to draft', () => {
    const post = new BlogPost({});

    expect(post.status).toBe('DRAFT');
  });

  it('requires analytics event name, path, and occurrence time', () => {
    const event = new AnalyticsEvent({});
    const errors = event.validateSync()?.errors;

    expect(errors?.['name']).toBeDefined();
    expect(errors?.['path']).toBeDefined();
    expect(errors?.['occurredAt']).toBeDefined();
  });
});
