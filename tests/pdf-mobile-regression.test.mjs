import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const renderer = await readFile(new URL('../pdf-renderer.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('PDF generation uses local native layout renderer, not page screenshots', () => {
  assert.match(app, /window\.AbilartPDFRenderer\?\.render/);
  assert.match(renderer, /new window\.jspdf\.jsPDF/);
  assert.match(renderer, /p\.text\(/);
  assert.match(renderer, /p\.roundedRect\(/);
  assert.doesNotMatch(app + renderer + html, /html2canvas/);
  assert.doesNotMatch(renderer, /canvas\.toDataURL|addImage\(renderedCanvas/);
});

test('PDF engine and company logo are local assets on GitHub Pages', () => {
  assert.match(html, /src="vendor\/jspdf\.umd\.min\.js"/);
  assert.match(html, /src="pdf-renderer\.js"/);
  assert.match(renderer, /assets\/abilart-logo\.png/);
  assert.match(renderer, /fetch\(url\)/);
  assert.doesNotMatch(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf/);
});

test('PDF invokes direct device download without opening a viewer popup', () => {
  assert.match(app, /pdf\.save\(filename\)/);
  assert.doesNotMatch(app, /preparePdfOutputWindow|window\.open\('about:blank'/);
  assert.ok(app.includes('downloadPDF(buildServicePDF()'));
  assert.ok(app.includes('downloadPDF(buildEdilePDF()'));
});

test('renderer restores brand header, page counter, economic panel and signature', () => {
  assert.match(renderer, /ABILART SRLS/);
  assert.match(renderer, /DOCUMENTO NUMERO/);
  assert.match(renderer, /Pagina '\+i/);
  assert.match(renderer, /function renderEconomy/);
  assert.match(renderer, /function renderSignatures/);
  assert.match(renderer, /function renderTerms/);
  assert.match(renderer, /function renderTable/);
});

test('rich text preserves bold, italic, underline and ordered/unordered lists', () => {
  assert.match(renderer, /tag==='strong'\|\|tag==='b'/);
  assert.match(renderer, /tag==='em'\|\|tag==='i'/);
  assert.match(renderer, /tag==='u'/);
  assert.match(renderer, /tag==='ul'\|\|tag==='ol'/);
  assert.match(renderer, /p\.circle\(/);
});

test('native renderer paginates content and uses A4 dimensions', () => {
  assert.match(renderer, /format:'a4'/);
  assert.match(renderer, /function ensure\(h,keep=0\)/);
  assert.match(renderer, /function newPage\(\)/);
  assert.match(renderer, /function footer\(\)/);
});

test('both quote forms still call the direct PDF download flow', () => {
  assert.equal((app.match(/downloadPDF\(buildServicePDF\(\)/g)||[]).length,1);
  assert.equal((app.match(/downloadPDF\(buildEdilePDF\(\)/g)||[]).length,1);
});

test('long rich-text lines are split safely and paginated before the footer', () => {
  assert.match(renderer, /if\(y\+lineH\+2>M\.bottom\)\{newPage\(\);y=ctx\.y;base=x\+indent;\}/);
  assert.match(renderer, /if\(ww>maxW\)/);
  assert.match(renderer, /\[\.\.\.word\]/);
  assert.match(renderer, /maxW=w-indent/);
});

test('client card heights follow wrapped values instead of fixed row sizing', () => {
  assert.match(renderer, /const lines=p\.splitTextToSize\(f\.value,cw-6\)/);
  assert.match(renderer, /rows\[row\]=Math\.max/);
  assert.match(renderer, /const h=rows\.reduce/);
});

test('description panel and economic recap use measured content heights', () => {
  assert.doesNotMatch(renderer, /Math\.min\(estimated\+12,90\)/);
  assert.match(renderer, /const actual=yy-start\+2;return actual/);
  assert.match(renderer, /content-driven frame/);
});

test('work table splits oversized rows and repeats its heading on continued pages', () => {
  assert.match(renderer, /const maxLines=Math\.max/);
  assert.match(renderer, /const capacity=Math\.max/);
  assert.match(renderer, /paintRow\(\[\.\.\.header\.children\],headLines,headH,true\)/);
  assert.match(renderer, /segment=all\.map/);
});
