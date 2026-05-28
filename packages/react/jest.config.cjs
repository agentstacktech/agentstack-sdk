module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: [
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).tsx',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.tsx'],
  moduleNameMapper: {
    '^@agentstack/sdk$': '<rootDir>/../core/src/index.ts',
    '^@agentstack/react$': '<rootDir>/src/index.ts',
    // Same as core Jest: avoid pulling `import.meta` from real lightbox into jsdom tests.
    '^.*/media/lightbox\\.ts$': '<rootDir>/../core/__tests__/mocks/lightboxMock.ts',
  },
  testTimeout: 10000,
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  },
};
