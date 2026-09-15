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


function telHref(value){
  const digits=String(value||'').replace(/[^0-9+]/g,'');
  return digits ? `tel:${digits}` : '';
}

function mailHref(value){
  const email=String(value||'').trim();
  return email ? `mailto:${encodeURIComponent(email)}` : '';
}

function mapsHref(address, zip, city){
  const text=[address,zip,city].filter(Boolean).join(', ');
  return text ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}` : '';
}

function pdfPageHeader(title, number, date, pageLabel=''){
  return `<div class="pdf-page-header">
    <div class="pdf-company">
      <img class="pdf-logo" src="assets/abilart-logo.png" alt="Abilart Srls">
      <div class="pdf-company-info">
        <strong>ABILART SRLS</strong>
        <span>P. IVA / C.F. 10439280966</span>
        <a href="https://www.google.com/maps/search/?api=1&query=Via+Caprera+2%2C+20851+Lissone+MB" data-pdf-link="address">Via Caprera 2, 20851 Lissone (MB)</a>
        <span>Zone operative: Monza, Milano, Bergamo e relative province</span>
        <span class="pdf-company-links">
          <a href="tel:+393204295445" data-pdf-link="phone">+39 320 429 5445</a>
          <a href="https://wa.me/393204295445" data-pdf-link="whatsapp">WhatsApp</a>
          <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a>
        </span>
      </div>
    </div>
    <div class="pdf-meta">
      <span>DOCUMENTO NUMERO</span>
      <strong>${escapeHtml(number)}</strong>
      <span>DATA: ${escapeHtml(date)}</span>
      ${pageLabel?`<em>${escapeHtml(pageLabel)}</em>`:''}
    </div>
  </div>
  ${pageLabel?`<div class="pdf-doc-type">${escapeHtml(title)}</div>`:''}`;
}

function pdfSectionTitle(title){
  return `<div class="pdf-title">${escapeHtml(title)}</div>`;
}

function pdfClientBox(data){
  const phone=escapeHtml(data.phone||'—');
  const email=escapeHtml(data.email||'—');
  const phoneHref=telHref(data.phone);
  const emailHref=mailHref(data.email);
  const addressText=[data.address, data.zip, data.city].filter(Boolean).join(', ');
  const addressHref=mapsHref(data.address,data.zip,data.city);
  return `<div class="pdf-box">
    <table class="pdf-data">
      <tr>
        <td><span class="pdf-label">NOME E COGNOME</span><strong>${escapeHtml(data.name||'—')}</strong></td>
        <td><span class="pdf-label">CODICE FISCALE / PARTITA IVA</span>${escapeHtml(data.tax||'—')}</td>
      </tr>
      <tr>
        <td><span class="pdf-label">INDIRIZZO</span>${addressHref && addressText ? `<a class="pdf-data-link" href="${addressHref}" data-pdf-link="client-address">${escapeHtml(addressText)}</a>` : escapeHtml(addressText||'—')}</td>
        <td><span class="pdf-label">CONTATTI</span>${phoneHref ? `<a class="pdf-data-link" href="${phoneHref}" data-pdf-link="client-phone">${phone}</a>` : phone} &nbsp;|&nbsp; ${emailHref ? `<a class="pdf-data-link" href="${emailHref}" data-pdf-link="client-email">${email}</a>` : email}</td>
      </tr>
      ${data.reference!==undefined?`<tr><td colspan="2"><span class="pdf-label">RIFERIMENTO CANTIERE / INTERNO / SCALA</span>${escapeHtml(data.reference||'—')}</td></tr>`:''}
    </table>
  </div>`;
}

function pdfDescription(html){
  return `<div class="pdf-box pdf-description">${html}</div>`;
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
  return `<div class="pdf-footer">
    <div class="pdf-footer-brand">
      <strong>ABILART SRLS</strong>
      <span>P. IVA / C.F. 10439280966</span>
    </div>
    <div class="pdf-footer-contact">
      <a href="tel:+393204295445" data-pdf-link="phone">+39 320 429 5445</a>
      <a href="https://wa.me/393204295445" data-pdf-link="whatsapp">WhatsApp</a>
      <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a>
    </div>
    <div class="pdf-footer-sites">
      <a href="https://impresaedileabilart.com/" data-pdf-link="site1">impresaedileabilart.com</a>
      <a href="https://idraulicoservizi.com/" data-pdf-link="site2">idraulicoservizi.com</a>
    </div>
    <a class="pdf-footer-address" href="https://www.google.com/maps/search/?api=1&query=Via+Caprera+2%2C+20851+Lissone+MB" data-pdf-link="address">Via Caprera 2 · Lissone (MB)</a>
  </div>`;
}

function pdfPage(content, number, date, title, pageLabel=''){
  return `<section class="pdf-page">
    ${pdfPageHeader(title,number,date,pageLabel)}
    <div class="pdf-page-body">${content}</div>
    ${pdfFooter()}
  </section>`;
}

function getTermsHTML(source){
  const ol=source.querySelector('ol');
  if(!ol) return [];
  return [...ol.children].map((li,i)=>`<li>${li.innerHTML}</li>`);
}

function termsBlock(items){
  return `<div class="pdf-terms-box"><ol start="${items.start||1}">${items.html.join('')}</ol></div>`;
}

function buildServicePDF(){
  const d={
    name:$('#s-name').value,address:$('#s-address').value,zip:$('#s-zip').value,city:$('#s-city').value,
    phone:$('#s-phone').value,email:$('#s-email').value,tax:$('#s-tax').value
  };
  const base=numberIT($('#s-price').value), dep=numberIT($('#s-deposit').value), ivaP=numberIT($('#s-iva').value);
  const number=docNumber('PREV'), date=dateIT($('#s-date').value), desc=cleanEditorHtml($('#service-editor'));
  const terms=getTermsHTML(document.querySelector('#service-form .terms-box'));
  const p1=`
    ${pdfSectionTitle('DATI DEL COMMITTENTE')}
    ${pdfClientBox(d)}
    ${pdfSectionTitle("DATI DELL'INTERVENTO")}
    <div class="pdf-box"><table class="pdf-data"><tr><td><span class="pdf-label">CATEGORIA INTERVENTO</span>${escapeHtml($('#s-category').value||'—')}</td><td><span class="pdf-label">DATA INTERVENTO</span>${escapeHtml(date||'—')}</td></tr></table></div>
    ${pdfSectionTitle("OGGETTO DELLA PRESTAZIONE D'OPERA")}
    ${pdfDescription(desc)}
    ${pdfSectionTitle('RIEPILOGO ECONOMICO')}
    ${pdfEconomy(base,0,dep,ivaP)}
    <div class="pdf-payment pdf-payment-single"><div><span>VALIDITÀ DEL PREVENTIVO</span><strong>${escapeHtml($('#s-validity').value||'—')}</strong></div></div>
  `;
  const p2=`
    ${pdfSectionTitle('CONDIZIONI GENERALI DI FORNITURA')}
    <div class="pdf-terms-box"><ol>${terms.map(x=>x).join('')}</ol></div>
    <div class="pdf-acceptance">Il committente dichiara di aver letto e accettato integralmente le condizioni sopra riportate.</div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">FIRMA TECNICO APPALTANTE</span><div class="pdf-sign-space"></div><strong>Michele (Abilart Srls)</strong><small>Documento predisposto digitalmente</small></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['s-signature'].data())}<span class="pdf-sign-date">Data: ${escapeHtml(date||'—')}</span></div>
    </div>
  `;
  return `<div class="pdf-document">${pdfPage(p1,number,date,'PREVENTIVO / CONTRATTO','PAGINA 1 / 2')}${pdfPage(p2,number,date,'PREVENTIVO / CONTRATTO','PAGINA 2 / 2')}</div>`;
}

function buildEdilePDF(){
  const d={name:$('#e-name').value,address:$('#e-address').value,zip:$('#e-zip').value,city:$('#e-city').value,phone:$('#e-phone').value,email:$('#e-email').value,tax:$('#e-tax').value,reference:$('#e-reference').value};
  const base=numberIT($('#e-price').value), discount=Math.min(Math.max(0,numberIT($('#e-discount').value)),base), dep=Math.max(0,numberIT($('#e-deposit').value)), ivaP=numberIT($('#e-iva').value);
  const number=docNumber('PREV-EDILE'), date=dateIT($('#e-date').value), desc=cleanEditorHtml($('#edile-editor'));
  const rows=getRows();
  const rowsHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.voce||'—')}</td><td>${escapeHtml(r.descrizione||'—')}</td><td class="center">${escapeHtml(r.quantita)}</td><td class="center">${escapeHtml(r.unita)}</td><td class="right">${euro(r.prezzo)}</td><td class="right">${euro(r.totale)}</td></tr>`).join(''):`<tr><td colspan="6" class="center muted">Nessuna lavorazione dettagliata inserita.</td></tr>`;
  const tableSubtotal=rows.reduce((s,r)=>s+r.totale,0);
  const terms=getTermsHTML(document.querySelector('#edile-form .terms-box'));
  const terms1=terms.slice(0,8), terms2=terms.slice(8);
  const p1=`
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
    <table class="pdf-table"><thead><tr><th>Voce</th><th>Descrizione</th><th>Qtà</th><th>Unità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead><tbody>${rowsHTML}</tbody></table>
    <div class="pdf-table-subtotal"><span>Subtotale lavorazioni</span><strong>${euro(tableSubtotal)}</strong></div>
  `;
  const p2=`
    ${pdfSectionTitle('RIEPILOGO ECONOMICO')}
    ${pdfEconomy(base,discount,dep,ivaP)}
    <div class="pdf-payment"><div><span>METODO DI PAGAMENTO</span><strong>${escapeHtml($('#e-payment').value||'—')}</strong></div><div><span>VALIDITÀ DEL PREVENTIVO</span><strong>${escapeHtml($('#e-validity').value||'—')}</strong></div></div>
    ${pdfSectionTitle('CONDIZIONI GENERALI DI CONTRATTO')}
    <div class="pdf-terms-grid">
      <div class="pdf-terms-column"><ol>${terms1.slice(0,4).join('')}</ol></div>
      <div class="pdf-terms-column"><ol start="5">${terms1.slice(4,8).join('')}</ol></div>
    </div>
  `;
  const p3=`
    ${pdfSectionTitle('CONDIZIONI GENERALI DI CONTRATTO — SEGUE')}
    <div class="pdf-terms-grid">
      <div class="pdf-terms-column"><ol start="9">${terms2.slice(0,2).join('')}</ol></div>
      <div class="pdf-terms-column"><ol start="11">${terms2.slice(2).join('')}</ol></div>
    </div>
    <div class="pdf-acceptance">Ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile, il committente dichiara di aver letto e approvato specificamente le clausole relative a corrispettivi, varianti, responsabilità, tempi di esecuzione, foro competente e trattamento dei dati personali.</div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">FIRMA TECNICO APPALTANTE</span><div class="pdf-sign-space"></div><strong>Michele (Abilart Srls)</strong><small>Documento firmato digitalmente</small></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['e-signature'].data())}<span class="pdf-sign-date">Data: ${escapeHtml(date||'—')}</span></div>
    </div>
  `;
  return `<div class="pdf-document">${pdfPage(p1,number,date,'PREVENTIVO EDILE','PAGINA 1 / 3')}${pdfPage(p2,number,date,'PREVENTIVO EDILE','PAGINA 2 / 3')}${pdfPage(p3,number,date,'PREVENTIVO EDILE','PAGINA 3 / 3')}</div>`;
}

