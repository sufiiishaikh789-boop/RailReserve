// node-sqlite-proxy.cjs — CJS proxy for node:sqlite
// Used by vitest.config.ts to redirect Vite's aliased 'sqlite' bare import
// to the actual node:sqlite built-in. CJS require() can resolve node: builtins.
// This proxy is never bundled — it's loaded by Node.js directly at test runtime.
const nodeSqlite = require('node:sqlite');
module.exports = nodeSqlite;

