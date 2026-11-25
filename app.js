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
function localISODate(date=new Date()){const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`;}
function addDaysISO(value,days){if(!value||!Number.isInteger(days)||days<1)return '';const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);date.setDate(date.getDate()+days);return localISODate(date);}
function validityText(value,issueDate){const days=Number(value);if(!Number.isInteger(days)||days<1||days>365)return 'Validità non impostata';const expiry=addDaysISO(issueDate,days);return `${days} giorni dalla data di emissione`+(expiry?` (scadenza ${dateIT(expiry)})`:'');}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function cleanEditorHtml(editor) {
  const clone = editor.cloneNode(true);
  clone.querySelectorAll('script,style,iframe,object,embed,form,meta,link').forEach(n => n.remove());
  clone.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      const name=a.name.toLowerCase();
      const value=String(a.value||'').trim();
      if(name.startsWith('on') || name==='contenteditable' || name==='srcdoc' || name==='class') {
        el.removeAttribute(a.name);
        return;
      }
      if(name==='href') {
        if(!/^(https?:|mailto:|tel:)/i.test(value)) el.removeAttribute(a.name);
      }
      if(name==='style'){
        const safe=[];
        for(const declaration of value.split(';')){
          const [property,...parts]=declaration.split(':');
          const prop=property?.trim().toLowerCase(), val=parts.join(':').trim();
          if(['color','font-weight','text-decoration','text-align'].includes(prop)&&
             !/(url\s*\(|expression\s*\(|javascript:|position:|display:|\bimportant\b)/i.test(val)){
            safe.push(prop+':'+val);
          }
        }
        if(safe.length)el.setAttribute('style',safe.join(';'));else el.removeAttribute('style');
      }
      if(name==='src') {
        if(!/^data:image\/(png|jpeg|jpg|gif|webp);/i.test(value) && !/^https?:/i.test(value)) el.removeAttribute(a.name);
      }
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
        <span><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Via Caprera 2, 20851 Lissone MB, Italia')}" data-pdf-link="company-address">Via Caprera 2, 20851 Lissone (MB)</a></span>
        <span>Zone operative: Monza, Milano, Bergamo e relative province</span>
        <span><a href="https://impresaedileabilart.com/" data-pdf-link="site1">impresaedileabilart.com</a> · <a href="https://idraulicoservizi.it/" data-pdf-link="site2">idraulicoservizi.it</a></span>
        <span><a href="tel:+393204295445" data-pdf-link="phone">+39 320 429 5445</a> &nbsp;·&nbsp; <a href="https://wa.me/393204295445" data-pdf-link="whatsapp">WhatsApp</a> &nbsp;·&nbsp; <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a></span>
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
      <a href="https://wa.me/393204295445" data-pdf-link="whatsapp">WhatsApp</a>
      <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a>
    </div>
    <div class="pdf-footer-sites">
      <a href="https://impresaedileabilart.com/" data-pdf-link="site1">impresaedileabilart.com</a>
      <a href="https://idraulicoservizi.it/" data-pdf-link="site2">idraulicoservizi.it</a>
    </div>
    <div class="pdf-footer-address"><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Via Caprera 2, 20851 Lissone MB, Italia')}" data-pdf-link="company-address">Via Caprera 2 · Lissone (MB)</a></div>
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

function pdfPayment(validity,payment,issueDate){
  return `<div class="pdf-payment">
    <div><span>METODO DI PAGAMENTO</span><strong>${escapeHtml(payment||'Da concordare')}</strong></div>
    <div><span>VALIDITÀ E SCADENZA</span><strong>${escapeHtml(validityText(validity,issueDate))}</strong></div>
  </div>`;
}

function buildServicePDF(){
  const d={
    name:$('#s-name').value,address:$('#s-address').value,zip:$('#s-zip').value,city:$('#s-city').value,
    phone:$('#s-phone').value,email:$('#s-email').value,tax:$('#s-tax').value
  };
  const base=numberIT($('#s-price').value), dep=numberIT($('#s-deposit').value), ivaP=numberIT($('#s-iva').value);
  const number=docNumber('PREV'), issueDate=$('#s-date').value, date=dateIT(issueDate), plannedDate=dateIT($('#s-work-date').value), desc=cleanEditorHtml($('#service-editor'));
  const terms=getTermsHTML(document.querySelector('#service-form .terms-box'));
  const validity=$('#s-validity').value.trim();
  const content=`
    ${pdfSectionTitle('DATI DEL COMMITTENTE')}
    ${pdfClientBox(d)}
    ${pdfSectionTitle("DATI DELL'INTERVENTO")}
    <div class="pdf-box"><table class="pdf-data"><tr><td><span class="pdf-label">CATEGORIA INTERVENTO</span>${escapeHtml($('#s-category').value||'—')}</td><td><span class="pdf-label">DATA EMISSIONE PREVENTIVO</span>${escapeHtml(date||'—')}</td><td><span class="pdf-label">DATA INTERVENTO PREVISTA</span>${escapeHtml(plannedDate||'Da concordare')}</td></tr></table></div>
    ${pdfSectionTitle("OGGETTO DELLA PRESTAZIONE D'OPERA")}
    ${pdfDescription(desc)}
    ${pdfSectionTitle('RIEPILOGO ECONOMICO')}
    ${pdfEconomy(base,0,dep,ivaP)}
    ${pdfPayment($('#s-validity').value,$('#s-payment').value,issueDate)}
    ${pdfSectionTitle('CONDIZIONI GENERALI DI FORNITURA')}
    ${termsBlock(terms)}
    <div class="pdf-acceptance">Il committente dichiara di aver letto e accettato integralmente le condizioni sopra riportate.</div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">REFERENTE DELL'IMPRESA</span><div class="pdf-sign-space"></div><strong>Abilart Srls</strong><small>Documento predisposto dall'impresa</small></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['s-signature'].data())}<span class="pdf-sign-date">Data firma: ${dateIT(localISODate())}</span></div>
    </div>`;
  return pdfDocument('PREVENTIVO / CONTRATTO',number,date,content);
}

function buildEdilePDF(){
  const d={name:$('#e-name').value,address:$('#e-address').value,zip:$('#e-zip').value,city:$('#e-city').value,phone:$('#e-phone').value,email:$('#e-email').value,tax:$('#e-tax').value,reference:$('#e-reference').value};
  const base=numberIT($('#e-price').value), discount=Math.min(Math.max(0,numberIT($('#e-discount').value)),base), dep=Math.max(0,numberIT($('#e-deposit').value)), ivaP=numberIT($('#e-iva').value);
  const number=docNumber('PREV-EDILE'), issueDate=$('#e-date').value, date=dateIT(issueDate), plannedDate=dateIT($('#e-work-date').value), desc=cleanEditorHtml($('#edile-editor'));
  const rows=getRows();
  const rowsHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.voce||'—')}</td><td>${escapeHtml(r.descrizione||'—')}</td><td class="center">${escapeHtml(r.quantita)}</td><td class="center">${escapeHtml(r.unita)}</td><td class="right">${euro(r.prezzo)}</td><td class="right">${euro(r.totale)}</td></tr>`).join(''):`<tr><td colspan="6" class="center muted">Nessuna lavorazione dettagliata inserita.</td></tr>`;
  const tableSubtotal=rows.reduce((s,r)=>s+r.totale,0);
  const terms=getTermsHTML(document.querySelector('#edile-form .terms-box'));
  const content=`
    ${pdfSectionTitle('DATI DEL COMMITTENTE')}
    ${pdfClientBox(d)}
    ${pdfSectionTitle('DATI INTERVENTO / PREVENTIVO')}
    <div class="pdf-box"><table class="pdf-data">
      <tr><td><span class="pdf-label">CATEGORIA</span>${escapeHtml($('#e-category').value||'—')}</td><td><span class="pdf-label">TIPOLOGIA LAVORO</span>${escapeHtml($('#e-type').value||'—')}</td><td><span class="pdf-label">DATA EMISSIONE PREVENTIVO</span>${escapeHtml(date||'—')}</td></tr>
      <tr><td><span class="pdf-label">DATA INTERVENTO PREVISTA</span>${escapeHtml(plannedDate||'Da concordare')}</td><td><span class="pdf-label">SUPERFICIE INDICATIVA</span>${escapeHtml($('#e-area').value||'—')} mq</td><td><span class="pdf-label">DURATA STIMATA</span>${escapeHtml($('#e-duration').value||'Da definire')}</td></tr><tr><td colspan="3"><span class="pdf-label">URGENZA / PRIORITÀ</span>${escapeHtml($('#e-urgency').value||'Normale')}</td></tr>
    </table></div>
    ${pdfSectionTitle("OGGETTO DELLA PRESTAZIONE D'OPERA")}
    ${pdfDescription(desc)}
    ${pdfSectionTitle('DETTAGLIO VOCI DI PREVENTIVO')}
    <div class="pdf-table-wrap"><table class="pdf-table"><thead><tr><th>Voce</th><th>Descrizione</th><th>Qtà</th><th>Unità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>
    <div class="pdf-table-subtotal"><span>Subtotale lavorazioni</span><strong>${euro(tableSubtotal)}</strong></div>
    ${pdfSectionTitle('RIEPILOGO ECONOMICO')}
    ${pdfEconomy(base,discount,dep,ivaP)}
    ${pdfPayment($('#e-validity').value,$('#e-payment').value,issueDate)}
    ${pdfSectionTitle('CONDIZIONI GENERALI DI CONTRATTO')}
    ${termsBlock(terms)}
    <div class="pdf-acceptance">Il committente conferma di aver letto il documento, il perimetro delle opere, il riepilogo economico e le condizioni riportate. Le eventuali approvazioni specifiche previste dalla legge devono essere raccolte separatamente, con indicazione puntuale delle clausole.</div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">REFERENTE DELL'IMPRESA</span><div class="pdf-sign-space"></div><strong>Abilart Srls</strong><small>Documento predisposto dall'impresa</small></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['e-signature'].data())}<span class="pdf-sign-date">Data: ${escapeHtml(date||'—')}</span></div>
    </div>`;
  return pdfDocument('PREVENTIVO EDILE',number,date,content);
}