function makePdfPage(title, number, date, pageLabel, bodyHtml){
  return `<section class="pdf-page">
    ${pdfPageHeader(title,number,date,pageLabel)}
    <div class="pdf-page-body">${bodyHtml}</div>
    ${pdfFooter()}
  </section>`;
}

function createPageFromSource(sourcePage, bodyHtml, pageIndex, total, title, number, date){
  const label=`PAGINA ${pageIndex} / ${total}`;
  const wrapper=document.createElement('div');
  wrapper.innerHTML=makePdfPage(title,number,date,label,bodyHtml);
  return wrapper.firstElementChild;
}

function groupPageBody(body){
  const nodes=[...body.children];
  const groups=[];
  let i=0;
  while(i<nodes.length){
    const node=nodes[i];
    if(node.classList.contains('pdf-title') && nodes[i+1]){
      const group=document.createElement('div');
      group.className='pdf-flow-section';
      group.append(node.cloneNode(true), nodes[i+1].cloneNode(true));
      groups.push(group);
      i+=2;
    }else{
      const group=document.createElement('div');
      group.className='pdf-flow-section';
      group.append(node.cloneNode(true));
      groups.push(group);
      i++;
    }
  }
  return groups;
}

function makeMeasurePage(title, number, date, bodyHtml=''){
  const probe=document.createElement('section');
  probe.className='pdf-page';
  probe.style.position='absolute';
  probe.style.left='-100000px';
  probe.style.top='0';
  probe.style.width='794px';
  probe.style.height='1123px';
  probe.innerHTML=`${pdfPageHeader(title,number,date,'PAGINA X / X')}<div class="pdf-page-body">${bodyHtml}</div>${pdfFooter()}`;
  document.body.appendChild(probe);
  return probe;
}

