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

test('PDF preserves editor bold, underline, bullet lists and selected text colors', () => {
  assert.match(renderer, /tag==='strong'\|\|tag==='b'/);
  assert.match(renderer, /tag==='u'\|\|/);
  assert.match(renderer, /tag==='font'\?\(n\.getAttribute\('color'\)/);
  assert.match(renderer, /font-weight\\s\*:/);
  assert.match(renderer, /font-style\\s\*:/);
  assert.match(renderer, /const hex=v\.match\(\/\^#\(\[0-9a-f\]\{3\}\|\[0-9a-f\]\{6\}\)\$\/i\)/);
  assert.match(renderer, /const fn=v\.match\(\/\^rgba\?\\\(/);
  assert.match(renderer, /text-decoration\\s\*:/);
  assert.match(html, /data-cmd="insertUnorderedList"/);
});

test('rich editor block paragraphs retain line breaks in the PDF', () => {
  assert.match(renderer, /isBlock=\['div','p','h1','h2','h3','h4','h5','h6'\]/);
  assert.match(renderer, /out\.push\(\{t:'\\\\n'/);
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
  assert.match(renderer, /flowFrame=\{x,w,fill:'soft',stroke:'line'/);
});

test('work table splits oversized rows and repeats its heading on continued pages', () => {
  assert.match(renderer, /const maxLines=Math\.max/);
  assert.match(renderer, /const capacity=Math\.max/);
  assert.match(renderer, /paintRow\(\[\.\.\.header\.children\],headLines,headH,true\)/);
  assert.match(renderer, /segment=all\.map/);
});

test('PDF exposes clickable company, client, email, phone and map links', () => {
  assert.match(renderer, /function addPdfLink/);
  assert.match(renderer, /p\.link\(/);
  assert.match(renderer, /mailto:/);
  assert.match(renderer, /tel:/);
  assert.match(renderer, /google\.com\/maps\/search/);
  assert.match(renderer, /if\(r\.href\)addPdfLink/);
  assert.match(renderer, /f\.anchors\?\.length/);
});

test('PDF visual hierarchy uses clean headers, continuous frames and a safe footer', () => {
  assert.doesNotMatch(renderer, /CONTINUA · PAG\.|DOCUMENTO IN CONTINUAZIONE|Condizioni generali · continua/);
  assert.match(renderer, /drawRichLine\(lead,18,ctx\.y,172,8\.0\)/);
  assert.match(renderer, /flowFrame/);
  assert.match(renderer, /from=f\.lastY\?\?top/);
  assert.match(renderer, /bottom:269,width:182/);
  assert.match(renderer, /p\.line\(14,276,196,276\)/);
  assert.match(renderer, /p\.text\('Pagina '\+i\+' \/ '\+n,196,283/);
  assert.match(renderer, /pale:\[247,250,252\]/);
  assert.match(renderer, /p\.setFontSize\(9\.3\)/);
});

test('PDF description and terms panel fill remains continuous between paragraphs', () => {
  assert.match(renderer, /from=f\.lastY\?\?top/);
  assert.doesNotMatch(renderer, /from=Math\.max\(f\.lastY\?\?top,top\)/);
  assert.match(renderer, /f\.lastY=bottom/);
});

test('footer contains both independent clickable company websites', () => {
  assert.match(renderer, /impresaedileabilart\.com/);
  assert.match(renderer, /https:\/\/impresaedileabilart\.com\//);
  assert.match(renderer, /idraulicoservizi\.it/);
  assert.match(renderer, /https:\/\/idraulicoservizi\.it\//);
  assert.match(renderer, /p\.text\('Mappa',170,283\)/);
});

test('first-page client and economic summary have stronger spacing and typography', () => {
  assert.match(renderer, /const w=116,cw=w\/2,rows=\[\]/);
  assert.match(renderer, /p\.setFontSize\(9\.3\)/);
  assert.match(renderer, /const rows=\[\.\.\.el\.querySelectorAll\('tr'\)\],x=134,w=62/);
  assert.match(renderer, /if\(\/\^IVA\$\/i\.test\(label\)\)/);
  assert.match(renderer, /anchors\.map\(a=>a\.text\)\.join\('\\n'\)/);
});

test('service and renovation terms are condensed without dropping core clauses', () => {
  assert.match(html, /Oggetto e perimetro/);
  assert.match(html, /Varianti e imprevisti/);
  assert.match(html, /Responsabilità e garanzie/);
  assert.match(html, /Dati personali/);
  assert.match(html, /Stato dei luoghi/);
  assert.match(html, /Accettazione/);
  assert.ok((html.match(/L’offerta vale per il periodo indicato/g)||[]).length >= 1);
});

test('economy avoids duplicate net taxable row without discount and signature uses acceptance date', () => {
  assert.match(app, /<tr><td>IVA<\/td>/);
  assert.match(app, /discount>0\?[\s\S]*?Imponibile netto/);
  assert.equal((app.match(/Data di accettazione:/g)||[]).length,2);
  assert.doesNotMatch(app, /Data: \$\{escapeHtml\(date\|\|'—'\)\}/);
});