function sleepFrame(){ return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))); }
function pinFooterToLastPage(doc){
  const footer=doc.querySelector('.pdf-document-footer');
  const body=doc.querySelector('.pdf-flow-body');
  if(!footer || !body) return;

  const root=doc.getBoundingClientRect();
  const bodyRect=body.getBoundingClientRect();
  const footerRect=footer.getBoundingClientRect();
  const pageHeight=1123;
  const bottomSafe=30;
  const bodyStyle=getComputedStyle(body);
  const paddingBottom=parseFloat(bodyStyle.paddingBottom)||0;
  const contentBottom=Math.max(0, bodyRect.bottom-root.top-paddingBottom);
  const lastContentPage=Math.max(0,Math.floor(Math.max(0,contentBottom-1)/pageHeight));
  const pageBottom=(lastContentPage+1)*pageHeight;
  const pageTargetTop=pageBottom-footerRect.height-bottomSafe;
  const minFooterTop=contentBottom+16;
  const targetTop=Math.max(pageTargetTop,minFooterTop);
  const currentTop=footerRect.top-root.top;
  const extra=Math.max(0,targetTop-currentTop);
  footer.style.marginTop=`${extra}px`;
}

function addPdfWatermark(pdf,pageIndex,total,title){
  // The pagination label lives in a dedicated bottom-safe band, outside the
  // rasterized content area and consistently aligned on every A4 page.
  pdf.saveGraphicsState();
  pdf.setTextColor(83,105,116);
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(8);
  pdf.text(`${title}  ·  PAGINA ${pageIndex+1} / ${total}`,196,284,{align:'right'});
  pdf.restoreGraphicsState();
}

