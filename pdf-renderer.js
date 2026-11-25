/* Abilart PDF layout engine — native vector/text, no page screenshots.
 * Local logo and client signature are the only image assets embedded. */
(function(){
'use strict';
const C={navy:[7,79,112],blue:[7,95,131],ink:[38,51,61],muted:[104,119,128],line:[218,228,233],pale:[247,250,252],white:[255,255,255],soft:[252,253,254]};
const M={left:14,right:14,top:47,bottom:269,width:182};
const $=(root,sel)=>root.querySelector(sel);
function text(el){return (el?.innerText||el?.textContent||'').replace(/\s+/g,' ').trim();}
function setColor(p,key){const c=C[key];p.setTextColor(...c);}
function fill(p,key){p.setFillColor(...C[key]);}
function line(p,key){p.setDrawColor(...C[key]);}
function imageData(url){return new Promise(resolve=>{if(!url){resolve(null);return;}fetch(url).then(r=>{if(!r.ok)throw Error('Logo non raggiungibile');return r.blob();}).then(blob=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>resolve(null);fr.readAsDataURL(blob);}).catch(()=>resolve(null));});}
function titleFrom(root){return text($(root,'.pdf-doc-type'))||'PREVENTIVO';}
function metadata(root){const h=$(root,'.pdf-meta');return {number:text($(h,'strong')),date:text($(h,'span:last-child')).replace(/^DATA:\s*/,'')};}
const logoPromise=imageData(new URL('assets/abilart-logo.png',document.baseURI).href);
function addPdfLink(p,x,y,w,h,url){if(!url||!/^https?:|^mailto:|^tel:/i.test(url))return;try{p.link(x,y,Math.max(1,w),Math.max(2,h),{url});}catch{}}
function createEngine(root,p,logo){
 const ctx={root,p,logo,title:titleFrom(root),meta:metadata(root),y:M.top,page:1,flowFrame:null};let clientCardTop=M.top;
 function header(){
  p.setPage(ctx.page);line(p,'blue');p.setLineWidth(.65);p.line(14,8,196,8);
  if(logo){try{p.addImage(logo,'PNG',14,11,24,17,'abilart-logo','FAST');}catch{}}
  p.setFont('helvetica','bold');p.setFontSize(14);setColor(p,'navy');p.text('ABILART SRLS',42,15);addPdfLink(p,14,11,24,17,'https://impresaedileabilart.com/');
  p.setFont('helvetica','normal');p.setFontSize(7.2);setColor(p,'muted');p.text("SOLUZIONI ARTIGIANE D'ECCELLENZA",42,19.5);
  p.setFontSize(7);p.text('P. IVA / C.F. 10439280966 · Lissone (MB) · +39 320 429 5445',42,24);
  addPdfLink(p,112,20.8,37,4.5,'tel:+393204295445');
  addPdfLink(p,80,20.8,30,4.5,'https://www.google.com/maps/search/?api=1&query=Via%20Caprera%202%2C%2020851%20Lissone%20MB%2C%20Italia');
  p.text('impresaedileabilart.com · idraulicoservizi.it',42,28);
  addPdfLink(p,42,25,57,4.5,'https://impresaedileabilart.com/');addPdfLink(p,101,25,48,4.5,'https://idraulicoservizi.it/');
  fill(p,'soft');line(p,'line');p.roundedRect(145,10,51,22,2,2,'FD');
  p.setFontSize(6.4);setColor(p,'muted');p.text('DOCUMENTO NUMERO',170.5,14.5,{align:'center'});
  p.setFont('helvetica','bold');p.setFontSize(9.2);setColor(p,'navy');p.text(ctx.meta.number||'—',170.5,19,{align:'center'});
  p.setFont('helvetica','normal');p.setFontSize(6.5);setColor(p,'muted');p.text('DATA: '+(ctx.meta.date||'—'),170.5,23,{align:'center'});
  line(p,'line');p.setLineWidth(.35);p.line(14,34,196,34);
  p.setFont('helvetica','bold');p.setFontSize(12.5);setColor(p,'navy');p.text(ctx.title.toUpperCase(),14,42);
  
 }
 function footer(){
  const n=p.getNumberOfPages();
  for(let i=1;i<=n;i++){
   p.setPage(i);line(p,'line');p.setLineWidth(.4);p.line(14,276,196,276);
   p.setFont('helvetica','normal');p.setFontSize(6.7);setColor(p,'muted');
   p.text('T. +39 320 429 5445',14,283);addPdfLink(p,14,279.5,39,5,'tel:+393204295445');
   p.text('abilart.impresaedile@gmail.com',53,283);addPdfLink(p,53,279.5,51,5,'mailto:abilart.impresaedile@gmail.com');
   p.text('impresaedileabilart.com',101,283);addPdfLink(p,101,279.5,34,5,'https://impresaedileabilart.com/');
   p.text('idraulicoservizi.it',137,283);addPdfLink(p,137,279.5,30,5,'https://idraulicoservizi.it/');
   p.text('Mappa',170,283);addPdfLink(p,168,279.5,17,5,'https://www.google.com/maps/search/?api=1&query=Via%20Caprera%202%2C%2020851%20Lissone%20MB%2C%20Italia');
   p.text('Pagina '+i+' / '+n,196,283,{align:'right'});
  }
 }
 function newPage(){p.addPage();ctx.page=p.getNumberOfPages();ctx.y=M.top;header();if(ctx.flowFrame){ctx.flowFrame.page=ctx.page;ctx.flowFrame.lastY=ctx.y-3.2;}}
 function ensure(h,keep=0){
  if(ctx.y+h+keep>M.bottom){newPage();return true;}return false;
 }
 function band(label){
  ensure(10,18);fill(p,'pale');p.rect(14,ctx.y,182,9.2,'F');fill(p,'blue');p.rect(14,ctx.y,1.2,9.2,'F');
  p.setFont('helvetica','bold');p.setFontSize(8.2);setColor(p,'navy');p.text(label.toUpperCase(),18,ctx.y+6.1);ctx.y+=12;
 }
 function labelValue(label,value,x,y,w){
  p.setFont('helvetica','normal');p.setFontSize(7.0);setColor(p,'muted');p.text(label.toUpperCase(),x+3,y+4);
  p.setFont('helvetica','bold');p.setFontSize(9.3);setColor(p,'ink');
  const lines=p.splitTextToSize(value||'—',w-6);p.text(lines,x+3,y+10.0,{lineHeightFactor:1.2});
  return Math.max(15,lines.length*3.8+11);
 }
 function clientCard(el,x,y,w,h){
  line(p,'line');fill(p,'white');p.roundedRect(x,y,w,h,1.5,1.5,'FD');
  const cells=[...el.querySelectorAll('tr')].flatMap(tr=>[...tr.children]);
  let cols=2,cellW=w/cols,rowY=y;
  cells.forEach((cell,i)=>{
   let row=Math.floor(i/2),col=i%2;
   let cy=y+row*(h/Math.max(2,Math.ceil(cells.length/2))),ch=h/Math.max(2,Math.ceil(cells.length/2));
   if(row>0){line(p,'line');p.line(x,cy,x+w,cy);}
   if(col){line(p,'line');p.line(x+cellW,cy,x+cellW,cy+ch);}
   const lab=text($(cell,' .pdf-label'))||text(cell).split(/(?=[A-ZÀ-Ù][A-ZÀ-Ù /.-]{3,})/)[0];
   const value=text(cell).replace(lab,'').trim()||text(cell);
   labelValue(lab,value,x+col*cellW,cy,cellW,ch);
  });
 }
 function drawClient(el){
  clientCardTop=ctx.y;
  const fields=[];
  [...el.querySelectorAll('tr')].forEach(tr=>[...tr.children].forEach(cell=>{
   const label=text($(cell,'.pdf-label'));
   let value=text(cell).replace(label,'').trim()||'—';const anchors=[...cell.querySelectorAll('a')].map(a=>({text:text(a),href:a.getAttribute('href')}));if(label.toUpperCase()==='CONTATTI'&&anchors.length>1)value=anchors.map(a=>a.text).join('\n');fields.push({label,value,anchors:[...cell.querySelectorAll('a')].map(a=>({text:text(a),href:a.getAttribute('href')}))});
  }));
  const w=116,cw=w/2,rows=[];
  fields.forEach((f,i)=>{
   p.setFont('helvetica','bold');p.setFontSize(8.2);
   const lines=p.splitTextToSize(f.value,cw-6);
   const row=Math.floor(i/2);rows[row]=Math.max(rows[row]||19.5,Math.max(19.5,lines.length*4.35+12));
  });
  const h=rows.reduce((a,b)=>a+b,0);
  ensure(h+3,6);const y0=ctx.y;line(p,'line');fill(p,'white');p.roundedRect(14,y0,w,h,1.5,1.5,'FD');
  let rowY=y0;
  rows.forEach((rh,row)=>{
   if(row){line(p,'line');p.line(14,rowY,14+w,rowY);}
   for(let col=0;col<2;col++){
    const f=fields[row*2+col];if(!f)continue;const x=14+col*cw;
    if(col){line(p,'line');p.line(x,rowY,x,rowY+rh);}
    labelValue(f.label,f.value,x,rowY,cw,rh);
    if(f.anchors?.length){p.setFont('helvetica','bold');p.setFontSize(8.4);const lines=p.splitTextToSize(f.value,cw-6);f.anchors.forEach(a=>{for(let li=0;li<lines.length;li++){const at=lines[li].indexOf(a.text);if(at>=0){addPdfLink(p,x+3+p.getTextWidth(lines[li].slice(0,at)),rowY+6.5+li*3.8,p.getTextWidth(a.text),4.5,a.href);break;}}});}
   }
   rowY+=rh;
  });
  ctx.y=y0+h+2;
 }
 function inlineRuns(node,bold=false,italic=false,underline=false,color=null){
  const out=[];
  function walk(n,b,i,u,c,href=null){
   if(n.nodeType===3){if(n.nodeValue)out.push({t:n.nodeValue,b,i,u,c,href});return;}
   if(n.nodeType!==1)return;
   const tag=n.tagName.toLowerCase(),style=n.getAttribute('style')||'';
   const cm=style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i),wm=style.match(/font-weight\s*:\s*([^;]+)/i),um=style.match(/text-decoration\s*:\s*([^;]+)/i);
   const nextColor=cm?cm[1].trim():c;
   const nextBold=b||(tag==='strong'||tag==='b'||!!(wm&&/(bold|[6-9]00)/i.test(wm[1])));
   const nextUnder=u||(tag==='u'||!!(um&&/underline/i.test(um[1])));
   const nextHref=tag==='a'?(n.getAttribute('href')||href):href;
   if(tag==='br'){out.push({t:'\n',b:nextBold,i,u:nextUnder,c:nextColor,href:nextHref});return;}
   [...n.childNodes].forEach(ch=>walk(ch,nextBold,i||(tag==='em'||tag==='i'),nextUnder,nextColor,nextHref));
  }
  walk(node,bold,italic,underline,color,null);return out;
 }
 function drawRichLine(runs,x,y,w,size,indent=0){
  let lineRuns=[],lineWidth=0,lines=0,base=x+indent;const lineH=size*.48;
  function applyColor(value){
   const v=String(value||'').toLowerCase().replace(/\s+/g,' ').trim();
   const colors={'#0073aa':[0,115,170],'rgb(0, 115, 170)':[0,115,170],'#c62828':[198,40,40],'rgb(198, 40, 40)':[198,40,40],'#000000':[0,0,0],'black':[0,0,0]};
   if(colors[v])p.setTextColor(...colors[v]);else setColor(p,'ink');
  }
  function renderLine(){
   if(y+lineH+2>M.bottom){newPage();y=ctx.y;base=x+indent;}
   if(ctx.flowFrame){const f=ctx.flowFrame,top=y-3.2,bottom=y+2.1,from=f.lastY??top;fill(p,f.fill||'soft');p.rect(f.x,from,f.w,bottom-from,'F');line(p,f.stroke||'line');p.setLineWidth(.35);p.line(f.x,from,f.x,bottom);p.line(f.x+f.w,from,f.x+f.w,bottom);f.lastY=bottom;f.page=ctx.page;}
   if(!lineRuns.length){y+=lineH;lines++;return;}let xx=base;
   lineRuns.forEach(r=>{p.setFont('helvetica',r.b?(r.i?'bolditalic':'bold'):(r.i?'italic':'normal'));p.setFontSize(size);applyColor(r.c);p.text(r.t,xx,y);if(r.href)addPdfLink(p,xx,y-size*.42,p.getTextWidth(r.t),lineH+1,r.href);if(r.u||r.href){applyColor(r.c);p.setLineWidth(.15);p.line(xx,y+.6,xx+p.getTextWidth(r.t),y+.6);}xx+=p.getTextWidth(r.t);});
   y+=lineH;lines++;lineRuns=[];lineWidth=0;
  }
  runs.forEach(run=>{const chunks=run.t.replace(/\r/g,'').split(/(\s+|\n)/).filter(Boolean);chunks.forEach(word=>{
   if(word==='\n'){renderLine();return;}
   p.setFont('helvetica',run.b?(run.i?'bolditalic':'bold'):(run.i?'italic':'normal'));p.setFontSize(size);
   const maxW=w-indent,ww=p.getTextWidth(word);
   if(ww>maxW){
    if(lineRuns.length)renderLine();
    let fragment='';
    [...word].forEach(ch=>{
     const test=fragment+ch;
     if(p.getTextWidth(test)>maxW&&fragment){lineRuns.push({t:fragment,b:run.b,i:run.i,u:run.u,c:run.c,href:run.href});lineWidth=p.getTextWidth(fragment);renderLine();fragment=ch;}
     else fragment=test;
    });
    if(fragment){lineRuns.push({t:fragment,b:run.b,i:run.i,u:run.u,c:run.c,href:run.href});lineWidth=p.getTextWidth(fragment);renderLine();}
    return;
   }
   if(lineWidth+ww>maxW&&lineRuns.length)renderLine();
   lineRuns.push({t:word,b:run.b,i:run.i,u:run.u,c:run.c,href:run.href});lineWidth+=ww+(word.trim()?0:.55);
  });});
  if(lineRuns.length)renderLine();return y;
 }
 function richContent(el,x,w,size=8.4){
  const blocks=[...el.children];if(!blocks.length){ctx.y=drawRichLine([{t:text(el),b:false,i:false,u:false}],x,ctx.y,w,size);return;}
  blocks.forEach(block=>{
   const tag=block.tagName.toLowerCase();
   if(tag==='ul'||tag==='ol'){[...block.children].forEach((li,index)=>{const runs=inlineRuns(li);ensure(size*1.2,4);const bulletX=x+3;if(tag==='ul'){fill(p,'blue');p.circle(bulletX,ctx.y-1.2,.65,'F');}else{p.setFont('helvetica','bold');p.setFontSize(size-1);setColor(p,'blue');p.text((index+1)+'.',bulletX,ctx.y);}ctx.y=drawRichLine(runs,x+7,ctx.y,w-7,size);ctx.y+=1.4;});}
   else{const runs=inlineRuns(block);ensure(size*1.3,4);ctx.y=drawRichLine(runs,x,ctx.y,w,size);ctx.y+=2.2;}
  });
 }
 function renderDescription(el){
  const inner=$(el,'.pdf-description-content')||el;ensure(12,6);const x=14,w=182,start=ctx.y;
  fill(p,'soft');p.rect(x,start,w,4.2,'F');line(p,'line');p.setLineWidth(.4);p.line(x,start,x+w,start);
  ctx.flowFrame={x,w,fill:'soft',stroke:'line',page:ctx.page,lastY:start+4.2};ctx.y+=7;
  richContent(inner,x+5,w-10,8.4);
  const f=ctx.flowFrame;line(p,'line');p.setLineWidth(.4);const from=f?.lastY??ctx.y+1;p.line(x,from,x,ctx.y+1);p.line(x+w,from,x+w,ctx.y+1);p.line(x,ctx.y+1,x+w,ctx.y+1);ctx.flowFrame=null;ctx.y+=5;
 }
 function renderEconomy(el){
  const rows=[...el.querySelectorAll('tr')],x=130,w=66;
  const estimate=rows.reduce((sum,tr)=>sum+(tr.classList.contains('pdf-total')?13:8.5),8);
  ensure(estimate+3,6);
  const start=ctx.y;line(p,'blue');fill(p,'white');p.roundedRect(x,start,w,estimate,1.5,1.5,'FD');
  let yy=start+7.2;
  rows.forEach(tr=>{const cells=[...tr.children],isTotal=tr.classList.contains('pdf-total'),isBalance=tr.classList.contains('pdf-balance');
   if(isTotal){fill(p,'blue');p.roundedRect(x,yy-5,w,13,1.2,1.2,'F');}
   p.setFont('helvetica',isTotal||isBalance?'bold':'normal');p.setFontSize(isTotal?10.1:(isBalance?8.1:7.8));setColor(p,isTotal?'white':'ink');
   const label=text(cells[0]),raw=text(cells[1]);
   if(/^IVA$/i.test(label)){const rate=(raw.match(/[0-9]+(?:[,.][0-9]+)?%/)||[])[0]||'';const amount=raw.replace(rate,'').trim();p.text(label,x+3,yy);if(rate){p.setFont('helvetica','bold');p.setFontSize(7.8);setColor(p,'blue');p.text(rate,x+20,yy);}setColor(p,'ink');p.text(p.splitTextToSize(amount,w*.42-4),x+w-3,yy,{align:'right'});}
   else{p.text(p.splitTextToSize(label,w*.55-4),x+3,yy);p.text(p.splitTextToSize(raw,w*.42-4),x+w-3,yy,{align:'right'});}
   yy+=isTotal?13:8.5;
  });
  const actual=yy-start+2;return actual;
 }
 function renderDataBox(el){
  const table=$(el,'table');if(!table){richContent(el,14,182,8);return;}
  const cells=[...table.querySelectorAll('td')],cols=Math.max(...[...table.querySelectorAll('tr')].map(r=>r.children.length)),rows=[...table.querySelectorAll('tr')];
  const rowH=18,h=rows.length*rowH,w=182;ensure(h+4,5);line(p,'line');fill(p,'white');p.roundedRect(14,ctx.y,w,h,1.3,1.3,'FD');
  rows.forEach((tr,ri)=>{if(ri){line(p,'line');p.line(14,ctx.y+ri*rowH,196,ctx.y+ri*rowH);}const cw=w/tr.children.length;[...tr.children].forEach((cell,ci)=>{if(ci){line(p,'line');p.line(14+ci*cw,ctx.y+ri*rowH,14+ci*cw,ctx.y+(ri+1)*rowH);}
    const lab=text($(cell,'.pdf-label')),val=text(cell).replace(lab,'').trim();labelValue(lab,val,14+ci*cw,ctx.y+ri*rowH,cw,rowH);
   });});ctx.y+=h+3;
 }
 function renderTable(el){
  const table=$(el,'table');if(!table)return;
  const rows=[...table.querySelectorAll('tr')],widths=[23,67,16,17,28,31],x=14,lineH=3.45;
  const header=rows[0],body=rows.slice(1);
  function paintRow(cells,linesByCell,h,isHeader){
   let xx=x;
   cells.forEach((cell,i)=>{
    if(isHeader){fill(p,'blue');line(p,'blue');p.rect(xx,ctx.y,widths[i],h,'FD');p.setFont('helvetica','bold');p.setFontSize(6.5);setColor(p,'white');}
    else{fill(p,'white');line(p,'line');p.rect(xx,ctx.y,widths[i],h,'FD');p.setFont('helvetica','normal');p.setFontSize(6.6);setColor(p,'ink');}
    p.text(linesByCell[i],xx+1.5,ctx.y+4,{lineHeightFactor:1.15});xx+=widths[i];
   });
   ctx.y+=h;
  }
  const headLines=[...header.children].map((c,i)=>p.splitTextToSize(text(c),widths[i]-3));
  const headH=Math.max(8,...headLines.map(a=>a.length*lineH+5));ensure(headH+1,3);paintRow([...header.children],headLines,headH,true);
  body.forEach(tr=>{
   const cells=[...tr.children],all=cells.map((c,i)=>p.splitTextToSize(text(c),widths[i]-3));
   const maxLines=Math.max(1,...all.map(a=>a.length));let line=0;
   while(line<maxLines){
    const available=Math.max(1,Math.floor((M.bottom-ctx.y-5)/lineH));
    if(available<1||ctx.y+lineH+5>M.bottom){newPage();paintRow([...header.children],headLines,headH,true);}
    const capacity=Math.max(1,Math.floor((M.bottom-ctx.y-5)/lineH));
    const count=Math.min(maxLines-line,capacity),segment=all.map(a=>a.slice(line,line+count));
    const h=Math.max(8,...segment.map(a=>Math.max(1,a.length)*lineH+5));
    paintRow(cells,segment,h,false);line+=count;
    if(line<maxLines){newPage();paintRow([...header.children],headLines,headH,true);}
   }
  });
  ctx.y+=3;
 }
 function renderPayment(el){
  const cards=[...el.children],w=89,h=17;ensure(h+3,4);
  cards.forEach((card,i)=>{let x=14+i*(w+4);fill(p,'soft');line(p,'line');p.roundedRect(x,ctx.y,w,h,1.2,1.2,'FD');p.setFont('helvetica','normal');p.setFontSize(5.8);setColor(p,'muted');p.text(text($(card,'span')).toUpperCase(),x+3,ctx.y+5);p.setFont('helvetica','bold');p.setFontSize(7);setColor(p,'ink');p.text(p.splitTextToSize(text($(card,'strong')),w-6).slice(0,2),x+3,ctx.y+10.5);});ctx.y+=h+4;
 }
 function renderTerms(el){
  const items=[...el.querySelectorAll('li')];if(!items.length)return;ensure(12,5);const x=14,w=182,start=ctx.y;
  fill(p,'soft');p.rect(x,start,w,4.2,'F');line(p,'line');p.setLineWidth(.4);p.line(x,start,x+w,start);
  ctx.flowFrame={x,w,fill:'soft',stroke:'line',page:ctx.page,lastY:start+4.2};ctx.y+=5.5;
  items.forEach((li,i)=>{const runs=inlineRuns(li),lead=[{t:(i+1)+'. ',b:true,i:false,u:false},...runs];
   const plain=runs.map(r=>r.t).join(' ');p.setFont('helvetica','normal');p.setFontSize(8);const lines=p.splitTextToSize(plain,172);ensure(Math.min(15,Math.max(8,lines.length*3.8+3)),4);
   ctx.y=drawRichLine(lead,18,ctx.y,172,8.0);ctx.y+=2.2;
  });
  const f=ctx.flowFrame;line(p,'line');p.setLineWidth(.4);const from=f?.lastY??ctx.y+1;p.line(x,from,x,ctx.y+1);p.line(x+w,from,x+w,ctx.y+1);p.line(x,ctx.y+1,x+w,ctx.y+1);ctx.flowFrame=null;ctx.y+=5;
 }
 function renderSignatures(el){
  const cards=[...el.querySelectorAll('.pdf-signature')];const x0=14,w=89,gap=4,h=36;ensure(h+4,0);
  cards.forEach((sg,i)=>{const x=x0+i*(w+gap);fill(p,'white');line(p,'line');p.roundedRect(x,ctx.y,w,h,1.5,1.5,'FD');p.setFont('helvetica','bold');p.setFontSize(6.3);setColor(p,'muted');p.text(text($(sg,'.pdf-label')).toUpperCase(),x+3,ctx.y+5);
   const img=$(sg,'img');if(img&&img.src.startsWith('data:image/')){try{p.addImage(img.src,'PNG',x+4,ctx.y+8,42,13);}catch{}}
   else{line(p,'line');p.line(x+4,ctx.y+24,x+54,ctx.y+24);}
   p.setFont('helvetica','bold');p.setFontSize(7.5);setColor(p,'ink');p.text(text($(sg,'strong'))||'Firma',x+3,ctx.y+29);
   p.setFont('helvetica','normal');p.setFontSize(6);setColor(p,'muted');p.text(text($(sg,'small'))||text($(sg,'.pdf-sign-date')),x+3,ctx.y+33);
  });ctx.y+=h+4;
 }
 function renderBlock(el){
  if(el.classList.contains('pdf-title')){band(text(el));return;}
  if(el.classList.contains('pdf-client-box')){drawClient(el);return;}
  if(el.classList.contains('pdf-description-flow')){renderDescription(el);return;}
  if(el.classList.contains('pdf-economy')){renderEconomy(el);return;}
  if(el.classList.contains('pdf-payment')){renderPayment(el);return;}
  if(el.classList.contains('pdf-terms-box')){renderTerms(el);return;}
  if(el.classList.contains('pdf-signatures')){renderSignatures(el);return;}
  if(el.classList.contains('pdf-acceptance')){ensure(12,6);richContent(el,14,182,7.8);ctx.y+=3;return;}
  if(el.classList.contains('pdf-box')&&$(el,'table.pdf-data')){renderDataBox(el);return;}
  if(el.classList.contains('pdf-table-wrap')){renderTable(el);return;}
  if(el.classList.contains('pdf-table-subtotal')){ensure(8,4);p.setFont('helvetica','normal');p.setFontSize(7.4);setColor(p,'muted');p.text(text($(el,'span')),125,ctx.y);p.setFont('helvetica','bold');setColor(p,'ink');p.text(text($(el,'strong')),196,ctx.y,{align:'right'});ctx.y+=7;return;}
  if(el.classList.contains('pdf-box')){renderDataBox(el);return;}
  if(el.tagName.toLowerCase()==='p'){richContent(el,14,182,8);ctx.y+=2;return;}
  if(el.innerText?.trim()){richContent(el,14,182,8);ctx.y+=2;}
 }
 function content(){
  const body=$(root,'.pdf-flow-body');let blocks=[...body.children];
  // Pull the economic recap to the top beside the customer card, matching the reference's
  // strong first-page hierarchy. Payment conditions remain adjacent to the recap.
  const clientIndex=blocks.findIndex(b=>b.classList.contains('pdf-client-box'));
  const economyIndex=blocks.findIndex(b=>b.classList.contains('pdf-economy'));
  const paymentIndex=blocks.findIndex(b=>b.classList.contains('pdf-payment'));
  if(clientIndex>=0&&economyIndex>=0){
   const client=blocks[clientIndex],econ=blocks[economyIndex],pay=paymentIndex>=0?blocks[paymentIndex]:null;
   const titleIndex=blocks.findIndex(b=>b.classList.contains('pdf-title')&&/RIEPILOGO ECONOMICO/i.test(text(b)));
   if(titleIndex>=0)blocks.splice(titleIndex,1);
   blocks=blocks.filter((b,i)=>b!==econ&&b!==pay);
   // Client data + summary panel share the same vertical start; draw client left, economy right.
   const before=blocks.slice(0,blocks.indexOf(client)+1),after=blocks.slice(blocks.indexOf(client)+1);
   before.forEach(renderBlock);
   const clientY=ctx.y;ctx.y=clientCardTop;const econH=renderEconomy(econ);
   ctx.y=Math.max(clientY,clientCardTop+econH)+2;
   if(pay)renderPayment(pay);
   after.forEach(renderBlock);
  }else blocks.forEach(renderBlock);
 }
 header();content();footer();return p;
}
window.AbilartPDFRenderer={async render(html,filename){
 const root=new DOMParser().parseFromString(html,'text/html').querySelector('.pdf-flow-document');
 if(!root)throw new Error('Contenuto del preventivo non trovato');
 const p=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true,putOnlyUsedFonts:true});
 const logo=await logoPromise;
 const engine=createEngine(root,p,logo);return engine;
}};
})();