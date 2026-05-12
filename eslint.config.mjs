import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: ["tmp_*", "tmp_*/**"]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;