function isIOSPdfViewer(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}
function preparePdfOutputWindow(){
  // Open synchronously from the submit gesture on every platform. The finished
  // Blob replaces this tab; the browser's PDF toolbar gives the user control
  // over download, print and sharing rather than forcing an automatic download.
  try{return window.open('about:blank','_blank');}
  catch(err){console.warn('Impossibile predisporre la scheda PDF:',err);return null;}
}
function showPdfProgress(message){
  let panel=document.getElementById('pdf-generation-status');
  if(!panel){
    panel=document.createElement('div');
    panel.id='pdf-generation-status';
    panel.setAttribute('role','status');
    panel.setAttribute('aria-live','polite');
    panel.style.cssText='position:fixed;z-index:2147483647;left:50%;top:18px;transform:translateX(-50%);width:min(92vw,420px);padding:16px 20px;background:#173f57;color:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.22);font:600 14px/1.5 system-ui,sans-serif;text-align:center';
    document.body.appendChild(panel);
  }
  panel.textContent=message;
  return panel;
}

function getPdfPageCuts(doc,safePageHeight,fullHeight,maxPageHeight=1123){
  // Reserve a real lower safety band on intermediate pages. Cuts prefer
  // text-line bottoms and avoid orphaning section headings from their content.
  const rootTop=doc.getBoundingClientRect().top;
  const lineEdges=[];
  const walker=document.createTreeWalker(doc,NodeFilter.SHOW_TEXT,{
    acceptNode(node){return node.nodeValue?.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}
  });
  let node;
  while((node=walker.nextNode())){
    const range=document.createRange(); range.selectNodeContents(node);
    for(const rect of range.getClientRects()){
      const edge=rect.bottom-rootTop;
      if(edge>0&&edge<fullHeight) lineEdges.push(edge);
    }
    range.detach?.();
  }
  lineEdges.sort((a,b)=>a-b);
  const protectedRanges=[];
  doc.querySelectorAll('.pdf-title').forEach(title=>{
    const next=title.nextElementSibling;
    if(!next) return;
    const a=title.getBoundingClientRect(), b=next.getBoundingClientRect();
    const top=a.top-rootTop, bottom=b.bottom-rootTop;
    if(bottom-top<Math.min(330,safePageHeight*.42)) protectedRanges.push({top,bottom});
  });
  doc.querySelectorAll('.pdf-client-box,.pdf-economy,.pdf-payment,.pdf-acceptance,.pdf-signatures,.pdf-table tbody tr').forEach(el=>{
    const r=el.getBoundingClientRect(), top=r.top-rootTop, bottom=r.bottom-rootTop;
    if(bottom-top<safePageHeight*.72) protectedRanges.push({top,bottom});
  });
  const cuts=[0];
  while(cuts[cuts.length-1]<fullHeight){
    const previous=cuts[cuts.length-1];
    const target=previous+safePageHeight;
    // Let the final page use the full A4 height so the final footer and
    // signature area are not stranded at the top of a tiny trailing slice.
    if(fullHeight-target<=safePageHeight){cuts.push(fullHeight);break;}
    let cut=target;
    const lower=previous+safePageHeight*.76;
    const candidates=lineEdges.filter(edge=>edge>=lower&&edge<=target&&target-edge<=42);
    if(candidates.length) cut=candidates[candidates.length-1];
    const conflict=protectedRanges.find(r=>cut>r.top&&cut<r.bottom);
    if(conflict&&conflict.top>previous+safePageHeight*.62) cut=conflict.top;
    if(cut<=previous+safePageHeight*.55) cut=target;
    cuts.push(Math.max(previous+1,Math.min(target,cut)));
  }
  return cuts;
}
async function downloadPDF(html, filename, outputWindow=null){
  if(typeof html2canvas==='undefined' || typeof window.jspdf==='undefined' || typeof window.jspdf.jsPDF==='undefined'){
    outputWindow?.close();
    alert('Il motore PDF non è stato caricato. Controlla la connessione Internet e ricarica la pagina.');
    return;
  }

  const holder=document.createElement('div');
  holder.className='pdf-render-host';
  holder.innerHTML=html;
  document.body.appendChild(holder);
  document.body.classList.add('pdf-rendering');

  let renderedCanvas=null;
  const progress=showPdfProgress('Preparazione del preventivo…');
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
    // Keep the footer in normal document flow. Manual pinning against full
    // 1123px pages conflicted with the new reserved pagination band.

    // Render exact A4 CSS viewports one page at a time. Fixed dimensions
    // prevent vertical stretching and keep each canvas within safe limits.
    const cssWidth=794;
    const cssPageHeight=1123;
    const safeContentHeight=1040; // ~22 mm reserved for page label and safe trim.
    const fullHeight=Math.ceil(doc.scrollHeight);
    const pageCuts=getPdfPageCuts(doc,safeContentHeight,fullHeight,cssPageHeight);
    const totalPages=pageCuts.length-1;
    // A moderate scale cuts the pixel workload by ~44% versus 1.5x,
    // while retaining readable A4 output on screens and standard printing.
    const renderScale=1.25;
    const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true,putOnlyUsedFonts:true});
    const title=doc.querySelector('.pdf-doc-type')?.textContent?.trim()||'DOCUMENTO';

    for(let page=0;page<totalPages;page++){
      showPdfProgress(`Generazione PDF · pagina ${page+1} di ${totalPages}`);
      await sleepFrame();
      const pageTop=pageCuts[page];
      const pageHeight=pageCuts[page+1]-pageTop;

      renderedCanvas=await html2canvas(doc,{
        x:0,y:pageTop,width:cssWidth,height:pageHeight,
        windowWidth:cssWidth,windowHeight:cssPageHeight,
        scale:renderScale,useCORS:true,allowTaint:false,
        backgroundColor:'#ffffff',logging:false,
        scrollX:0,scrollY:0,imageTimeout:15000
      });
      if(!renderedCanvas.width||!renderedCanvas.height) throw new Error(`Canvas PDF vuoto alla pagina ${page+1}`);

      if(page>0) pdf.addPage('a4','portrait');
      const imageHeightMm=pageHeight*(210/cssWidth);
      pdf.addImage(renderedCanvas,'JPEG',0,0,210,imageHeightMm,undefined,'FAST');
      addPdfWatermark(pdf,page,totalPages,title);

      // Release the large backing store before allocating the next page.
      renderedCanvas.width=0;
      renderedCanvas.height=0;
      renderedCanvas=null;
    }

    // Rebuild clickable links over the rasterized pages.
    const docRect=doc.getBoundingClientRect();
    const mmX=210/cssWidth;
    doc.querySelectorAll('[data-pdf-link]').forEach(el=>{
      const r=el.getBoundingClientRect();
      const top=r.top-docRect.top, bottom=r.bottom-docRect.top;
      for(let page=0;page<totalPages;page++){
        const pageTop=pageCuts[page];
        const pageBottom=pageCuts[page+1];
        const visibleTop=Math.max(top,pageTop);
        const visibleBottom=Math.min(bottom,pageBottom);
        if(visibleBottom<=visibleTop) continue;
        const mmY=210/cssWidth;
        const x=(r.left-docRect.left)*mmX;
        const y=(visibleTop-pageTop)*mmY;
        const w=Math.max(2,r.width*mmX);
        const h=Math.max(3,(visibleBottom-visibleTop)*mmY);
        if(el.href){pdf.setPage(page+1);pdf.link(x,y,w,h,{url:el.href});}
      }
    });

    showPdfProgress('Finalizzazione del PDF e apertura dell’anteprima…');
    const blob=pdf.output('blob');
    const blobUrl=URL.createObjectURL(blob);
    if(outputWindow&&!outputWindow.closed){
      outputWindow.location.replace(blobUrl);
      showPdfProgress('Anteprima PDF aperta in una nuova scheda. Da lì puoi visualizzare, stampare o scaricare.');
      window.setTimeout(()=>{URL.revokeObjectURL(blobUrl);progress.remove();},300000);
    }else{
      // Popup blocked: do not download automatically. Offer an explicit link.
      progress.textContent='Il browser ha bloccato la nuova scheda. Apri manualmente l’anteprima PDF:';
      const openLink=document.createElement('a');
      openLink.href=blobUrl; openLink.target='_blank'; openLink.rel='noopener';
      openLink.textContent=' Apri PDF'; openLink.style.cssText='display:inline-block;margin-left:8px;color:#fff;text-decoration:underline;font-weight:800';
      progress.appendChild(openLink);
      window.setTimeout(()=>{URL.revokeObjectURL(blobUrl);progress.remove();},300000);
    }
  }catch(err){
    console.error('Errore generazione PDF:',err);
    outputWindow?.close();
    progress.textContent='Generazione PDF non riuscita. Riprova; se il problema persiste, prova un documento più breve o aggiorna la pagina.';
    window.setTimeout(()=>progress.remove(),7000);
  }finally{
    if(renderedCanvas){renderedCanvas.width=0;renderedCanvas.height=0;}
    document.body.classList.remove('pdf-rendering');
    holder.remove();
  }
}
function quoteBusinessCheck(form){
 const service=form.id==='service-form',ids=service?{base:'s-price',iva:'s-iva',deposit:'s-deposit',discount:null,validity:'s-validity',date:'s-date'}:{base:'e-price',iva:'e-iva',deposit:'e-deposit',discount:'e-discount',validity:'e-validity',date:'e-date'};
 const v=id=>document.getElementById(id).value.trim(),n=id=>numberIT(v(id)),pattern=/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:[,.]\d{1,2})?$/;
 for(const id of [ids.base,ids.iva,ids.deposit,ids.discount].filter(Boolean))if(v(id)&&!pattern.test(v(id).replace(/[€\s]/g,''))){alert('Controlla gli importi: numeri validi e massimo due decimali.');return false;}
 const base=n(ids.base),iva=n(ids.iva),dep=n(ids.deposit),discount=ids.discount?n(ids.discount):0;
 if(!v(ids.base)||base<0||iva<0||iva>100||dep<0||discount<0||discount>base){alert('Imponibile, IVA, sconto e acconto non sono coerenti.');return false;}
 if(dep>(base-discount)*(1+iva/100)+.01){alert('L’acconto non può superare il totale.');return false;}
 const days=Number(v(ids.validity));if(!Number.isInteger(days)||days<1||days>365){alert('Validità in giorni richiesta (da 1 a 365).');return false;}
 if(!v(ids.date)){alert('Inserisci la data di emissione.');return false;}
 if(!service){const rows=getRows();if(rows.some(r=>r.quantita<0||r.prezzo<0)){alert('Quantità e prezzi non possono essere negativi.');return false;}if(rows.length){const sum=rows.reduce((s,r)=>s+r.totale,0);if(Math.abs(sum-base)>.02){alert('Subtotale lavorazioni '+euro(sum)+' diverso dall’imponibile '+euro(base)+'. Correggi prima di generare il PDF.');return false;}}}
 return true;
}
$('#service-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!requiredCheck(e.currentTarget)||!quoteBusinessCheck(e.currentTarget))return;
  const name=$('#s-name').value.trim().replace(/\s+/g,'_')||'Cliente';
  const outputWindow=preparePdfOutputWindow();
  await downloadPDF(buildServicePDF(),`Preventivo_Abilart_${name}.pdf`,outputWindow);
});
$('#edile-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!requiredCheck(e.currentTarget)||!quoteBusinessCheck(e.currentTarget))return;
  const name=$('#e-name').value.trim().replace(/\s+/g,'_')||'Cliente';
  const outputWindow=preparePdfOutputWindow();
  await downloadPDF(buildEdilePDF(),`Preventivo_Edile_Abilart_${name}.pdf`,outputWindow);
});

document.addEventListener('DOMContentLoaded',()=>{
  const today=localISODate();
  $('#s-date').value=today; $('#e-date').value=today;
  serviceCalc(); edileCalc();
});