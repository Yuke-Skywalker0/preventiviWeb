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

function pdfBase(title, number, date){
  return `<div class="pdf-document">
    <div class="pdf-header">
      <div><div class="pdf-brand">ABILART SRLS</div><div class="pdf-sub">Soluzioni Artigiane d'Eccellenza</div></div>
      <div class="pdf-meta"><span>DOCUMENTO NUMERO</span><strong>${escapeHtml(number)}</strong><span>DATA: ${escapeHtml(date)}</span></div>
    </div>
    <div style="margin-top:8px;font-size:8.5px;color:#68757d">Sede Legale: Lissone (MB) · Michele, Il tuo Tecnico</div>
    <div class="pdf-section"><div class="pdf-title">${escapeHtml(title)}</div>`;
}

function pdfClientTable(data){
  return `<div class="pdf-box"><table class="pdf-data">
    <tr><td width="50%"><span class="pdf-label">Nome e Cognome</span><strong>${escapeHtml(data.name)}</strong></td><td width="50%"><span class="pdf-label">C.F. / P.IVA</span>${escapeHtml(data.tax)}</td></tr>
    <tr><td><span class="pdf-label">Indirizzo</span>${escapeHtml(data.address)}, ${escapeHtml(data.zip)} ${escapeHtml(data.city)}</td><td><span class="pdf-label">Contatti</span>${escapeHtml(data.phone)} · ${escapeHtml(data.email)}</td></tr>
    ${data.reference!==undefined?`<tr><td colspan="2"><span class="pdf-label">Riferimento cantiere / interno / scala</span>${escapeHtml(data.reference||'—')}</td></tr>`:''}
  </table></div>`;
}

function pdfDescription(html){return `<div class="pdf-box" style="min-height:100px;font-size:9px;line-height:1.55">${html}</div>`}

function pdfEconomy(base,discount,dep,ivaP){
  const net=Math.max(0,base-discount), iva=net*ivaP/100, total=net+iva, balance=Math.max(0,total-dep);
  return `<table class="pdf-money">
    <tr><td>Imponibile</td><td align="right">${euro(base)}</td></tr>
    ${discount>0?`<tr><td>Sconto</td><td align="right">− ${euro(discount)}</td></tr>`:''}
    <tr><td>Imponibile netto</td><td align="right">${euro(net)}</td></tr>
    <tr><td>IVA ${escapeHtml(ivaP)}%</td><td align="right">${euro(iva)}</td></tr>
    <tr><td>Acconto</td><td align="right">${euro(dep)}</td></tr>
    <tr class="pdf-total"><td>TOTALE COMPLESSIVO</td><td align="right">${euro(total)}</td></tr>
    <tr><td><strong>Saldo residuo</strong></td><td align="right"><strong>${euro(balance)}</strong></td></tr>
  </table>`;
}

function signatureImg(data){
  return data ? `<img src="${data}" alt="Firma cliente">` : '';
}

const serviceTermsHTML = document.querySelector('#service-form .terms-box').innerHTML;
const edileTermsHTML = document.querySelector('#edile-form .terms-box').innerHTML;

function buildServicePDF(){
  const d={
    name:$('#s-name').value,address:$('#s-address').value,zip:$('#s-zip').value,city:$('#s-city').value,
    phone:$('#s-phone').value,email:$('#s-email').value,tax:$('#s-tax').value
  };
  const base=numberIT($('#s-price').value), dep=numberIT($('#s-deposit').value), ivaP=numberIT($('#s-iva').value);
  const number='PREV-'+new Date().toISOString().slice(0,10);
  const date=dateIT($('#s-date').value);
  const desc=cleanEditorHtml($('#service-editor'));
  return pdfBase('PREVENTIVO / CONTRATTO',number,date)+`
    ${pdfClientTable(d)}
    <div class="pdf-section"><div class="pdf-title">DATI DELL'INTERVENTO</div><div class="pdf-box"><table class="pdf-data">
      <tr><td width="50%"><span class="pdf-label">Categoria</span>${escapeHtml($('#s-category').value)}</td><td width="50%"><span class="pdf-label">Data intervento</span>${escapeHtml(date)}</td></tr>
    </table></div></div>
    <div class="pdf-section"><div class="pdf-title">OGGETTO DELLA PRESTAZIONE D'OPERA</div>${pdfDescription(desc)}</div>
    <div class="pdf-section"><div class="pdf-title">RIEPILOGO ECONOMICO</div><div class="pdf-box">${pdfEconomy(base,0,dep,ivaP)}</div></div>
    <div class="pdf-section"><div class="pdf-title">CONDIZIONI GENERALI DI FORNITURA</div><div class="pdf-box pdf-terms">${serviceTermsHTML}</div></div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">FIRMA TECNICO APPALTANTE</span><br><br><strong>Michele (Abilart Srls)</strong><br><span>Documento predisposto digitalmente</span></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['s-signature'].data())}<span>Data: ${escapeHtml(date)}</span></div>
    </div>
    <div class="pdf-footer">Abilart Srls · Lissone (MB) · idraulicoservizi.com · Documento generato digitalmente</div>
  </div>`;
}

