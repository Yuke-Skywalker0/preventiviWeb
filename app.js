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

function pdfPageHeader(title, number, date, pageLabel=''){
  return `<div class="pdf-page-header">
    <div class="pdf-company">
      <img class="pdf-logo" src="assets/abilart-logo.png" alt="Abilart Srls">
      <div class="pdf-company-meta">Sede Legale: Lissone (MB) &nbsp;|&nbsp; Michele, Il tuo Tecnico</div>
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
  return `<div class="pdf-box">
    <table class="pdf-data">
      <tr>
        <td><span class="pdf-label">NOME E COGNOME</span><strong>${escapeHtml(data.name||'—')}</strong></td>
        <td><span class="pdf-label">CODICE FISCALE / PARTITA IVA</span>${escapeHtml(data.tax||'—')}</td>
      </tr>
      <tr>
        <td><span class="pdf-label">INDIRIZZO</span>${escapeHtml(data.address||'—')}${data.zip||data.city?`, ${escapeHtml(data.zip||'')} ${escapeHtml(data.city||'')}`:''}</td>
        <td><span class="pdf-label">CONTATTI</span>${escapeHtml(data.phone||'—')} &nbsp;|&nbsp; ${escapeHtml(data.email||'—')}</td>
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
      <span>Soluzioni Artigiane d'Eccellenza</span>
    </div>
    <div class="pdf-footer-contact">
      <a href="tel:+393204295445" data-pdf-link="phone">+39 320 429 5445</a>
      <a href="mailto:abilart.impresaedile@gmail.com" data-pdf-link="email">abilart.impresaedile@gmail.com</a>
    </div>
    <div class="pdf-footer-sites">
      <a href="https://impresaedileabilart.com/" data-pdf-link="site1">impresaedileabilart.com</a>
      <a href="https://idraulicoservizi.com/" data-pdf-link="site2">idraulicoservizi.com</a>
    </div>
    <span class="pdf-footer-copy">© ${new Date().getFullYear()}</span>
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

  const pages=[...holder.querySelectorAll('.pdf-page')];
  if(!pages.length){
    document.body.classList.remove('pdf-rendering');
    holder.remove();
    alert('Nessuna pagina PDF da generare.');
    return;
  }

  try{
    // Render each already-designed A4 page independently. This avoids the
    // automatic scaling/reflow performed by html2pdf and keeps the document
    // perfectly centered at 100% of the A4 page width.
    const { jsPDF } = window.jspdf;
    const pdf=new jsPDF({
      unit:'mm',
      format:'a4',
      orientation:'portrait',
      compress:true,
      putOnlyUsedFonts:true
    });

    for(let i=0;i<pages.length;i++){
      const page=pages[i];

      // Make absolutely sure the page has the exact CSS pixel dimensions used
      // by the PDF template before taking the screenshot.
      page.style.width='794px';
      page.style.height='1123px';
      page.style.margin='0';
      page.style.transform='none';

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // The A4 page has a strictly reserved header/title/body/footer area.
      // If the user enters unusually long text, shrink ONLY the body content
      // enough to keep every element inside its reserved body rectangle.
      // This prevents the footer from ever being painted over totals, tables,
      // signatures or other content.
      const body=page.querySelector('.pdf-page-body');
      if(body){
        body.style.transform='none';
        body.style.transformOrigin='top left';
        body.style.width='100%';
        const available=body.clientHeight;
        const required=body.scrollHeight;
        if(required>available+1){
          const scale=Math.max(0.72, Math.min(1, available/required));
          body.style.transform=`scale(${scale})`;
          body.style.transformOrigin='top left';
          body.style.width=`${100/scale}%`;
        }
      }

      await new Promise(resolve => requestAnimationFrame(resolve));

      const canvas=await html2canvas(page,{
        width:794,
        height:1123,
        windowWidth:794,
        windowHeight:1123,
        scale:2,
        useCORS:true,
        allowTaint:true,
        backgroundColor:'#ffffff',
        logging:false,
        scrollX:0,
        scrollY:0,
        imageTimeout:15000
      });

      if(i>0) pdf.addPage('a4','portrait');
      pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',0,0,210,297,undefined,'FAST');

      // Real PDF annotations over the footer text.
      // Coordinates are aligned to the A4 footer layout above.
      const fy = 282.6, fh = 7.0;
      pdf.link(50,  fy, 40, fh, { url: 'tel:+393204295445' });
      pdf.link(92,  fy, 58, fh, { url: 'mailto:abilart.impresaedile@gmail.com' });
      pdf.link(151, fy, 29, fh, { url: 'https://impresaedileabilart.com/' });
      pdf.link(181, fy, 22, fh, { url: 'https://idraulicoservizi.com/' });
    }

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
