// Two projects: unit tests run without a database, integration tests need PostgreSQL.
// Run one of them with `npm run test:unit` or `npm run test:integration`.
export default {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      // Runs once before all integration tests: safety check + migrations
      globalSetup: '<rootDir>/tests/integration/globalSetup.js',
    },
  ],
};
