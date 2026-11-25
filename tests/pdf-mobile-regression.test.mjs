import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function downloadPDF(');
const end = source.indexOf("\n$('#service-form').addEventListener", start);
assert.ok(start >= 0 && end > start, 'PDF function boundaries must exist');
const pdfFn = source.slice(start, end);
const pageCutFnStart = source.indexOf('function getPdfPageCuts(');
const pageCutFnEnd = source.indexOf('\nasync function downloadPDF(', pageCutFnStart);
assert.ok(pageCutFnStart >= 0 && pageCutFnEnd > pageCutFnStart, 'page cut function boundaries must exist');
const pageCutFn = source.slice(pageCutFnStart, pageCutFnEnd);

test('PDF renders bounded A4 slices, never one document-sized canvas', () => {
  assert.match(pdfFn, /for\s*\(let page=0;page<totalPages;page\+\+\)/);
  assert.match(pdfFn, /x:0,y:pageTop,width:cssWidth,height:pageHeight/);
  assert.match(pdfFn, /windowHeight:cssPageHeight/);
  assert.doesNotMatch(pdfFn, /fullCanvas/);
  assert.doesNotMatch(pdfFn, /height:fullHeight/);
});

test('page cuts reserve a safety band and use text line boundaries without stretching', () => {
  assert.match(source, /function getPdfPageCuts\(doc,safePageHeight,fullHeight,maxPageHeight=1123\)/);
  assert.match(pageCutFn, /range\.getClientRects\(\)/);
  assert.match(pageCutFn, /target-edge<=42/);
  assert.match(pdfFn, /safeContentHeight=1040/);
  assert.match(pdfFn, /const pageHeight=pageCuts\[page\+1\]-pageTop/);
  assert.match(pdfFn, /const imageHeightMm=pageHeight\*\(210\/cssWidth\)/);
  assert.match(pdfFn, /pdf\.addImage\(renderedCanvas,'JPEG',0,0,210,imageHeightMm/);
  assert.match(pdfFn, /const mmY=210\/cssWidth/);
  assert.doesNotMatch(pdfFn, /renderedCanvas\.toDataURL/);
});

test('PDF canvas is passed directly to jsPDF and temporary canvases are released', () => {
  assert.match(pdfFn, /pdf\.addImage\(renderedCanvas,'JPEG'/);
  assert.doesNotMatch(pdfFn, /renderedCanvas\.toDataURL/);
  assert.match(pdfFn, /renderedCanvas\.width=0/);
  assert.match(pdfFn, /renderedCanvas\.height=0/);
  assert.match(pdfFn, /finally\s*\{[\s\S]*?holder\.remove\(\)/);
});

test('PDF opens a user-triggered viewer tab and never auto-downloads', () => {
  assert.match(source, /function preparePdfOutputWindow\(\)/);
  assert.match(source, /window\.open\('about:blank','_blank'\)/);
  assert.match(pdfFn, /pdf\.output\('blob'\)/);
  assert.match(pdfFn, /outputWindow\.location\.replace\(blobUrl\)/);
  assert.match(pdfFn, /outputWindow\?\.close\(\)/);
  assert.doesNotMatch(pdfFn, /link\.download=filename/);
  assert.doesNotMatch(pdfFn, /link\.click\(\)/);
  assert.match(source, /downloadPDF\(buildServicePDF\(\),[\s\S]*?outputWindow\)/);
  assert.match(source, /downloadPDF\(buildEdilePDF\(\),[\s\S]*?outputWindow\)/);
});

test('company website links are present in PDF header and footer', () => {
  assert.match(source, /impresaedileabilart\.com/);
  assert.match(source, /idraulicoservizi[.]it/);
  assert.match(source, /data-pdf-link="site1"/);
  assert.match(source, /data-pdf-link="site2"/);
});

test('PDF content wraps safely without font compression or stretched images', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.pdf-flow-document img\{[\s\S]*?height:auto/);
  assert.match(css, /\.pdf-description-content,[\s\S]*?overflow-wrap:anywhere/);
  assert.match(css, /\.pdf-flow-body table\{[\s\S]*?width:100%/);
  assert.match(css, /\.pdf-flow-body \.pdf-signature img\{[\s\S]*?max-width:100%/);
});


test('quote issue date is distinct from planned intervention date and validity is calendar-based', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Data emissione preventivo/);
  assert.match(html, /id="s-work-date"/);
  assert.match(html, /id="e-work-date"/);
  assert.match(html, /type="number" min="1" max="365" step="1" value="15"/);
  const helpersSource = source.slice(source.indexOf('function dateIT('), source.indexOf('function escapeHtml('));
  const helpers = new Function(helpersSource + '; return { addDaysISO, validityText };')();
  assert.equal(helpers.addDaysISO('2026-11-25', 15), '2026-12-10');
  assert.equal(helpers.validityText('15', '2026-11-25'), '15 giorni dalla data di emissione (scadenza 10/12/2026)');
});

test('commercial validation is wired to both forms and prevents inconsistent totals', () => {
  assert.match(source, /function quoteBusinessCheck\(form\)/);
  assert.match(source, /subtotale lavorazioni/i);
  assert.match(source, /L’acconto non può superare il totale/);
  assert.equal((source.match(/quoteBusinessCheck\(e\.currentTarget\)/g) || []).length, 2);
  assert.match(source, /pattern=\/\^-\?\(\?:\\d\+/);
});

test('contract wording does not mislabel an image signature as a digital signature', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /foro previsto dalla normativa a sua tutela/);
  assert.match(html, /lavorazioni non previste non sono comprese/);
  assert.match(html, /informativa privacy completa è resa separatamente/);
  assert.doesNotMatch(source, /Documento firmato digitalmente/);
  assert.doesNotMatch(source, /approvato specificamente le clausole contenute nel presente documento/);
});
