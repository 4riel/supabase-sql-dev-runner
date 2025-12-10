import { vi } from 'vitest';

// Store for tracking mock client instances
export const mockClientInstances: ReturnType<typeof createMockPgClient>[] = [];

// Factory function to create mock pg client
export function createMockPgClient() {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
  mockClientInstances.push(mockClient);
  return mockClient;
}

// Clear instances between tests
export function clearMockInstances(): void {
  mockClientInstances.length = 0;
}

// Get the last created mock instance
export function getLastMockClient() {
  return mockClientInstances[mockClientInstances.length - 1];
}

// Global mock for pg module using class wrapped in vi.fn()
vi.mock('pg', () => {
  // Create a class that gets registered when instantiated
  const MockClientClass = vi.fn().mockImplementation(function(this: ReturnType<typeof createMockPgClient>) {
    this.connect = vi.fn().mockResolvedValue(undefined);
    this.end = vi.fn().mockResolvedValue(undefined);
    this.query = vi.fn().mockResolvedValue({ rows: [] });
    this.on = vi.fn();
    this.removeListener = vi.fn();

    // Access the array via globalThis
    const instances = (globalThis as Record<string, unknown>).__mockClientInstances as typeof mockClientInstances;
    if (instances) {
      instances.push(this);
    }

    return this;
  });

  return {
    Client: MockClientClass,
  };
});

// Make instances globally accessible for the mock
(globalThis as Record<string, unknown>).__mockClientInstances = mockClientInstances;
