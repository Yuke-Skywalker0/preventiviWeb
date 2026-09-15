/* Abilart Preventivi — frontend-only application */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function euro(value) {
  return new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'}).format(Number(value) || 0);
}

function numberIT(value) {
  if (value === null || value === undefined) return 0;
  let s = String(value).trim().replace(/[€\s]/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',','.');
    else s = s.replace(/,/g,'');
  } else if (s.includes(',')) {
    s = s.replace(/\./g,'').replace(',','.');
  } else {
    const dots = (s.match(/\./g)||[]).length;
    if (dots > 1) s = s.replace(/\./g,'');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function dateIT(value) {
  if (!value) return '';
  const [y,m,d] = value.split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function cleanEditorHtml(editor) {
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('script,style').forEach(n => n.remove());
  clone.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      if (a.name.toLowerCase().startsWith('on')) el.removeAttribute(a.name);
    });
  });
  return clone.innerHTML.trim() || '<span style="color:#7d878e">Nessuna descrizione inserita.</span>';
}

function showScreen(id) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
  }
}

$$('[data-open]').forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.open)));

function setupEditors() {
  $$('.rich-toolbar button').forEach(btn => {
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => {
      const editor = document.getElementById(btn.dataset.editor);
      if (!editor) return;
      editor.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === 'foreColor') document.execCommand('foreColor', false, btn.dataset.color);
      else document.execCommand(cmd, false, null);
    });
  });
  $$('.rich-editor').forEach(editor => {
    editor.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault(); document.execCommand('bold'); 
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault(); document.execCommand('underline');
      }
    });
  });
}
setupEditors();

function setupSignature(id) {
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  let drawing = false, hasInk = false, last = null;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const source = e.touches ? e.touches[0] : e;
    return {x:(source.clientX-r.left)*(canvas.width/r.width), y:(source.clientY-r.top)*(canvas.height/r.height)};
  }
  function start(e){ e.preventDefault(); drawing=true; hasInk=true; last=pos(e); }
  function move(e){
    if(!drawing) return;
    e.preventDefault();
    const p=pos(e);
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y);
    ctx.strokeStyle='#17212b'; ctx.lineWidth=3.2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke();
    last=p;
  }
  function stop(){drawing=false;last=null}
  canvas.addEventListener('pointerdown',start); canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',stop); canvas.addEventListener('pointercancel',stop); canvas.addEventListener('pointerleave',stop);
  canvas.addEventListener('touchstart',start,{passive:false}); canvas.addEventListener('touchmove',move,{passive:false}); canvas.addEventListener('touchend',stop);
  return {
    clear(){ctx.clearRect(0,0,canvas.width,canvas.height);hasInk=false},
    hasInk(){return hasInk},
    data(){return hasInk ? canvas.toDataURL('image/png') : ''}
  };
}

const signatures = { 's-signature': setupSignature('s-signature'), 'e-signature': setupSignature('e-signature') };
$$('[data-clear-signature]').forEach(btn => btn.addEventListener('click',()=>signatures[btn.dataset.clearSignature]?.clear()));

function serviceCalc(){
  const base=numberIT($('#s-price').value), ivaP=Math.max(0,numberIT($('#s-iva').value)), dep=Math.max(0,numberIT($('#s-deposit').value));
  const iva=base*ivaP/100, total=base+iva, balance=Math.max(0,total-dep);
  $('#s-preview-base').textContent=euro(base); $('#s-preview-iva').textContent=euro(iva);
  $('#s-preview-total').textContent=euro(total); $('#s-preview-balance').textContent=euro(balance);
}
['s-price','s-iva','s-deposit'].forEach(id=>document.getElementById(id).addEventListener('input',serviceCalc));

