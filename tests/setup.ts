/**
 * Jest Test Setup
 * 
 * This file runs before each test file
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Increase timeout for integration tests
jest.setTimeout(10000);

// Clean up after all tests
afterAll(() => {
  // Close any open handles
});

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
