import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyzerService } from './analyzer.service';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('AnalyzerService', () => {
  let service: AnalyzerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyzerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have idle state initially', () => {
    expect(service.state()).toBe('idle');
  });

  it('should have no result initially', () => {
    expect(service.result()).toBeNull();
  });

  it('should have no error initially', () => {
    expect(service.error()).toBeNull();
  });

  it('should not be loading initially', () => {
    expect(service.isLoading()).toBe(false);
  });

  it('should not have result initially', () => {
    expect(service.hasResult()).toBe(false);
  });

  it('should not have error initially', () => {
    expect(service.hasError()).toBe(false);
  });

  it('should reset state correctly', () => {
    service.reset();
    expect(service.state()).toBe('idle');
    expect(service.result()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.currentUrl()).toBe('');
  });
});