function groupFits(group, currentGroups, meta){
  const bodyHtml=[...currentGroups, group].map(g=>g.outerHTML).join('');
  const probe=makeMeasurePage(meta.title,meta.number,meta.date,bodyHtml);
  const body=probe.querySelector('.pdf-page-body');
  const fits=body.scrollHeight <= body.clientHeight + 1;
  probe.remove();
  return fits;
}

function measureSingleGroup(group, meta){
  const probe=makeMeasurePage(meta.title,meta.number,meta.date,group.outerHTML);
  const body=probe.querySelector('.pdf-page-body');
  const result={fits:body.scrollHeight<=body.clientHeight+1,height:body.scrollHeight,available:body.clientHeight};
  probe.remove();
  return result;
}

function splitDescriptionSection(section, meta){
  const desc=section.querySelector('.pdf-description');
  if(!desc) return null;
  const title=section.querySelector('.pdf-title')?.cloneNode(true);
  const source=[...desc.children];
  if(!source.length) return null;

  const chunks=[];
  let chunkNodes=[];
  const buildPart=(nodes, continuation=false)=>{
    const sec=document.createElement('div'); sec.className='pdf-flow-section';
    if(title){
      const t=title.cloneNode(true);
      if(continuation) t.textContent="OGGETTO DELLA PRESTAZIONE D'OPERA — SEGUE";
      sec.appendChild(t);
    }
    const box=desc.cloneNode(false);
    nodes.forEach(n=>box.appendChild(n.cloneNode(true)));
    sec.appendChild(box);
    return sec;
  };

  for(const node of source){
    const candidate=buildPart([...chunkNodes,node],chunks.length>0);
    const m=measureSingleGroup(candidate,meta);
    if(!m.fits && chunkNodes.length){
      chunks.push(buildPart(chunkNodes,chunks.length>0));
      chunkNodes=[node];
      // If one paragraph/list is itself too large, split its text into word chunks.
      const single=buildPart(chunkNodes,true);
      if(!measureSingleGroup(single,meta).fits){
        const text=node.textContent||'';
        if(text.trim()){
          const words=text.split(/\s+/).filter(Boolean);
          let part=[];
          for(const word of words){
            const probeNode=document.createElement(node.tagName||'p');
            probeNode.className=node.className||'';
            probeNode.textContent=[...part,word].join(' ');
            const test=buildPart(part.concat([probeNode]),true);
            if(!measureSingleGroup(test,meta).fits && part.length){
              const finalNode=document.createElement(node.tagName||'p');
              finalNode.className=node.className||'';
              finalNode.textContent=part.join(' ');
              chunks.push(buildPart([finalNode],true));
              part=[word];
            }else part.push(word);
          }
          if(part.length){
            const finalNode=document.createElement(node.tagName||'p');
            finalNode.className=node.className||'';
            finalNode.textContent=part.join(' ');
            chunkNodes=[finalNode];
          }else chunkNodes=[];
        }
      }
    }else{
      chunkNodes.push(node);
    }
  }
  if(chunkNodes.length) chunks.push(buildPart(chunkNodes,chunks.length>0));
  return chunks.length>1 ? chunks : null;
}

