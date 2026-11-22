import { writeFileSync } from 'node:fs';
// Persist only public build metadata. Credentials remain runtime secrets.
const context = Object.fromEntries(['CONTEXT','DEPLOY_PRIME_URL','REVIEW_ID','DEPLOY_ID'].map(key => [key, process.env[key] || '']));
writeFileSync(new URL('../server/checkout/build-context.mjs', import.meta.url), `export default ${JSON.stringify(context)};\n`);
