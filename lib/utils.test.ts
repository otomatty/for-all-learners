import { describe, it, expect } from 'vitest';
import { parseAdminInquiriesSearchParams } from './utils';

describe('parseAdminInquiriesSearchParams', () => {
  it('should return default values when no parameters are provided', () => {
    const result = parseAdminInquiriesSearchParams(new URLSearchParams());
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('created_at');
    expect(result.sortOrder).toBe('desc');
    expect(result.status).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.categoryId).toBeUndefined();
    expect(result.searchQuery).toBeUndefined();
  });

  it('should return default values when searchParams is an empty object', () => {
    const result = parseAdminInquiriesSearchParams({} as any); // Cast to any to simulate empty object
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('created_at');
    expect(result.sortOrder).toBe('desc');
    expect(result.status).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.categoryId).toBeUndefined();
    expect(result.searchQuery).toBeUndefined();
  });

  it('should return default values when searchParams is undefined', () => {
    const result = parseAdminInquiriesSearchParams(undefined as any); // Cast to any to simulate undefined
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('created_at');
    expect(result.sortOrder).toBe('desc');
    expect(result.status).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.categoryId).toBeUndefined();
    expect(result.searchQuery).toBeUndefined();
  });

  it('should return provided parameters when they are valid', () => {
    const params = new URLSearchParams({
      page: '2',
      limit: '10',
      sortBy: 'subject',
      sortOrder: 'asc',
      status: 'open',
      priority: 'high',
      categoryId: 'some-category-id',
      searchQuery: 'test query',
    });
    const result = parseAdminInquiriesSearchParams(params);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.sortBy).toBe('subject');
    expect(result.sortOrder).toBe('asc');
    expect(result.status).toBe('open');
    expect(result.priority).toBe('high');
    expect(result.categoryId).toBe('some-category-id');
    expect(result.searchQuery).toBe('test query');
  });

  it('should sanitize invalid parameters or use defaults', () => {
    const params = new URLSearchParams({
      page: '-1',
      limit: '0',
      sortBy: 'invalid_key',
      sortOrder: 'invalid_order',
      status: 'invalid_status',
      priority: 'invalid_priority',
    });
    const result = parseAdminInquiriesSearchParams(params);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe('created_at');
    expect(result.sortOrder).toBe('desc');
    expect(result.status).toBeUndefined();
    expect(result.priority).toBeUndefined();
  });

  it('should handle mixed valid and invalid parameters', () => {
    const params = new URLSearchParams({
      page: '3',
      limit: '-5', // invalid
      sortBy: 'status',
      sortOrder: 'wrong_order', // invalid
      status: 'closed',
      priority: 'super_high', // invalid
      categoryId: 'another-id',
      searchQuery: 'another query',
    });
    const result = parseAdminInquiriesSearchParams(params);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20); // default
    expect(result.sortBy).toBe('status');
    expect(result.sortOrder).toBe('desc'); // default
    expect(result.status).toBe('closed');
    expect(result.priority).toBeUndefined(); // default
    expect(result.categoryId).toBe('another-id');
    expect(result.searchQuery).toBe('another query');
  });
});