function buildEdilePDF(){
  const d={name:$('#e-name').value,address:$('#e-address').value,zip:$('#e-zip').value,city:$('#e-city').value,phone:$('#e-phone').value,email:$('#e-email').value,tax:$('#e-tax').value,reference:$('#e-reference').value};
  const base=numberIT($('#e-price').value), discount=Math.min(Math.max(0,numberIT($('#e-discount').value)),base), dep=Math.max(0,numberIT($('#e-deposit').value)), ivaP=numberIT($('#e-iva').value);
  const number='PREV-EDILE-'+new Date().toISOString().slice(0,10), date=dateIT($('#e-date').value), desc=cleanEditorHtml($('#edile-editor'));
  const rows=getRows();
  const rowsHTML=rows.length?rows.map(r=>`<tr><td>${escapeHtml(r.voce)}</td><td>${escapeHtml(r.descrizione)}</td><td align="center">${escapeHtml(r.quantita)}</td><td align="center">${escapeHtml(r.unita)}</td><td align="right">${euro(r.prezzo)}</td><td align="right">${euro(r.totale)}</td></tr>`).join(''):`<tr><td colspan="6" align="center">Nessuna lavorazione dettagliata inserita.</td></tr>`;
  const tableSubtotal=rows.reduce((s,r)=>s+r.totale,0);
  return pdfBase('PREVENTIVO EDILE',number,date)+`
    ${pdfClientTable(d)}
    <div class="pdf-section"><div class="pdf-title">DATI INTERVENTO / PREVENTIVO</div><div class="pdf-box"><table class="pdf-data">
      <tr><td width="33%"><span class="pdf-label">Categoria</span>${escapeHtml($('#e-category').value)}</td><td width="33%"><span class="pdf-label">Tipologia lavoro</span>${escapeHtml($('#e-type').value)}</td><td width="34%"><span class="pdf-label">Data</span>${escapeHtml(date)}</td></tr>
      <tr><td><span class="pdf-label">Superficie indicativa</span>${escapeHtml($('#e-area').value||'—')} mq</td><td><span class="pdf-label">Durata stimata</span>${escapeHtml($('#e-duration').value||'—')}</td><td><span class="pdf-label">Urgenza</span>${escapeHtml($('#e-urgency').value)}</td></tr>
    </table></div></div>
    <div class="pdf-section"><div class="pdf-title">OGGETTO DELLA PRESTAZIONE D'OPERA</div>${pdfDescription(desc)}</div>
    <div class="pdf-section"><div class="pdf-title">DETTAGLIO VOCI DI PREVENTIVO</div><table class="pdf-table"><thead><tr><th>Voce</th><th>Descrizione</th><th>Qtà</th><th>Unità</th><th>Prezzo unitario</th><th>Totale</th></tr></thead><tbody>${rowsHTML}</tbody></table><div style="text-align:right;font-size:9px;margin-top:7px"><strong>Subtotale lavorazioni: ${euro(tableSubtotal)}</strong></div></div>
    <div class="pdf-section"><div class="pdf-title">RIEPILOGO ECONOMICO</div><div class="pdf-box">${pdfEconomy(base,discount,dep,ivaP)}<div style="font-size:8px;color:#68757d;margin-top:7px">Metodo di pagamento: ${escapeHtml($('#e-payment').value)} · Validità: ${escapeHtml($('#e-validity').value||'—')}</div></div></div>
    <div class="pdf-section"><div class="pdf-title">CONDIZIONI GENERALI DI CONTRATTO</div><div class="pdf-box pdf-terms">${edileTermsHTML}</div></div>
    <div class="pdf-signatures">
      <div class="pdf-signature"><span class="pdf-label">FIRMA TECNICO APPALTANTE</span><br><br><strong>Michele (Abilart Srls)</strong><br><span>Documento predisposto digitalmente</span></div>
      <div class="pdf-signature"><span class="pdf-label">FIRMA DEL CLIENTE PER ACCETTAZIONE</span>${signatureImg(signatures['e-signature'].data())}<span>Data: ${escapeHtml(date)}</span></div>
    </div>
    <div class="pdf-footer">Abilart Srls · Lissone (MB) · idraulicoservizi.com · Documento generato digitalmente</div>
  </div>`;
}

async function downloadPDF(html, filename){
  if(typeof html2pdf==='undefined'){
    alert('Il motore PDF non è stato caricato. Controlla la connessione Internet e ricarica la pagina.');
    return;
  }
  const holder=document.createElement('div');
  holder.style.position='fixed'; holder.style.left='-100000px'; holder.style.top='0'; holder.style.width='794px'; holder.style.background='#fff';
  holder.innerHTML=html; document.body.appendChild(holder);
  const element=holder.firstElementChild;
  const options={
    margin:[8,8,8,8],
    filename,
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
    pagebreak:{mode:['css','legacy']}
  };
  try{ await html2pdf().set(options).from(element).save(); }
  finally{ holder.remove(); }
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
