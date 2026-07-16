import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/modules/*/service*",
                "@/modules/*/actions*",
                "@/modules/*/aggregator*",
                "@/modules/*/route*",
              ],
              message:
                "Import hanya lewat public API module (@/modules/<name>). Gunakan relative import bila berada di dalam module yang sama.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/api/**/route.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
