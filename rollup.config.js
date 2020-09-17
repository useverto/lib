// rollup.config.js
import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
import { createFilter } from "@rollup/pluginutils";
import resolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { terser } from "rollup-plugin-terser";

const filter = createFilter("**/*.gql", []);

const config = {
  input: "./src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "es",
    },
  ],
  external: [
    "*.gql",
    "fs/promises",
    "util",
    "fs",
    "path",
    "child_process",
    "assert",
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    typescript(),
    json(),
    commonjs({
      include: ["node_modules/**"],
      ignoreGlobal: false,
    }),
    resolve({
      preferBuiltins: true,
      jsnext: true,
    }),
    alias({
      "@utils": __dirname + "/src/utils",
      "@lib": __dirname + "/src/lib",
      "@queries": __dirname + "/src/queries",
    }),
    {
      name: "string",
      transform(code, id) {
        if (filter(id)) {
          return {
            code: `export default ${JSON.stringify(code)};`,
            map: { mappings: "" },
          };
        }
      },
    },
    terser({
      format: {
        comments: false,
      },
    }),
  ],
};

export default config;