let rowId=0;
function addWorkRow(data={}){
  const tbody=$('#work-table tbody'), tr=document.createElement('tr'); tr.dataset.rowId=++rowId;
  tr.innerHTML=`
    <td><input class="r-voce" value="${escapeHtml(data.voce||'')}"></td>
    <td><input class="r-desc" value="${escapeHtml(data.descrizione||'')}"></td>
    <td><input class="r-qty" type="number" min="0" step="0.01" value="${escapeHtml(data.quantita??'1')}"></td>
    <td><select class="r-unit"><option ${data.unita==='pz'?'selected':''}>pz</option><option ${data.unita==='mq'?'selected':''}>mq</option><option ${data.unita==='ml'?'selected':''}>ml</option><option ${data.unita==='kg'?'selected':''}>kg</option><option ${data.unita==='ore'?'selected':''}>ore</option><option ${data.unita==='giorni'?'selected':''}>giorni</option></select></td>
    <td><input class="r-price" type="number" min="0" step="0.01" value="${escapeHtml(data.prezzo??'0')}"></td>
    <td class="r-total">€ 0,00</td>
    <td><button type="button" class="remove-row">×</button></td>`;
  tbody.appendChild(tr);
  tr.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',calcTable));
  tr.querySelector('.remove-row').addEventListener('click',()=>{tr.remove();calcTable()});
  calcTable();
}
$('#add-row').addEventListener('click',()=>addWorkRow());
addWorkRow();

function getRows(){
  return $$('#work-table tbody tr').map(tr=>({
    voce:$('.r-voce',tr).value.trim(),
    descrizione:$('.r-desc',tr).value.trim(),
    quantita:numberIT($('.r-qty',tr).value),
    unita:$('.r-unit',tr).value,
    prezzo:numberIT($('.r-price',tr).value),
    totale:numberIT($('.r-qty',tr).value)*numberIT($('.r-price',tr).value)
  })).filter(r=>r.voce||r.descrizione||r.quantita||r.prezzo);
}

function calcTable(){
  let sub=0;
  $$('#work-table tbody tr').forEach(tr=>{
    const total=numberIT($('.r-qty',tr).value)*numberIT($('.r-price',tr).value);
    $('.r-total',tr).textContent=euro(total); sub+=total;
  });
  $('#table-subtotal').textContent=euro(sub);
  edileCalc();
}
function edileCalc(){
  const base=numberIT($('#e-price').value), discount=Math.min(Math.max(0,numberIT($('#e-discount').value)),base);
  const dep=Math.max(0,numberIT($('#e-deposit').value)), ivaP=Math.max(0,numberIT($('#e-iva').value));
  const net=Math.max(0,base-discount), iva=net*ivaP/100, total=net+iva, balance=Math.max(0,total-dep);
  $('#e-preview-base').textContent=euro(base); $('#e-preview-discount').textContent=euro(discount);
  $('#e-preview-net').textContent=euro(net); $('#e-preview-iva').textContent=euro(iva);
  $('#e-preview-total').textContent=euro(total); $('#e-preview-deposit').textContent=euro(dep); $('#e-preview-balance').textContent=euro(balance);
}
['e-price','e-discount','e-deposit','e-iva'].forEach(id=>document.getElementById(id).addEventListener('input',edileCalc));

function requiredCheck(form){
  if(!form.reportValidity()) return false;
  const sigId=form.id==='service-form'?'s-signature':'e-signature';
  if(!signatures[sigId].hasInk()){ alert('Inserisci la firma del contraente prima di generare il PDF.'); return false; }
  return true;
}

