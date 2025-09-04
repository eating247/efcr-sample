module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.js"],
  collectCoverageFrom: [
    "server.js",
    "services/wordcounter.js",
    "!**/node_modules/**",
    "!**/coverage/**",
  ],
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 30000, // 30 seconds for API tests
  setupFilesAfterEnv: [],
  verbose: true,
};
