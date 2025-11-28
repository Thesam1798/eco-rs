import '@analogjs/vitest-angular/setup-zone';

// Mock Tauri API for tests
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));
