import { readFile } from 'node:fs/promises';

const [appSource, routeSource, htmlSource, manifestSource] = await Promise.all([
  readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/routes/theoryRoutes.jsx', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'),
]);

const failures = [];
if (!appSource.includes('AppRoutes') || !routeSource.includes("import('@/pages/CreateCourse')")) failures.push('Route shell is missing');
if (!htmlSource.includes('<title>Black Fighters') && !htmlSource.includes('<title>IIIAK')) failures.push('index.html does not identify Black Fighters');

let manifest;
try {
  manifest = JSON.parse(manifestSource);
} catch {
  failures.push('manifest.webmanifest is not valid JSON');
}
if (manifest && !String(manifest.name || '').includes('Black Fighters') && !String(manifest.name || '').includes('IIIAK')) failures.push('manifest does not identify Black Fighters');

if (failures.length) {
  console.error(`App identity verification failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('App identity verified: Black Fighters');
