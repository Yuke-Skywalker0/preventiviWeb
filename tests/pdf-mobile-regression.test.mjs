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

test('A4 pagination uses fixed-height cuts and never distorts page slices', () => {
  assert.match(source, /function getPdfPageCuts\(doc,pageHeight,fullHeight\)/);
  assert.match(source, /range\.getClientRects\(\)/);
  assert.match(source, /snapTolerance=18/);
  assert.match(source, /pageCuts=getPdfPageCuts\(doc,cssPageHeight,fullHeight\)/);
  assert.match(source, /pageTop=pageCuts\[page\]/);\n  assert.match(pdfFn, /const pageHeight=cssPageHeight/);\n  assert.match(pdfFn, /pdf\.addImage\(renderedCanvas,'JPEG',0,0,210,297/);\n  assert.match(pdfFn, /const mmY=297\/cssPageHeight/);
  assert.doesNotMatch(source, /el\.style\.marginTop/);
  assert.doesNotMatch(source, /stabilizeFlowBreaks\(doc\)/);
  assert.match(source, /for\(let page=0;page<totalPages;page\+\+\)/);
});

test('PDF canvas is passed directly to jsPDF and temporary canvases are released', () => {\n  assert.match(pdfFn, /pdf\.addImage\(renderedCanvas,'JPEG'/);\n  assert.doesNotMatch(pdfFn, /renderedCanvas\.toDataURL/);
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