function splitTermsBox(section, meta){
  const box=section.querySelector('.pdf-terms-box');
  if(!box) return null;
  const ol=box.querySelector('ol');
  const lis=ol?[...ol.children]:[];
  if(!lis.length) return null;
  const title=section.querySelector('.pdf-title')?.cloneNode(true);
  const parts=[]; let current=[];
  const makePart=(items, continuation)=>{
    const sec=document.createElement('div'); sec.className='pdf-flow-section';
    if(title){const t=title.cloneNode(true); if(continuation)t.textContent='CONDIZIONI GENERALI DI FORNITURA — SEGUE'; sec.appendChild(t);}
    const b=box.cloneNode(false); const o=ol.cloneNode(false);
    if(items[0]) o.setAttribute('start',items[0].dataset.pdfIndex||'1');
    items.forEach(li=>o.appendChild(li.cloneNode(true))); b.appendChild(o); sec.appendChild(b); return sec;
  };
  lis.forEach((li,i)=>{li.dataset.pdfIndex=String(i+1); const cand=makePart([...current,li],parts.length>0); if(!measureSingleGroup(cand,meta).fits&&current.length){parts.push(makePart(current,parts.length>0)); current=[li];} else current.push(li);});
  if(current.length)parts.push(makePart(current,parts.length>0));
  return parts.length>1?parts:null;
}

