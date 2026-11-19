// Compila la presentación en un único HTML autocontenido.
//   node build.mjs          → dist/index.html (offline, doble clic) + dist/web/index.html (publicación)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'edge100', 'firefox100', 'safari15'],
  write: false,
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/styles.css', 'utf8');
const tpl = readFileSync('src/index.html', 'utf8');
const fragment = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js);

const cut = fragment.indexOf('<div id="viewport">');
const head = fragment.slice(0, cut);
const body = fragment.slice(cut);
const full = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}</head>
<body>
${body}</body>
</html>
`;
mkdirSync('dist/web', { recursive: true });
writeFileSync('dist/index.html', full);
writeFileSync('dist/web/index.html', full);
writeFileSync('dist/artifact.html', fragment);
console.log(`dist/index.html  ${(full.length / 1024).toFixed(0)} KB`);

// Guion oral en Markdown, generado desde src/content.js
const { SCRIPT, CONCLUSION } = await import('./src/content.js');
let md = '# Guion oral · EcoAccess P3 (≈ 5 minutos)\n\nJorge Alfonso Gutiérrez Thomas · Universidad Popular del Cesar — Ingeniería de Sistemas\n\n> **[ACCIÓN]** indica lo que debes activar en pantalla mientras hablas. Con la tecla **N** este mismo guion aparece dentro de la presentación.\n';
for (const s of SCRIPT) {
  md += `\n## ${s.title} (${s.time})\n`;
  s.blocks.forEach((b, i) => { md += `\n**${i + 1}. [ACCIÓN]** ${b.a}\n\n${b.s}\n`; });
}
md += `\n---\n\n**Frase de cierre:** «${CONCLUSION}»\n`;
writeFileSync('GUION_5_MINUTOS.md', md);
console.log('GUION_5_MINUTOS.md listo');
