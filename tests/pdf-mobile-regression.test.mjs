import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function downloadPDF(');
const end = source.indexOf("\n$('#service-form').addEventListener", start);
assert.ok(start >= 0 && end > start, 'PDF function boundaries must exist');
const pdfFn = source.slice(start, end);

test('PDF uses native jsPDF text/vector layout, not page screenshots', () => {
  assert.match(pdfFn, /new window\.jspdf\.jsPDF/);
  assert.match(pdfFn, /pdfNativeWalk\(p,root\.querySelector\('\.pdf-flow-body'\)/);
  assert.match(source, /function pdfNativeTable\(/);
  assert.doesNotMatch(source, /html2canvas/);
  assert.doesNotMatch(pdfFn, /addImage\(renderedCanvas/);
  assert.doesNotMatch(pdfFn, /createElement\('canvas'\)/);
});

test('PDF downloads directly after compilation without an intermediate viewer tab', () => {
  assert.match(pdfFn, /p\.save\(filename\)/);
  assert.doesNotMatch(source, /preparePdfOutputWindow/);
  assert.doesNotMatch(source, /window\.open\('about:blank'/);
  assert.doesNotMatch(pdfFn, /pdf\.output\('blob'\)/);
  assert.match(source, /downloadPDF\(buildServicePDF\(\),[\s\S]*?\.pdf'\)\)/);
  assert.match(source, /downloadPDF\(buildEdilePDF\(\),[\s\S]*?\.pdf'\)\)/);
});

test('native renderer paginates content, tables and page footer safely', () => {
  assert.match(source, /function pdfNativeHeader\(/);
  assert.match(source, /function pdfNativeFooter\(/);
  assert.match(source, /function pdfNativeTable\(/);
  assert.match(source, /state\.y\+height>267/);
  assert.match(source, /Pagina '\+i/);
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
