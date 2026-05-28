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
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@agentstack/sdk$': '<rootDir>/src/index.ts',
    '^.*/media/lightbox\\.ts$': '<rootDir>/__tests__/mocks/lightboxMock.ts',
    '.*[/\\\\]src[/\\\\]media[/\\\\]audio[/\\\\]worklet-url\\.ts$': '<rootDir>/__tests__/mocks/worklet-url.ts',
  },
  testTimeout: 10000,
};