function docNumber(prefix='PREV'){
  const d=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return `${prefix}-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function pdfPageHeader(title, number, date){
  return `<div class="pdf-page-header pdf-cover-header">
    <div class="pdf-company">
      <img class="pdf-logo" src="assets/abilart-logo.png" alt="Abilart Srls">
      <div class="pdf-company-name">ABILART SRLS</div>
      <div class="pdf-company-meta">
        <span>P. IVA / C.F. 10439280966</span>
        <span>Via Caprera 2, 20851 Lissone (MB)</span>
        <span>Zone operative: Monza, Milano, Bergamo e relative province</span>
        <span><a href="tel:+393204295445" data-pdf-link="phone">+39 320 429 5445</a> &nbsp;·&nbsp; <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a></span>
      </div>
    </div>
    <div class="pdf-meta">
      <span>DOCUMENTO NUMERO</span>
      <strong>${escapeHtml(number)}</strong>
      <span>DATA: ${escapeHtml(date)}</span>
    </div>
  </div>
  <div class="pdf-doc-type">${escapeHtml(title)}</div>`;
}

function pdfSectionTitle(title){
  return `<div class="pdf-title">${escapeHtml(title)}</div>`;
}

function pdfClientBox(data){
  const address = `${escapeHtml(data.address||'—')}${data.zip||data.city?`, ${escapeHtml(data.zip||'')} ${escapeHtml(data.city||'')}`:''}`;
  const mapUrl = data.address || data.city ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([data.address,data.zip,data.city].filter(Boolean).join(', '))}` : '';
  return `<div class="pdf-box pdf-client-box">
    <table class="pdf-data">
      <tr>
        <td><span class="pdf-label">NOME E COGNOME</span><strong>${escapeHtml(data.name||'—')}</strong></td>
        <td><span class="pdf-label">CODICE FISCALE / PARTITA IVA</span>${escapeHtml(data.tax||'—')}</td>
      </tr>
      <tr>
        <td><span class="pdf-label">INDIRIZZO</span>${mapUrl?`<a href="${mapUrl}" data-pdf-link="client-address">${address}</a>`:address}</td>
        <td><span class="pdf-label">CONTATTI</span>${data.phone?`<a href="tel:${String(data.phone).replace(/[^+\d]/g,'')}" data-pdf-link="client-phone">${escapeHtml(data.phone)}</a>`:'—'} &nbsp;|&nbsp; ${data.email?`<a href="mailto:${escapeHtml(data.email)}" data-pdf-link="client-email">${escapeHtml(data.email)}</a>`:'—'}</td>
      </tr>
      ${data.reference!==undefined?`<tr><td colspan="2"><span class="pdf-label">RIFERIMENTO CANTIERE / INTERNO / SCALA</span>${escapeHtml(data.reference||'—')}</td></tr>`:''}
    </table>
  </div>`;
}

function pdfDescription(html){
  return `<div class="pdf-box pdf-description-flow"><div class="pdf-description-content">${html}</div></div>`;
}

function pdfEconomy(base,discount,dep,ivaP){
  const net=Math.max(0,base-discount), iva=net*ivaP/100, total=net+iva, balance=Math.max(0,total-dep);
  return `<div class="pdf-economy">
    <table class="pdf-money">
      <tr><td>Imponibile</td><td>${euro(base)}</td></tr>
      ${discount>0?`<tr><td>Sconto</td><td>− ${euro(discount)}</td></tr>`:''}
      <tr><td>Imponibile netto</td><td>${euro(net)}</td></tr>
      <tr><td>Imposta sul valore aggiunto</td><td>${escapeHtml(ivaP)}% &nbsp;&nbsp; ${euro(iva)}</td></tr>
      <tr><td>Acconto</td><td>${euro(dep)}</td></tr>
      <tr class="pdf-total"><td>TOTALE</td><td>${euro(total)}</td></tr>
      <tr class="pdf-balance"><td>Saldo residuo</td><td>${euro(balance)}</td></tr>
    </table>
  </div>`;
}

function signatureImg(data){
  return data ? `<img src="${data}" alt="Firma cliente">` : '<div class="pdf-sign-line"></div>';
}

function pdfFooter(){
  return `<div class="pdf-footer pdf-document-footer">
    <div class="pdf-footer-brand"><strong>ABILART SRLS</strong><span>P. IVA / C.F. 10439280966</span></div>
    <div class="pdf-footer-contact">
      <a href="tel:+393204295445" data-pdf-link="phone">+39 320 429 5445</a>
      <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a>
    </div>
    <div class="pdf-footer-sites">
      <a href="https://impresaedileabilart.com/" data-pdf-link="site1">impresaedileabilart.com</a>
      <a href="https://idraulicoservizi.com/" data-pdf-link="site2">idraulicoservizi.com</a>
    </div>
    <div class="pdf-footer-address">Via Caprera 2 · Lissone (MB)</div>
  </div>`;
}