function splitTermsGrid(section, meta){
  const cols=[...section.querySelectorAll('.pdf-terms-column')];
  if(!cols.length) return null;
  const title=section.querySelector('.pdf-title')?.cloneNode(true);
  const items=[];
  cols.forEach(col=>[...col.querySelectorAll('li')].forEach(li=>items.push(li.cloneNode(true))));
  if(!items.length) return null;
  const parts=[]; let current=[];
  const makePart=(arr,continuation)=>{
    const sec=document.createElement('div'); sec.className='pdf-flow-section';
    if(title){const t=title.cloneNode(true); if(continuation)t.textContent='CONDIZIONI GENERALI DI CONTRATTO — SEGUE'; sec.appendChild(t);}
    const grid=document.createElement('div'); grid.className='pdf-terms-grid';
    const left=document.createElement('div'); left.className='pdf-terms-column';
    const right=document.createElement('div'); right.className='pdf-terms-column';
    const ol1=document.createElement('ol'), ol2=document.createElement('ol');
    arr.forEach((li,idx)=>{ const target=idx<Math.ceil(arr.length/2)?ol1:ol2; target.appendChild(li.cloneNode(true)); });
    left.appendChild(ol1); right.appendChild(ol2); grid.append(left,right); sec.appendChild(grid); return sec;
  };
  items.forEach(li=>{const cand=makePart([...current,li],parts.length>0); if(!measureSingleGroup(cand,meta).fits&&current.length){parts.push(makePart(current,parts.length>0)); current=[li];}else current.push(li);});
  if(current.length)parts.push(makePart(current,parts.length>0));
  return parts.length>1?parts:null;
}

function splitTableSection(section, meta){
  const table=section.querySelector('.pdf-table');
  if(!table) return null;
  const rows=[...table.querySelectorAll('tbody tr')];
  if(!rows.length) return null;
  const title=section.querySelector('.pdf-title')?.cloneNode(true);
  const parts=[]; let current=[];
  const makePart=(arr,continuation)=>{
    const sec=document.createElement('div'); sec.className='pdf-flow-section';
    if(title){const t=title.cloneNode(true); if(continuation)t.textContent='DETTAGLIO VOCI DI PREVENTIVO — SEGUE'; sec.appendChild(t);}
    const t=table.cloneNode(false); t.innerHTML='';
    const thead=table.querySelector('thead'); if(thead)t.appendChild(thead.cloneNode(true));
    const tbody=document.createElement('tbody'); arr.forEach(r=>tbody.appendChild(r.cloneNode(true))); t.appendChild(tbody); sec.appendChild(t); return sec;
  };
  rows.forEach(row=>{const cand=makePart([...current,row],parts.length>0); if(!measureSingleGroup(cand,meta).fits&&current.length){parts.push(makePart(current,parts.length>0)); current=[row];}else current.push(row);});
  if(current.length)parts.push(makePart(current,parts.length>0));
  return parts.length>1?parts:null;
}

function splitOversizedGroup(group, meta){
  if(group.querySelector('.pdf-description')) return splitDescriptionSection(group,meta);
  if(group.querySelector('.pdf-terms-box')) return splitTermsBox(group,meta);
  if(group.querySelector('.pdf-terms-grid')) return splitTermsGrid(group,meta);
  if(group.querySelector('.pdf-table')) return splitTableSection(group,meta);
  return null;
}

function emergencyFitGroup(group, meta){
  // Last-resort protection for an unusual custom block: never cut it or place it
  // underneath the footer. Reduce only the block typography until it fits its own page.
  for(let scale=0.96; scale>=0.58; scale-=0.02){
    const clone=group.cloneNode(true);
    clone.style.fontSize=`${scale}em`;
    clone.querySelectorAll('*').forEach(el=>{
      const fs=getComputedStyle(el).fontSize;
      if(fs && !Number.isNaN(parseFloat(fs))) el.style.fontSize=`${parseFloat(fs)*scale}px`;
    });
    if(measureSingleGroup(clone,meta).fits) return clone;
  }
  return null;
}

