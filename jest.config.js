module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/functions'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': '@swc/jest',
  },
};
