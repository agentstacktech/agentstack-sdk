module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/integration/',
    '<rootDir>/__tests__/e2e/',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    './src/commerce/': {
      branches: 5,
      functions: 5,
      lines: 10,
      statements: 10,
    },
    './src/economy/': {
      branches: 5,
      functions: 5,
      lines: 10,
      statements: 10,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@agentstack/sdk$': '<rootDir>/src/index.ts',
    '^.*/media/lightbox\\.ts$': '<rootDir>/__tests__/mocks/lightboxMock.ts',
    '^\\./worklet-url$': '<rootDir>/__tests__/mocks/worklet-url.ts',
    '^\\./compressOffMainThread$': '<rootDir>/__tests__/mocks/compressOffMainThread.ts',
    '.*[/\\\\]src[/\\\\]media[/\\\\]audio[/\\\\]worklet-url\\.ts$': '<rootDir>/__tests__/mocks/worklet-url.ts',
    '.*[/\\\\]src[/\\\\]media[/\\\\]photo[/\\\\]compressOffMainThread\\.ts$': '<rootDir>/__tests__/mocks/compressOffMainThread.ts',
  },
  testTimeout: 10000,
};
