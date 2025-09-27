import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Enforce using the centralized env loader instead of raw process.env
  { ignores: ["scripts/**"] },
  {
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Use clientEnv/serverEnv from lib/env instead of process.env" },
      ],
    },
  },
  // Allow process.env only in the env loader itself and next config
  {
    files: ["lib/env.ts", "next.config.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
];

export default eslintConfig;
