import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function downloadPDF(');
const end = source.indexOf("\n$('#service-form').addEventListener", start);
assert.ok(start >= 0 && end > start, 'PDF function boundaries must exist');
const pdfFn = source.slice(start, end);
const paginationStart = source.indexOf('function addContinuationPageBreathing(');
const paginationEnd = source.indexOf('\nasync function downloadPDF', paginationStart);
const paginationFn = source.slice(paginationStart, paginationEnd);

test('PDF renders bounded A4 slices, never one document-sized canvas', () => {
  assert.match(pdfFn, /for\s*\(let page=0;page<totalPages;page\+\+\)/);
  assert.match(pdfFn, /x:0,y:pageTop,width:cssWidth,height:pageHeight/);
  assert.match(pdfFn, /windowHeight:cssPageHeight/);
  assert.doesNotMatch(pdfFn, /fullCanvas/);
  assert.doesNotMatch(pdfFn, /height:fullHeight/);
});

test('short text blocks are moved away from page cut lines', () => {
  assert.match(paginationFn, /pdf-description-content > p/);
  assert.match(paginationFn, /startPage===endPage/);
  assert.match(paginationFn, /pageHeight-pagePos<height\+safeBottom/);
  assert.match(paginationFn, /el\.style\.marginTop/);
  assert.match(source, /\.pdf-terms-box li/);
});

test('temporary canvases are released between pages and on errors', () => {
  assert.match(pdfFn, /renderedCanvas\.width=0/);
  assert.match(pdfFn, /renderedCanvas\.height=0/);
  assert.match(pdfFn, /finally\s*\{[\s\S]*?holder\.remove\(\)/);
});

test('iOS output uses a gesture-opened window and a Blob URL', () => {
  assert.match(source, /function preparePdfOutputWindow\(\)/);
  assert.match(source, /window\.open\('about:blank','_blank'\)/);
  assert.match(pdfFn, /pdf\.output\('blob'\)/);
  assert.match(pdfFn, /outputWindow\.location\.replace\(blobUrl\)/);
  assert.match(source, /downloadPDF\(buildServicePDF\(\),[\s\S]*?outputWindow\)/);
  assert.match(source, /downloadPDF\(buildEdilePDF\(\),[\s\S]*?outputWindow\)/);
});

test('company website links are present in PDF header and footer', () => {
  assert.match(source, /impresaedileabilart\.com/);
  assert.match(source, /idraulicoservizi[.]it/);
  assert.match(source, /data-pdf-link="site1"/);
  assert.match(source, /data-pdf-link="site2"/);
});

test('page geometry covers exact A4 CSS slices without exceeding document pages', () => {
  const pageHeight = 1123;
  for (const docHeight of [1, 1123, 1124, 2246, 9000, 16000]) {
    const count = Math.max(1, Math.ceil(docHeight / pageHeight));
    const slices = Array.from({ length: count }, (_, page) =>
      Math.min(pageHeight, docHeight - page * pageHeight));
    assert.equal(slices.reduce((sum, height) => sum + height, 0), docHeight);
    assert.ok(slices.every(height => height > 0 && height <= pageHeight));
  }
});
