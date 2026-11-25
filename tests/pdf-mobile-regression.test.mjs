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

test('PDF page cuts follow nearby line ends without stretching slices', () => {
  assert.match(source, /function getPdfPageCuts\(doc,pageHeight,fullHeight\)/);
  assert.match(source, /range\.getClientRects\(\)/);
  assert.match(source, /const tolerance=24/);
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

test('PDF content wraps safely without font compression or stretched images', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.pdf-flow-document img\{[\s\S]*?height:auto/);
  assert.match(css, /\.pdf-description-content,[\s\S]*?overflow-wrap:anywhere/);
  assert.match(css, /\.pdf-flow-body table\{[\s\S]*?width:100%/);
  assert.match(css, /\.pdf-flow-body \.pdf-signature img\{[\s\S]*?max-width:100%/);
});
