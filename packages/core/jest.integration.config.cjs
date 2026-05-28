module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__/integration', '<rootDir>/__tests__/e2e'],
  testMatch: [
    '**/__tests__/integration/**/*.test.ts',
    '**/__tests__/e2e/**/*.test.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage-integration',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@agentstack/sdk$': '<rootDir>/src/index.ts',
  },
  testTimeout: 60000, // Longer timeout for integration tests
  maxWorkers: 1, // Run integration tests sequentially
  verbose: true, // Show detailed test output
};
