import { config } from "@remotion/eslint-config-flat";

// A leading underscore means "this slot is deliberately unused" — reserved
// params that callers still pass positionally. Without this the convention
// is decorative and every such param is an error.
export default [
  ...config,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];