function paginatePdfPages(holder){
  const original=[...holder.querySelectorAll('.pdf-page')];
  if(!original.length) return;
  const sourceDocuments=[];
  original.forEach(page=>{
    const body=page.querySelector('.pdf-page-body');
    const type=page.querySelector('.pdf-doc-type');
    const metaNumber=page.querySelector('.pdf-meta strong')?.textContent||'';
    const metaDate=(page.querySelector('.pdf-meta span:nth-of-type(2)')?.textContent||'').replace(/^DATA:\s*/,'');
    const title=type?.textContent||'PREVENTIVO / CONTRATTO';
    sourceDocuments.push({groups:groupPageBody(body),title,number:metaNumber,date:metaDate});
  });

  const generated=[];
  for(const doc of sourceDocuments){
    let current=[];
    const meta={title:doc.title,number:doc.number,date:doc.date};
    const flush=()=>{if(current.length){generated.push({...meta,groups:current});current=[];}};
    for(const group of doc.groups){
      if(groupFits(group,current,meta)){
        current.push(group); continue;
      }
      flush();
      if(groupFits(group,[],meta)){
        current=[group]; continue;
      }
      const parts=splitOversizedGroup(group,meta);
      if(parts && parts.length){
        parts.forEach(part=>{
          if(groupFits(part,[],meta)) generated.push({...meta,groups:[part]});
          else {
            const safe=emergencyFitGroup(part,meta);
            if(safe) generated.push({...meta,groups:[safe]});
            else throw new Error('Impossibile impaginare la sezione senza tagli.');
          }
        });
      }else{
        const safe=emergencyFitGroup(group,meta);
        if(safe) generated.push({...meta,groups:[safe]});
        else throw new Error('Impossibile impaginare la sezione senza tagli.');
      }
    }
    flush();
  }

  const total=generated.length;
  const documentRoot=document.createElement('div'); documentRoot.className='pdf-document';
  generated.forEach((pageData,idx)=>{
    const bodyHtml=pageData.groups.map(g=>g.outerHTML).join('');
    documentRoot.insertAdjacentHTML('beforeend',makePdfPage(pageData.title,pageData.number,pageData.date,`PAGINA ${idx+1} / ${total}`,bodyHtml));
  });
  holder.innerHTML=''; holder.appendChild(documentRoot);
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
    // First build the final page count from the real rendered heights. No body scaling is used:
    // content is moved to a new A4 page before rasterization, so nothing can cross the footer.
    paginatePdfPages(holder);
    const pages=[...holder.querySelectorAll('.pdf-page')];
    const { jsPDF } = window.jspdf;
    const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true,putOnlyUsedFonts:true});

    for(let i=0;i<pages.length;i++){
      const page=pages[i];
      page.style.width='794px'; page.style.height='1123px'; page.style.margin='0'; page.style.transform='none';
      const body=page.querySelector('.pdf-page-body');
      if(body && body.scrollHeight>body.clientHeight+1){
        throw new Error('Contenuto eccedente l\'area utile della pagina dopo la paginazione.');
      }
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const canvas=await html2canvas(page,{width:794,height:1123,windowWidth:794,windowHeight:1123,scale:2,useCORS:true,allowTaint:true,backgroundColor:'#fff',logging:false,scrollX:0,scrollY:0,imageTimeout:15000});
      if(i>0) pdf.addPage('a4','portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',0,0,210,297,undefined,'FAST');
      const pageRect=page.getBoundingClientRect();
      const pxToMmX=210/794, pxToMmY=297/1123;
      page.querySelectorAll('[data-pdf-link]').forEach(el=>{
        const href=el.getAttribute('href'); if(!href) return;
        const r=el.getBoundingClientRect();
        const x=Math.max(0,(r.left-pageRect.left-1)*pxToMmX), y=Math.max(0,(r.top-pageRect.top-1)*pxToMmY);
        const w=Math.min(210-x,Math.max(2,(r.width+2)*pxToMmX)), h=Math.min(297-y,Math.max(3,(r.height+2)*pxToMmY));
        pdf.link(x,y,w,h,{url:href});
      });
    }
    pdf.save(filename);
  }catch(err){
    console.error('Errore generazione PDF:',err);
    // Non mostrare alert bloccanti all'utente: la paginazione deve adattarsi alle lunghezze variabili.
    const status=document.querySelector('.pdf-status');
    if(status){ status.textContent="Impossibile completare l'impaginazione automatica."; status.classList.add('error'); }
  }finally{
    document.body.classList.remove('pdf-rendering'); holder.remove();
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
