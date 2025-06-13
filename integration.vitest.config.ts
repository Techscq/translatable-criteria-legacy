import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    //  For Browser Testing
    environment: 'node',
    // For unit tests (use 'node')
    // environment: 'node',

    // Define your root directory for the integration tests

    globals: true,
    //exclude: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    include: ['src/**/*.{int.test,int.spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Include specific files or directories
    /*include: ['**!/!*.int.test.ts'],

    // Exclude files or directories
    exclude: ['**!/node_modules/!**'],*/

    // Other test runner options
    // testTimeout: 10000, // Example: Set timeout to 10 seconds

    // Configure coverage reporting
    coverage: {
      // Coverage reports
      provider: 'v8',
      //  Include files for coverage reporting.
      include: ['src/**/*'],
      //  Exclude files from coverage reporting
      exclude: ['node_modules', 'dist', 'coverage'],
      reporter: ['text', 'html'], // Example reporters
      // reportsDirectory: './coverage/integration', //  Optional: Specify coverage report directory
    },
  },
});
