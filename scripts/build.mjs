// Builds dist/olmapkit.js (readable) and dist/olmapkit.min.js as a global `OLMapKit` (IIFE).
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const banner = `/*! OLMapKit ${pkg.version} | MIT | Henrique Silva, Axians Low Code | https://github.com/henriquefps/olmapkit */`;
const common = {
    entryPoints: ['src/index.js'],
    bundle: true,
    format: 'iife',
    globalName: 'OLMapKit',
    target: ['es2018'],
    banner: { js: banner },
    define: { __VERSION__: JSON.stringify(pkg.version) },
    legalComments: 'none',
    logLevel: 'info'
};

const watch = process.argv.includes('--watch');
await build({ ...common, outfile: 'dist/olmapkit.js', sourcemap: false });
await build({ ...common, outfile: 'dist/olmapkit.min.js', minify: true, sourcemap: true });
if (watch) {
    const { context } = await import('esbuild');
    const ctx = await context({ ...common, outfile: 'dist/olmapkit.js' });
    await ctx.watch();
    console.log('watching…');
}
