import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const start = source.indexOf('async function downloadPDF(');
const end = source.indexOf("\n$('#service-form').addEventListener", start);
assert.ok(start >= 0 && end > start, 'PDF function boundaries must exist');
const pdfFn = source.slice(start, end);

test('PDF renders bounded A4 slices, never one document-sized canvas', () => {
  assert.match(pdfFn, /for\s*\(let page=0;page<totalPages;page\+\+\)/);
  assert.match(pdfFn, /x:0,y:pageTop,width:cssWidth,height:pageHeight/);
  assert.match(pdfFn, /windowHeight:cssPageHeight/);
  assert.doesNotMatch(pdfFn, /fullCanvas/);
  assert.doesNotMatch(pdfFn, /height:fullHeight/);
});

test('A4 pagination uses fixed cuts and preserves page aspect ratio', () => {
  assert.match(source, /function getPdfPageCuts\(doc,pageHeight,fullHeight\)/);
  assert.match(source, /pageCount=Math\.max\(1,Math\.ceil\(fullHeight\/pageHeight\)\)/);
  assert.match(source, /index\*pageHeight/);
  assert.doesNotMatch(source, /range\.getClientRects\(\)/);
  assert.doesNotMatch(source, /snapTolerance=18/);
  assert.match(source, /pageCuts=getPdfPageCuts\(doc,cssPageHeight,fullHeight\)/);
  assert.match(pdfFn, /const pageHeight=cssPageHeight/);
  assert.match(pdfFn, /pdf\.addImage\(renderedCanvas,'JPEG',0,0,210,297/);
  assert.match(pdfFn, /const mmY=297\/cssPageHeight/);
});

test('PDF canvas is passed directly to jsPDF and temporary canvases are released', () => {
  assert.match(pdfFn, /pdf\.addImage\(renderedCanvas,'JPEG'/);
  assert.doesNotMatch(pdfFn, /renderedCanvas\.toDataURL/);
  assert.match(pdfFn, /renderedCanvas\.width=0/);
  assert.match(pdfFn, /renderedCanvas\.height=0/);
  assert.match(pdfFn, /finally\s*\{[\s\S]*?holder\.remove\(\)/);
});

test('iOS uses a gesture-opened viewer while desktop triggers a Blob download', () => {
  assert.match(source, /function preparePdfOutputWindow\(\)/);
  assert.match(source, /window\.open\('about:blank','_blank'\)/);
  assert.match(source, /if\(!isIOSPdfViewer\(\)\) return null/);
  assert.match(pdfFn, /link\.download=filename/);
  assert.match(pdfFn, /link\.click\(\)/);
  assert.match(pdfFn, /showPdfProgress\(`Generazione PDF/);
  assert.match(pdfFn, /renderScale=1\.25/);
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