function pdfDocument(title, number, date, content){
  return `<div class="pdf-document pdf-flow-document">
    ${pdfPageHeader(title,number,date)}
    <main class="pdf-flow-body">${content}</main>
    ${pdfFooter()}
  </div>`;
}

function getTermsHTML(source){
  const ol=source.querySelector('ol');
  if(!ol) return [];
  return [...ol.children].map(li=>`<li>${li.innerHTML}</li>`);
}

function termsBlock(items){
  return `<div class="pdf-terms-box"><ol>${items.join('')}</ol></div>`;
}

function pdfPayment(validity,payment){
  return `<div class="pdf-payment">
    <div><span>METODO DI PAGAMENTO</span><strong>${escapeHtml(payment||'—')}</strong></div>
    <div><span>VALIDITÀ DEL PREVENTIVO</span><strong>${escapeHtml(validity||'Non specificata')}</strong></div>
  </div>`;
}

function buildServicePDF(){
  const d={
    name:$('#s-name').value,address:$('#s-address').value,zip:$('#s-zip').value,city:$('#s-city').value,
    phone:$('#s-phone').value,email:$('#s-email').value,tax:$('#s-tax').value
  };
  const base=numberIT($('#s-price').value), dep=numberIT($('#s-deposit').value), ivaP=numberIT($('#s-iva').value);
  const number=docNumber('PREV'), date=dateIT($('#s-date').value), desc=cleanEditorHtml($('#service-editor'));
  const terms=getTermsHTML(document.querySelector('#service-form .terms-box'));
  const validity=$('#s-validity').value.trim();
  const content=`
    ${pdfSectionTitle('DATI DEL COMMITTENTE')}
    ${pdfClientBox(d)}
    ${pdfSectionTitle("DATI DELL'INTERVENTO")}
    <div class="pdf-box"><table class="pdf-data"><tr><td><span class="pdf-label">CATEGORIA INTERVENTO</span>${escapeHtml($('#s-category').value||'—')}</td><td><span class="pdf-label">DATA INTERVENTO</span>${escapeHtml(date||'—')}</td></tr></table></div>
    ${pdfSectionTitle("OGGETTO DELLA PRESTAZIONE D'OPERA")}
    ${pdfDescription(desc)}
    ${pdfSectionTitle('RIEPILOGO ECONOMICO')}
    ${pdfEconomy(base,0,dep,ivaP)}
    <div class="pdf-payment"><div><span>VALIDITÀ DEL PREVENTIVO</span><strong>${escapeHtml(validity||'Non specificata')}</strong></div><div><span>DOCUMENTO</span><strong>Preventivo / Contratto</strong></div></div>
    ${pdfSectionTitle('CONDIZIONI GENERALI DI FORNITURA')}
    ${termsBlock(terms)}
    <div class="pdf-acceptance">Il committente dichiara di aver letto e accettato integralmente le condizioni sopra riportate.</div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">FIRMA TECNICO APPALTANTE</span><div class="pdf-sign-space"></div><strong>Michele (Abilart Srls)</strong><small>Documento predisposto digitalmente</small></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['s-signature'].data())}<span class="pdf-sign-date">Data: ${escapeHtml(date||'—')}</span></div>
    </div>`;
  return pdfDocument('PREVENTIVO / CONTRATTO',number,date,content);
}

