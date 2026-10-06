import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Publish site content only: source documents, tooling and Git metadata stay out.
const pages = (await readdir(root)).filter((name) => name.endsWith('.html'));
const paths = [
  ...pages,
  'css', 'js', 'tokens', 'public/assets', 'documents', 'nieuws',
  'content/nieuws/berichten.json',
];

for (const path of paths) {
  await cp(join(root, path), join(output, path), {
    recursive: true,
    filter: (source) => !basename(source).startsWith('.') && !source.endsWith('.md'),
  });
}

console.log('Static website built in dist/');
