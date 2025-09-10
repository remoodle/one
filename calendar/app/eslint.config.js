import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,

  {
    rules: {
      curly: ["error", "all"],
      "max-depth": ["error", 6],
      "max-nested-callbacks": ["error", 7],
      "max-params": ["error", 7],
      "max-statements-per-line": ["error", { max: 1 }],
      "no-case-declarations": "off",
    },
  },

  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },

  {
    plugins: {
      onlyWarn,
    },
  },

  {
    ignores: ["dist/**"],
  },
];