function buildEdilePDF(){
  const d={name:$('#e-name').value,address:$('#e-address').value,zip:$('#e-zip').value,city:$('#e-city').value,phone:$('#e-phone').value,email:$('#e-email').value,tax:$('#e-tax').value,reference:$('#e-reference').value};
  const base=numberIT($('#e-price').value), discount=Math.min(Math.max(0,numberIT($('#e-discount').value)),base), dep=Math.max(0,numberIT($('#e-deposit').value)), ivaP=numberIT($('#e-iva').value);
  const number=docNumber('PREV-EDILE'), date=dateIT($('#e-date').value), desc=cleanEditorHtml($('#edile-editor'));
  const rows=getRows();
  const rowsHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.voce||'—')}</td><td>${escapeHtml(r.descrizione||'—')}</td><td class="center">${escapeHtml(r.quantita)}</td><td class="center">${escapeHtml(r.unita)}</td><td class="right">${euro(r.prezzo)}</td><td class="right">${euro(r.totale)}</td></tr>`).join(''):`<tr><td colspan="6" class="center muted">Nessuna lavorazione dettagliata inserita.</td></tr>`;
  const tableSubtotal=rows.reduce((s,r)=>s+r.totale,0);
  const terms=getTermsHTML(document.querySelector('#edile-form .terms-box'));
  const content=`
    ${pdfSectionTitle('DATI DEL COMMITTENTE')}
    ${pdfClientBox(d)}
    ${pdfSectionTitle('DATI INTERVENTO / PREVENTIVO')}
    <div class="pdf-box"><table class="pdf-data">
      <tr><td><span class="pdf-label">CATEGORIA</span>${escapeHtml($('#e-category').value||'—')}</td><td><span class="pdf-label">TIPOLOGIA LAVORO</span>${escapeHtml($('#e-type').value||'—')}</td><td><span class="pdf-label">DATA</span>${escapeHtml(date||'—')}</td></tr>
      <tr><td><span class="pdf-label">SUPERFICIE INDICATIVA</span>${escapeHtml($('#e-area').value||'—')} mq</td><td><span class="pdf-label">DURATA STIMATA</span>${escapeHtml($('#e-duration').value||'—')}</td><td><span class="pdf-label">URGENZA</span>${escapeHtml($('#e-urgency').value||'—')}</td></tr>
    </table></div>
    ${pdfSectionTitle("OGGETTO DELLA PRESTAZIONE D'OPERA")}
    ${pdfDescription(desc)}
    ${pdfSectionTitle('DETTAGLIO VOCI DI PREVENTIVO')}
    <div class="pdf-table-wrap"><table class="pdf-table"><thead><tr><th>Voce</th><th>Descrizione</th><th>Qtà</th><th>Unità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>
    <div class="pdf-table-subtotal"><span>Subtotale lavorazioni</span><strong>${euro(tableSubtotal)}</strong></div>
    ${pdfSectionTitle('RIEPILOGO ECONOMICO')}
    ${pdfEconomy(base,discount,dep,ivaP)}
    ${pdfPayment($('#e-validity').value,$('#e-payment').value)}
    ${pdfSectionTitle('CONDIZIONI GENERALI DI CONTRATTO')}
    ${termsBlock(terms)}
    <div class="pdf-acceptance">Ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile, il committente dichiara di aver letto e approvato specificamente le clausole contenute nel presente documento.</div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">FIRMA TECNICO APPALTANTE</span><div class="pdf-sign-space"></div><strong>Michele (Abilart Srls)</strong><small>Documento firmato digitalmente</small></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['e-signature'].data())}<span class="pdf-sign-date">Data: ${escapeHtml(date||'—')}</span></div>
    </div>`;
  return pdfDocument('PREVENTIVO EDILE',number,date,content);
}

function sleepFrame(){ return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); }
function stabilizeFlowBreaks(doc){
  const pageHeight=1123;
  const root=doc.getBoundingClientRect();
  const topGap=30;
  const bottomGap=34;

  const pagePosOf=el=>{
    const r=el.getBoundingClientRect();
    const top=r.top-root.top;
    const pagePos=((top % pageHeight)+pageHeight)%pageHeight;
    return {r,top,pagePos,remaining:pageHeight-pagePos};
  };

  const pushBy=el=>{
    const current=parseFloat(getComputedStyle(el).marginTop)||0;
    const info=pagePosOf(el);
    const amount=info.remaining+topGap;
    el.style.marginTop=`${current+amount}px`;
  };

  // Keep section title + first content block together whenever possible.
  doc.querySelectorAll('.pdf-title').forEach(title=>{
    const next=title.nextElementSibling;
    if(!next) return;
    const t=pagePosOf(title);
    const n=next.getBoundingClientRect().height;
    const required=t.r.height + 9 + Math.min(n, pageHeight-2*topGap);
    if(t.pagePos>topGap && t.remaining < required + bottomGap) pushBy(title);
  });

  // Compact cards should not start with only a few pixels left on the page.
  doc.querySelectorAll('.pdf-client-box, .pdf-flow-body > .pdf-box:not(.pdf-description-flow), .pdf-table-wrap, .pdf-economy, .pdf-payment, .pdf-acceptance, .pdf-signatures').forEach(box=>{
    const info=pagePosOf(box);
    const h=info.r.height;
    if(info.pagePos>topGap && info.remaining < Math.min(h+bottomGap, pageHeight-topGap)) pushBy(box);
  });

  // Keep paragraphs, headings and individual condition clauses intact.
  // The complete description/terms container itself remains splittable.
  doc.querySelectorAll('.pdf-description-content > p, .pdf-description-content > h1, .pdf-description-content > h2, .pdf-description-content > h3, .pdf-description-content > ul, .pdf-description-content > ol, .pdf-terms-box li').forEach(block=>{
    const info=pagePosOf(block);
    const h=info.r.height;
    if(info.pagePos>topGap && h < pageHeight-2*topGap && info.remaining < h+bottomGap) pushBy(block);
  });

  // Never leave a table row half-visible when it can be moved as a unit.
  doc.querySelectorAll('.pdf-table tbody tr').forEach(row=>{
    const info=pagePosOf(row);
    if(info.pagePos>topGap && info.remaining < info.r.height+24) pushBy(row);
  });
}


function addPdfWatermark(pdf,pageIndex,total,title){
  // The watermark itself lives in the PDF DOM background, underneath the text.
  // Here we only add the page counter in the safe bottom margin.
  pdf.saveGraphicsState();
  pdf.setTextColor(128,143,151);
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(6.5);
  pdf.text(`${title}  •  PAGINA ${pageIndex+1} / ${total}`,198,291,{align:'right'});
  pdf.restoreGraphicsState();
}

async function addPdfLinksFromDom(pdf, root, canvasScale){
  const rootRect=root.getBoundingClientRect();
  const mmX=210/794, mmY=297/1123;
  root.querySelectorAll('[data-pdf-link]').forEach(el=>{
    const r=el.getBoundingClientRect();
    const x=(r.left-rootRect.left)*mmX;
    const y=(r.top-rootRect.top)*mmY;
    const w=Math.max(2,r.width*mmX);
    const h=Math.max(3,r.height*mmY);
    const url=el.href;
    if(url) pdf.link(x,y,w,h,{url});
  });
}

async function downloadPDF(html, filename){
  if(typeof html2canvas==='undefined' || typeof window.jspdf==='undefined' || typeof window.jspdf.jsPDF==='undefined'){
    alert('Il motore PDF non è stato caricato. Controlla la connessione Internet e ricarica la pagina.');
    return;
  }

  const holder=document.createElement('div');
  holder.className='pdf-render-host';
  holder.innerHTML=html;
  document.body.appendChild(holder);
  document.body.classList.add('pdf-rendering');

  try{
    const doc=holder.querySelector('.pdf-flow-document');
    const {jsPDF}=window.jspdf;
    if(!doc) throw new Error('Documento PDF non trovato');

    doc.style.width='794px';
    doc.style.height='auto';
    doc.style.minHeight='0';
    doc.style.overflow='visible';

    await document.fonts?.ready;
    await sleepFrame();
    stabilizeFlowBreaks(doc);
    await sleepFrame();

    /*
      IMPORTANTISSIMO:
      non renderizziamo una pagina alla volta con html2canvas.
      html2canvas puo' infatti ricomputare il viewport/crop e duplicare
      porzioni del documento. Renderizziamo UNA SOLA VOLTA il flusso
      completo e poi ritagliamo il canvas in pagine A4.
    */
    const cssWidth=794;
    const cssPageHeight=1123;
    const fullHeight=Math.ceil(doc.scrollHeight);
    const renderScale=1.5;
    const totalPages=Math.max(1,Math.ceil(fullHeight/cssPageHeight));

    const fullCanvas=await html2canvas(doc,{
      width:cssWidth,
      height:fullHeight,
      windowWidth:cssWidth,
      windowHeight:Math.min(fullHeight,3000),
      x:0,
      y:0,
      scale:renderScale,
      useCORS:true,
      allowTaint:true,
      backgroundColor:'#ffffff',
      logging:false,
      scrollX:0,
      scrollY:0,
      imageTimeout:15000
    });

    const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true,putOnlyUsedFonts:true});
    const title=doc.querySelector('.pdf-doc-type')?.textContent?.trim()||'DOCUMENTO';

    for(let page=0; page<totalPages; page++){
      const sourceY=page*cssPageHeight*renderScale;
      const remaining=Math.min(cssPageHeight, fullHeight-page*cssPageHeight);
      if(remaining<=0) continue;

      const crop=document.createElement('canvas');
      crop.width=Math.round(cssWidth*renderScale);
      crop.height=Math.round(cssPageHeight*renderScale);
      const ctx=crop.getContext('2d');
      ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,crop.width,crop.height);
      ctx.drawImage(
        fullCanvas,
        0, sourceY,
        fullCanvas.width, Math.round(remaining*renderScale),
        0, 0,
        crop.width, Math.round(remaining*renderScale)
      );

      if(page>0) pdf.addPage('a4','portrait');
      pdf.addImage(crop.toDataURL('image/jpeg',0.96),'JPEG',0,0,210,297,undefined,'FAST');
      addPdfWatermark(pdf,page,totalPages,title);
    }

    // Link cliccabili: vengono ricostruiti sopra l'immagine, pagina per pagina.
    const docRect=doc.getBoundingClientRect();
    const mmX=210/cssWidth, mmY=297/cssPageHeight;
    doc.querySelectorAll('[data-pdf-link]').forEach(el=>{
      const r=el.getBoundingClientRect();
      const top=r.top-docRect.top, bottom=r.bottom-docRect.top;
      const first=Math.floor(Math.max(0,top)/cssPageHeight);
      const last=Math.floor(Math.max(0,bottom-0.5)/cssPageHeight);
      for(let page=first;page<=last && page<totalPages;page++){
        const pageTop=page*cssPageHeight;
        const visibleTop=Math.max(top,pageTop);
        const visibleBottom=Math.min(bottom,pageTop+cssPageHeight);
        if(visibleBottom<=visibleTop) continue;
        const x=(r.left-docRect.left)*mmX;
        const y=(visibleTop-pageTop)*mmY;
        const w=Math.max(2,r.width*mmX);
        const h=Math.max(3,(visibleBottom-visibleTop)*mmY);
        if(el.href){
          pdf.setPage(page+1);
          pdf.link(x,y,w,h,{url:el.href});
        }
      }
    });

    pdf.save(filename);
  }catch(err){
    console.error('Errore generazione PDF:',err);
    alert('Errore durante la generazione del PDF. Riprova dopo aver ricaricato la pagina.');
  }finally{
    document.body.classList.remove('pdf-rendering');
    holder.remove();
  }
}
$('#service-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!requiredCheck(e.currentTarget))return;
  const name=$('#s-name').value.trim().replace(/\s+/g,'_')||'Cliente';
  await downloadPDF(buildServicePDF(),`Preventivo_Abilart_${name}.pdf`);
});
$('#edile-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!requiredCheck(e.currentTarget))return;
  const name=$('#e-name').value.trim().replace(/\s+/g,'_')||'Cliente';
  await downloadPDF(buildEdilePDF(),`Preventivo_Edile_Abilart_${name}.pdf`);
});

document.addEventListener('DOMContentLoaded',()=>{
  const today=new Date().toISOString().slice(0,10);
  $('#s-date').value=today; $('#e-date').value=today;
  serviceCalc(); edileCalc();
});
