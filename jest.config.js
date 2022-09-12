module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/functions'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        sourceMaps: true,
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
};
