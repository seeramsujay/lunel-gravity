import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const config = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'es2020',
};

// Ensure the distribution directory exists
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

// The critical step: Copying sql-wasm.wasm and sql-wasm.js to dist/
const sqlFiles = ['sql-wasm.wasm', 'sql-wasm.js'];
for (const sqlFile of sqlFiles) {
    const searchPaths = [
        path.join('node_modules', 'sql.js', 'dist', sqlFile),
        path.join('..', 'antigravity-sdk', 'node_modules', 'sql.js', 'dist', sqlFile),
    ];
    
    let copied = false;
    for (const src of searchPaths) {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join('dist', sqlFile));
            console.log(`Successfully migrated ${sqlFile} into the distribution payload.`);
            copied = true;
            break;
        }
    }
    if (!copied) {
        // If we can't find it directly yet, we will try to handle it gracefully or report warning
        console.warn(`WARNING: ${sqlFile} could not be located in standard search paths. Ensure node_modules/sql.js exists before building.`);
    }
}

try {
    await esbuild.build(config);
    console.log("ESBuild compilation completed successfully.");
} catch (error) {
    console.error("ESBuild compilation failed:", error);
    process.exit(1);
}
