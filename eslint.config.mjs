import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  // Playwright fixtures call `use(...)`, which is not a React hook.
  { files: ["e2e/**/*.ts"], rules: { "react-hooks/rules-of-hooks": "off" } },
  { ignores: [".next/**", "node_modules/**", "drizzle/**", "docs/evidence/**", "next-env.d.ts", "openapi.json"] },
];

export default config;
