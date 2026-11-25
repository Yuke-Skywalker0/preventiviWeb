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
      ${discount>0?`<tr><td>Sconto</td><td>− ${euro(discount)}</td></tr><tr><td>Imponibile netto</td><td>${euro(net)}</td></tr>`:''}
      <tr><td>IVA</td><td>${escapeHtml(ivaP)}% &nbsp;&nbsp; ${euro(iva)}</td></tr>
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
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['s-signature'].data())}<span class="pdf-sign-date">Data di accettazione: ${dateIT(localISODate())}</span></div>
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
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['e-signature'].data())}<span class="pdf-sign-date">Data di accettazione: ${dateIT(localISODate())}</span></div>
    </div>`;
  return pdfDocument('PREVENTIVO EDILE',number,date,content);
}

function showPdfProgress(message){let p=document.getElementById('pdf-generation-status');if(!p){p=document.createElement('div');p.id='pdf-generation-status';p.setAttribute('role','status');p.style.cssText='position:fixed;z-index:99999;top:16px;left:50%;transform:translateX(-50%);background:#173f57;color:white;padding:12px 18px;border-radius:10px;font:600 14px system-ui';document.body.appendChild(p);}p.textContent=message;return p;}
async function downloadPDF(html,filename){
 if(!window.AbilartPDFRenderer?.render||!window.jspdf?.jsPDF){alert('Il motore PDF non è disponibile. Ricarica la pagina e riprova.');return;}
 const status=showPdfProgress('Impaginazione professionale del PDF…');
 try{
  const pdf=await window.AbilartPDFRenderer.render(html,filename);
  status.textContent='PDF pronto · download avviato';
  // jsPDF.save invokes the browser's download flow; no popup or PDF preview is opened.
  pdf.save(filename);
  setTimeout(()=>status.remove(),1200);
 }catch(err){console.error('PDF generation',err);status.textContent='Impossibile generare il PDF. Riprova.';setTimeout(()=>status.remove(),6000);}
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
  await downloadPDF(buildServicePDF(),`Preventivo_Abilart_${name}.pdf`);
});
$('#edile-form').addEventListener('submit',async e=>{
  e.preventDefault(); if(!requiredCheck(e.currentTarget)||!quoteBusinessCheck(e.currentTarget))return;
  const name=$('#e-name').value.trim().replace(/\s+/g,'_')||'Cliente';
  await downloadPDF(buildEdilePDF(),`Preventivo_Edile_Abilart_${name}.pdf`);
});

document.addEventListener('DOMContentLoaded',()=>{
  const today=localISODate();
  $('#s-date').value=today; $('#e-date').value=today;
  serviceCalc(); edileCalc();
});