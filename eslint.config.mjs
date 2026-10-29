import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts", "openapi.json", "e2e/report/**", "e2e/results/**"] },
  // Playwright fixtures receive a `use` callback that is not a React hook.
  { files: ["e2e/**/*.ts"], rules: { "react-hooks/rules-of-hooks": "off" } },
];

export default config;
