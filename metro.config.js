const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js dist/index.mjs (resolved when app source uses ESM
// `import`) contains  import(VARIABLE)  — a dynamic import with a runtime
// expression that Hermes cannot compile.  The CJS sibling (dist/index.cjs)
// uses require() instead and works fine.  Force every resolver request for
// the supabase root package to land on the CJS file.
const SUPABASE_MJS = path.join(
  __dirname,
  'node_modules/@supabase/supabase-js/dist/index.mjs',
);
const SUPABASE_CJS = path.join(
  __dirname,
  'node_modules/@supabase/supabase-js/dist/index.cjs',
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect the ESM entry-point to its CJS twin so Hermes can compile it.
  if (
    moduleName === '@supabase/supabase-js' ||
    moduleName === SUPABASE_MJS
  ) {
    return { type: 'sourceFile', filePath: SUPABASE_CJS };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
