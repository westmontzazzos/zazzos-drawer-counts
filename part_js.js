var SUPABASE_URL='https://bkrgefddyculihfdhjwb.supabase.co';
var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcmdlZmRkeWN1bGloZmRoandiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNzM0ODEsImV4cCI6MjA5NTk0OTQ4MX0.YhIsgS3IkRyTSeVG011EPqhZvX0UbR-tXcCLGoOSMEI';
var LOGOS={darien:'data:image/png;base64,__LOGO_DARIEN__',westmont:'data:image/png;base64,__LOGO_WESTMONT__'};

// Each store: which database table it uses, and its drawers. Darien keeps its existing
// table so all of its history carries over; Westmont gets its own.
var STORES={
  darien:{key:'darien',name:'Darien',table:'darien_drawer_counts',
    drawers:[
      {id:'Cashier',label:'DRAWER 2 / CASHIER',kind:'register',float:250},
      {id:'Bar',label:'STATION 7 / BAR',kind:'bar',float:250},
      {id:'Safe',label:'SAFE',kind:'safe',float:525}],
    legacy:{'Cashier 1':'Cashier'}},
  westmont:{key:'westmont',name:'Westmont',table:'westmont_drawer_counts',
    drawers:[
      {id:'Cashier 5',label:'CASHIER 5',kind:'register',float:250},
      {id:'Cashier 8',label:'CASHIER 8',kind:'register',float:250},
      {id:'Driver 2',label:'DRIVER 2',kind:'register',float:300},
      {id:'Bar 9',label:'BAR 9',kind:'bar',float:250},
      {id:'Bar 12',label:'BAR 12',kind:'bar',float:250},
      {id:'Safe',label:'SAFE',kind:'safe',float:500}],
    legacy:{}}
};
var ITEMS={
  coins:[{id:'penny',label:'Penny',value:0.01},{id:'nickel',label:'Nickel',value:0.05},{id:'dime',label:'Dime',value:0.10},{id:'quarter',label:'Quarter',value:0.25}],
  rolls:[{id:'pennyRoll',label:'Penny Roll (50/roll)',value:0.50},{id:'nickelRoll',label:'Nickel Roll (40/roll)',value:2.00},{id:'dimeRoll',label:'Dime Roll (50/roll)',value:5.00},{id:'quarterRoll',label:'Quarter Roll (40/roll)',value:10.00}],
  bills:[{id:'b1',label:'$1',value:1},{id:'b5',label:'$5',value:5},{id:'b10',label:'$10',value:10},{id:'b20',label:'$20',value:20},{id:'b50',label:'$50',value:50},{id:'b100',label:'$100',value:100}]
};
var TYPE_LABELS={opener:'OPEN',shift_change:'SHIFT CHANGE',closer:'CLOSE',spot_check:'SPOT CHECK',am:'AM COUNT',pm:'PM COUNT'};
var S={store:null,drawer:null,type:null,today:{},regRows:[],dayRegs:[],dayRows:{},discRows:[],saving:false,chk1:false,chk2:false,calOffset:0,discDays:30,drafts:{},unlocked:false,editRow:null,entryIdx:0,pinCb:null};
var cur=null, stack=[];

function $(id){return document.getElementById(id);}
function pad(n){return (n<10?'0':'')+n;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function money(v){return '$'+Number(v).toFixed(2);}
function r2(v){return Math.round(v*100)/100;}
function sm(v){var a=Math.abs(v);return a<0.005?'Even':(v>0?'+':'-')+'$'+a.toFixed(2);}
function sc(v){return Math.abs(v)<0.005?'#666':(v>0?'#1a7a3c':'#c8102e');}
function scDark(v){return Math.abs(v)<0.005?'#ddd':(v>0?'#6ee39a':'#ff8a8a');}
function fmtTime(iso){var t=new Date(iso);return ((t.getHours()%12)||12)+':'+pad(t.getMinutes())+(t.getHours()>=12?'PM':'AM');}
function fmtDate(ds){var m=['January','February','March','April','May','June','July','August','September','October','November','December'];var d=new Date(ds+'T12:00:00');return m[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();}
// A business day runs past midnight: anything counted before 4am still belongs to the
// day that's ending, so an after-midnight Close files under the right day.
function getBusinessDate(d){d=d||new Date();var bd=new Date(d.getTime());if(bd.getHours()<4)bd.setDate(bd.getDate()-1);return bd.getFullYear()+'-'+pad(bd.getMonth()+1)+'-'+pad(bd.getDate());}

function normReg(r){var l=(S.store&&S.store.legacy)||{};return l[r]||r;}
function drawerById(id){var ds=S.store.drawers;for(var i=0;i<ds.length;i++){if(ds[i].id===id)return ds[i];}return null;}
function labelOf(reg){var d=drawerById(normReg(reg));return d?d.label:String(reg).toUpperCase();}
function orderRegs(regs){var ids=S.store.drawers.map(function(d){return d.id;});return regs.slice().sort(function(a,b){var ia=ids.indexOf(a),ib=ids.indexOf(b);if(ia<0)ia=99;if(ib<0)ib=99;return (ia-ib)||(a<b?-1:(a>b?1:0));});}

function api(path,opts){opts=opts||{};var h={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY};if(opts.headers){for(var k in opts.headers){h[k]=opts.headers[k];}}opts.headers=h;return fetch(SUPABASE_URL+'/rest/v1/'+path,opts);}
function loadRows(query){return api(S.store.table+'?'+query).then(function(r){if(!r.ok){return r.text().then(function(t){var e=new Error('db '+r.status);e.status=r.status;e.body=t;throw e;});}return r.json();});}
function errHtml(e){
  var missing=(e&&(e.status===404||(e.body&&e.body.indexOf('PGRST205')>=0)));
  if(missing)return '<div class="card" style="color:#c8102e;font-size:13px;line-height:1.5;"><b>'+esc(S.store.name)+' isn\'t set up in the database yet</b> (its table is missing). Run the set-up SQL once, then come back.</div>';
  return '<div class="card" style="color:#c8102e;font-size:13px;">Couldn\'t load: '+esc(e&&e.message)+'. Check the connection and try again.</div>';
}

// ---------- navigation ----------
function show(id){if(id==='s-landing')S.unlocked=false;var els=document.querySelectorAll('.screen');for(var i=0;i<els.length;i++){els[i].className='screen'+(els[i].id===id?' on':'');}window.scrollTo(0,0);cur=id;}
function go(id){if(cur)stack.push(cur);show(id);}
function back(){var p=stack.pop();if(p){show(p);if(p==='s-home')refreshHome();}else{show('s-landing');}}
function goHome(){stack=['s-landing','s-stores'];show('s-home');refreshHome();}
function pickStore(key){S.store=STORES[key];S.drawer=null;stack=['s-landing','s-stores'];$('home-title').textContent=S.store.name.toUpperCase();$('home-logo').src=LOGOS[key];show('s-home');refreshHome();}

// ---------- store home: one card per drawer ----------
function refreshHome(){
  var bd=getBusinessDate();var el=$('home-cards');var st=S.store;
  $('home-date').textContent=fmtDate(bd);
  el.innerHTML='<div class="muted center pad">Loading&hellip;</div>';
  loadRows('count_date=eq.'+bd+'&order=counted_at.asc').then(function(rows){
    if(S.store!==st)return;
    S.today={};st.drawers.forEach(function(d){S.today[d.id]=[];});
    rows.forEach(function(r){var k=normReg(r.register);if(S.today[k])S.today[k].push(r);});
    el.innerHTML=st.drawers.map(cardHtml).join('');
  }).catch(function(e){if(S.store===st)el.innerHTML=errHtml(e);});
}
function cardHtml(d,i){
  var steps=(S.today[d.id]||[]).filter(function(e){return e.count_type!=='spot_check';});
  var pill='background:#f0efed;color:#666;',ptxt='Not Started',stat='Not started today',scol='#888',w='400';
  if(steps.length){
    var last=steps[steps.length-1];w='600';
    if(last.count_type==='closer'){pill='background:#d4f0dd;color:#1a7a3c;';ptxt='Closed';stat='Closed for today \u00b7 Final '+money(last.total);scol='#1a7a3c';}
    else{pill='background:#fff3b0;color:#6b5600;';ptxt=(d.kind==='safe')?'Awaiting Close':'In Progress';scol='#8a6d00';
      var shifts=steps.filter(function(e){return e.count_type==='shift_change';}).length;
      stat=(d.kind==='safe')?('Opened '+fmtTime(steps[0].counted_at)+' \u2014 tap to close or see counts'):('Opened '+fmtTime(steps[0].counted_at)+' \u00b7 '+shifts+' shift change(s) so far');}
  }
  var dpill=getDraft(d)?'<span class="pill" style="background:#dbeafe;color:#1e40af;">Unsaved count</span>':'';
  return '<div class="dcard" onclick="tapDrawer('+i+')"><div class="dname">'+esc(d.label)+'<span class="pill" style="'+pill+'">'+ptxt+'</span>'+dpill+'</div><div class="dstat" style="color:'+scol+';font-weight:'+w+';">'+stat+'</div></div>';
}

// ---------- tapping a drawer: it works out which count this is ----------
function tapDrawer(i){
  var d=S.store.drawers[i];S.drawer=d;
  var steps=(S.today[d.id]||[]).filter(function(e){return e.count_type!=='spot_check';});
  // An unsaved count for this drawer? Pick it back up exactly where it was left.
  var dr=getDraft(d);
  if(dr){
    var lastStep=steps.length?steps[steps.length-1]:null;
    var stale=(dr.type==='opener'&&steps.length>0)||(dr.type!=='opener'&&dr.type!=='spot_check'&&!steps.length)||(lastStep&&lastStep.count_type==='closer'&&dr.type!=='closer');
    if(stale){delete S.drafts[draftKey(d)];persistDrafts();}
    else{S.type=dr.type;openForm(dr);return;}
  }
  if(!steps.length){beginCount('opener');return;}
  var last=steps[steps.length-1];
  if(last.count_type==='closer'){
    if(!confirm(d.label+' was already closed today at '+fmtTime(last.counted_at)+' by '+(last.counted_by||'\u2014')+'.\n\nAdd a correction count? It saves as an additional Close for today and does not erase the original.'))return;
    beginCount('closer');return;
  }
  $('choice-title').textContent=d.label;
  $('choice-shift').style.display=(d.kind==='safe')?'none':'';
  $('choice-spot').style.display=(d.kind==='safe')?'none':'';
  go('s-choice');
}
function beginCount(type){
  S.type=type;
  if(S.drawer.kind==='bar'&&(type==='shift_change'||type==='closer')){
    S.chk1=false;S.chk2=false;updateChecks();
    $('check-title').textContent=S.drawer.label+' \u2014 '+TYPE_LABELS[type];
    go('s-check');
  }else{openForm();}
}
function toggleCheck(n){if(n===1)S.chk1=!S.chk1;else S.chk2=!S.chk2;updateChecks();}
function updateChecks(){
  $('chk1').className='chk'+(S.chk1?' on':'');$('chk2').className='chk'+(S.chk2?' on':'');
  $('box1').innerHTML=S.chk1?'&#10003;':'';$('box2').innerHTML=S.chk2?'&#10003;':'';
  $('btn-count').disabled=!(S.chk1&&S.chk2);
}

// ---------- the count form ----------
function buildSec(id,items){
  var h='';items.forEach(function(it){h+='<div class="qrow"><span>'+it.label+'</span><input type="number" inputmode="numeric" min="0" id="q-'+it.id+'" placeholder="0" oninput="onInput()"></div>';});
  $('body-'+id).innerHTML=h;
}
function openForm(draft,isEdit){
  if(!isEdit)S.editRow=null;
  if(draft&&draft.type){}else{draft=null;}
  var d=S.drawer,t=S.type,safe=d.kind==='safe',bar=d.kind==='bar',handoff=(t==='shift_change'||t==='closer');
  $('form-title').textContent=d.label+' \u2014 '+TYPE_LABELS[t];
  $('form-date').textContent=fmtDate(getBusinessDate());
  $('f-name').value='';
  $('f-open-label').textContent=safe?'Safe target amount':'Drawer opened at';
  var o=$('f-open');o.value=d.float;o.readOnly=safe;o.style.background=safe?'#f3f2ef':'';
  $('row-open').style.display=(t==='spot_check')?'none':'flex';
  $('row-pos').style.display=(handoff&&!safe)?'flex':'none';$('f-pos').value='';
  $('row-tip').style.display=(handoff&&bar)?'flex':'none';$('f-tip').value='';
  $('acc-coins').style.display=safe?'none':'block';
  if(!safe)buildSec('coins',ITEMS.coins);
  buildSec('rolls',ITEMS.rolls);buildSec('bills',ITEMS.bills);
  $('body-coins').style.display='none';$('chev-coins').innerHTML='&#9660;';
  $('body-rolls').style.display='block';$('chev-rolls').innerHTML='&#9650;';
  $('body-bills').style.display='block';$('chev-bills').innerHTML='&#9650;';
  S.saving=false;$('btn-save').disabled=false;
  if(draft){
    $('f-name').value=draft.name||'';
    if(!safe&&draft.open!==''&&draft.open!=null)$('f-open').value=draft.open;
    $('f-pos').value=draft.pos||'';$('f-tip').value=draft.tip||'';
    for(var id in draft.q){var el=$('q-'+id);if(el)el.value=draft.q[id];}
    $('draft-banner').style.display=isEdit?'none':'block';
  }else{$('draft-banner').style.display='none';}
  recalc();go('s-form');
}

// ---------- unsaved counts are kept per drawer ----------
// Typing is saved as you go (on the phone itself), so you can leave a count, look at
// another drawer or the calendar, and come back to find it exactly as you left it.
function draftKey(d){return S.store.key+'|'+(d||S.drawer).id;}
function loadDrafts(){try{S.drafts=JSON.parse(localStorage.getItem('zdc_drafts_v1')||'{}')||{};}catch(e){S.drafts={};}}
function persistDrafts(){try{localStorage.setItem('zdc_drafts_v1',JSON.stringify(S.drafts));}catch(e){}}
function getDraft(d){
  var k=draftKey(d),dr=S.drafts[k];
  if(dr&&dr.date!==getBusinessDate()){delete S.drafts[k];persistDrafts();return null;}
  return dr||null;
}
function saveDraft(){
  if(!S.drawer||!S.type||S.editRow)return;
  var q={};['coins','rolls','bills'].forEach(function(sec){ITEMS[sec].forEach(function(it){var el=$('q-'+it.id);if(el&&el.value!=='')q[it.id]=el.value;});});
  var dr={date:getBusinessDate(),type:S.type,name:$('f-name').value,open:$('f-open').value,pos:$('f-pos').value,tip:$('f-tip').value,q:q,at:Date.now()};
  var empty=!dr.name&&!dr.pos&&!dr.tip&&!Object.keys(q).length;
  if(empty)delete S.drafts[draftKey()];else S.drafts[draftKey()]=dr;
  persistDrafts();
}
function onInput(){recalc();saveDraft();}
function discardDraft(){
  if(S.editRow){S.editRow=null;back();return;}
  if(!confirm('Discard this count? Everything you typed for it will be cleared.'))return;
  delete S.drafts[draftKey()];persistDrafts();goHome();
}
function toggleAcc(sec){var b=$('body-'+sec);var open=b.style.display!=='none';b.style.display=open?'none':'block';$('chev-'+sec).innerHTML=open?'&#9660;':'&#9650;';}
function currentTotal(){
  var safe=S.drawer.kind==='safe',total=0;
  (safe?['rolls','bills']:['coins','rolls','bills']).forEach(function(sec){ITEMS[sec].forEach(function(it){var el=$('q-'+it.id);var q=el?(parseInt(el.value,10)||0):0;total+=q*it.value;});});
  return r2(total);
}
function recalc(){
  var d=S.drawer,t=S.type;if(!d)return 0;
  var safe=d.kind==='safe',bar=d.kind==='bar',handoff=(t==='shift_change'||t==='closer');
  var total=currentTotal();$('t-total').textContent=money(total);
  var openAmt=safe?d.float:(parseFloat($('f-open').value)||0);
  var pl=$('t-pull'),pp=$('t-pos'),pn=$('t-tip');
  if(t==='spot_check'){pl.textContent='Spot check \u2014 counted only, nothing to compare';pl.style.color='rgba(255,255,255,0.7)';}
  else{
    var diff=r2(total-openAmt);
    if(safe){
      if(Math.abs(diff)<0.005){pl.textContent='\u2705 At '+money(d.float)+' \u2014 good';pl.style.color='#6ee39a';}
      else if(diff>0){pl.textContent='OVER by '+money(diff)+' \u2014 remove to reach '+money(d.float);pl.style.color='#ffd166';}
      else{pl.textContent='\u26a0\ufe0f SHORT '+money(Math.abs(diff))+' \u2014 add to reach '+money(d.float);pl.style.color='#ff8a8a';}
    }else{
      if(Math.abs(diff)<0.005){pl.textContent='Even \u2014 no pull needed';pl.style.color='rgba(255,255,255,0.8)';}
      else if(diff>0){pl.textContent='PULL '+money(diff);pl.style.color='#6ee39a';}
      else{pl.textContent='\u26a0\ufe0f SHORT '+money(Math.abs(diff));pl.style.color='#ff8a8a';}
    }
  }
  if(handoff&&!safe){
    pp.style.display='block';
    var pv=$('f-pos').value.trim();
    if(pv===''){pp.textContent='Enter the POS amount above to check against it';pp.style.color='rgba(255,255,255,0.55)';}
    else{
      var pd=r2(total-(parseFloat(pv)||0));
      if(Math.abs(pd)<0.005){pp.textContent='POS check: EVEN';pp.style.color='#6ee39a';}
      else if(pd>0){pp.textContent='POS check: OVER '+money(pd);pp.style.color='#ffd166';}
      else{pp.textContent='POS check: \u26a0\ufe0f SHORT '+money(Math.abs(pd));pp.style.color='#ff8a8a';}
    }
  }else{pp.style.display='none';}
  // The tip-out is recorded only. The bar checklist has them pay the bartender BEFORE
  // counting, so the count is already net of it and the POS figure already reflects it.
  var tip=(bar&&handoff)?(parseFloat($('f-tip').value)||0):0;
  pn.textContent=tip>0?('Tip-out recorded: '+money(tip)+' (paid before counting \u2014 not subtracted)'):'';
  return total;
}
function saveCount(){
  if(S.saving)return;
  var d=S.drawer,t=S.type,safe=d.kind==='safe',bar=d.kind==='bar',handoff=(t==='shift_change'||t==='closer');
  var name=$('f-name').value.trim();
  if(!name){alert('Enter the name of the person counting before saving.');return;}
  var breakdown={};
  (safe?['rolls','bills']:['coins','rolls','bills']).forEach(function(sec){breakdown[sec]={};ITEMS[sec].forEach(function(it){var el=$('q-'+it.id);breakdown[sec][it.id]=el?(parseInt(el.value,10)||0):0;});});
  var total=currentTotal();
  var tip=(bar&&handoff)?(parseFloat($('f-tip').value)||0):0;
  breakdown.tipout=r2(tip);
  var openAmt=safe?d.float:(parseFloat($('f-open').value)||0);
  var pull=(t==='spot_check')?null:r2(total-openAmt);
  var posE=null,posV=null;
  if(handoff&&!safe){var pv=$('f-pos').value.trim();if(pv!==''){posE=r2(parseFloat(pv)||0);posV=r2(total-posE);}}
  var entry={register:d.id,count_type:t,count_date:getBusinessDate(),cashier_name:name,counted_by:name,counted_at:new Date().toISOString(),
    counts_json:JSON.stringify(breakdown),total:total,starting_balance:r2(openAmt),pull_amount:pull,pos_expected:posE,pos_variance:posV};
  S.saving=true;$('btn-save').disabled=true;
  if(S.editRow){
    // Editing a saved count: the numbers it had before are kept on the count itself.
    var old=S.editRow,ob={};try{ob=JSON.parse(old.counts_json||'{}')||{};}catch(e){}
    var edits=(ob.edits||[]).slice();
    edits.push({at:new Date().toISOString(),total:old.total,pull_amount:old.pull_amount,starting_balance:old.starting_balance,pos_expected:old.pos_expected,pos_variance:old.pos_variance,counted_by:old.counted_by,counts:{coins:ob.coins||{},rolls:ob.rolls||{},bills:ob.bills||{}},tipout:ob.tipout||0});
    breakdown.edits=edits;
    var patchBody={cashier_name:name,counted_by:name,counts_json:JSON.stringify(breakdown),total:total,starting_balance:r2(openAmt),pull_amount:pull,pos_expected:posE,pos_variance:posV};
    api(S.store.table+'?id=eq.'+old.id,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(patchBody)}).then(function(r){
      if(!r.ok){return r.text().then(function(tx){var e=new Error('db '+r.status);e.status=r.status;e.body=tx;throw e;});}
      for(var k in patchBody){old[k]=patchBody[k];}
      S.editRow=null;S.saving=false;$('btn-save').disabled=false;back();renderEntry(S.entryIdx);
    }).catch(function(e){S.saving=false;$('btn-save').disabled=false;alert('The change was NOT saved: '+e.message+'. Check the connection and try again.');});
    return;
  }
  api(S.store.table,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify([entry])}).then(function(r){
    if(!r.ok){return r.text().then(function(tx){var e=new Error('db '+r.status);e.status=r.status;e.body=tx;throw e;});}
    delete S.drafts[draftKey()];persistDrafts();
    goHome();
  }).catch(function(e){
    S.saving=false;$('btn-save').disabled=false;
    var missing=(e.status===404||(e.body&&e.body.indexOf('PGRST205')>=0));
    alert(missing?(S.store.name+' isn\'t set up in the database yet, so this count was NOT saved. Run the set-up SQL, then count again.'):('This count was NOT saved: '+e.message+'. Check the connection and try again.'));
  });
}

// ---------- one drawer's counts (See Counts / History) ----------
function seeCounts(){S.regRows=(S.today[S.drawer.id]||[]).slice();renderReg(S.drawer.id);go('s-reg');}
function renderReg(reg){
  $('reg-title').textContent=labelOf(reg);
  var rows=S.regRows;
  $('reg-sub').textContent=rows.length+' count'+(rows.length===1?'':'s');
  $('reg-list').innerHTML=rows.length?rows.map(function(e,i){
    var spot=e.count_type==='spot_check';
    var line=spot?'Counted only':(e.pull_amount==null?'':sm(Number(e.pull_amount)));
    var lc=spot?'#666':(e.pull_amount==null?'#666':sc(Number(e.pull_amount)));
    return '<div class="drow" onclick="openEntry('+i+')"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:13.5px;"><span>'+(TYPE_LABELS[e.count_type]||esc(e.count_type))+'</span><span>'+money(e.total)+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;font-size:11.5px;color:#888;margin-top:3px;"><span>'+fmtTime(e.counted_at)+' \u00b7 '+esc(e.counted_by||e.cashier_name||'\u2014')+'</span><span style="color:'+lc+';font-weight:700;">'+line+'</span></div></div>';
  }).join(''):'<div class="muted">No counts yet.</div>';
}
function openEntry(i){renderEntry(i);go('s-entry');}
function renderEntry(i){
  S.entryIdx=i;var e=S.regRows[i];var b={};try{b=e.counts_json?JSON.parse(e.counts_json):{};}catch(x){}
  $('entry-title').textContent=labelOf(e.register)+' \u2014 '+(TYPE_LABELS[e.count_type]||'')+' \u00b7 '+fmtTime(e.counted_at);
  var rows='';
  ['coins','rolls','bills'].forEach(function(sec){if(!b[sec])return;ITEMS[sec].forEach(function(it){var q=b[sec][it.id]||0;if(!q)return;rows+='<div class="srow"><span>'+it.label+'</span><span>\u00d7'+q+' = '+money(q*it.value)+'</span></div>';});});
  if(!rows)rows='<div class="muted">No breakdown recorded.</div>';
  var h=rows+'<div class="srow" style="border-top:2px solid #0D0D0D;margin-top:6px;font-size:15px;font-weight:700;border-bottom:none;"><span>Total counted</span><span>'+money(e.total)+'</span></div>';
  if(e.starting_balance!=null&&e.count_type!=='spot_check')h+='<div class="srow"><span>Drawer opened at</span><span>'+money(e.starting_balance)+'</span></div>';
  if(e.pull_amount!=null&&e.count_type!=='spot_check')h+='<div class="srow"><span>Compared to opening amount</span><span style="color:'+sc(Number(e.pull_amount))+';font-weight:700;">'+sm(Number(e.pull_amount))+'</span></div>';
  if(e.pos_expected!=null)h+='<div class="srow"><span>POS expected</span><span>'+money(e.pos_expected)+'</span></div>';
  if(e.pos_variance!=null)h+='<div class="srow"><span>POS check</span><span style="color:'+sc(Number(e.pos_variance))+';font-weight:700;">'+sm(Number(e.pos_variance))+'</span></div>';
  if(b.tipout)h+='<div class="srow"><span>Tip-out paid (recorded)</span><span>'+money(b.tipout)+'</span></div>';
  h+='<div class="srow" style="border-bottom:none;"><span>Counted by</span><span>'+esc(e.counted_by||e.cashier_name||'\u2014')+'</span></div>';
  if(b.edits&&b.edits.length){h+='<div class="hint" style="margin:10px 0 0;">Edited '+b.edits.length+' time'+(b.edits.length===1?'':'s')+'. The original total was '+money(b.edits[0].total)+'.</div>';}
  $('entry-body').innerHTML=h;
}

// ---------- history: calendar -> day -> drawer -> count ----------
function openHistory(){S.calOffset=0;go('s-cal');renderCal();}
function calMonth(n){S.calOffset+=n;renderCal();}
function renderCal(){
  var wrap=$('cal-wrap'),st=S.store;wrap.innerHTML='<div class="muted center pad">Loading&hellip;</div>';
  var now=new Date();now.setHours(0,0,0,0);
  var tm=new Date(now.getFullYear(),now.getMonth()+S.calOffset,1);
  var dim=new Date(tm.getFullYear(),tm.getMonth()+1,0).getDate(),first=tm.getDay();
  var ym=tm.getFullYear()+'-'+pad(tm.getMonth()+1);
  var names=['January','February','March','April','May','June','July','August','September','October','November','December'];
  loadRows('count_date=gte.'+ym+'-01&count_date=lte.'+ym+'-'+pad(dim)+'&select=count_date,register,count_type').then(function(rows){
    if(S.store!==st)return;
    var by={};rows.forEach(function(r){var k=normReg(r.register);if(!by[r.count_date])by[r.count_date]={};if(!by[r.count_date][k])by[r.count_date][k]=[];by[r.count_date][k].push(r.count_type);});
    var h='<div class="mrow"><button class="btn back" onclick="calMonth(-1)">&lsaquo;</button><div class="mtitle">'+names[tm.getMonth()]+' '+tm.getFullYear()+'</div><button class="btn back" onclick="calMonth(1)">&rsaquo;</button></div>';
    h+='<div class="legend"><span>&#128994; Fully closed</span><span>&#128993; Still open</span><span>&#9898; No data</span></div><div class="grid7">';
    ['S','M','T','W','T','F','S'].forEach(function(x){h+='<div class="dow">'+x+'</div>';});
    for(var i=0;i<first;i++)h+='<div></div>';
    var bt=getBusinessDate();
    for(var day=1;day<=dim;day++){
      var ds=ym+'-'+pad(day),dd=by[ds],bg='#fafaf9',col='#bbb';
      if(dd){var regs=Object.keys(dd);var all=regs.every(function(r){return dd[r].indexOf('closer')!==-1;});if(all){bg='#eafaf1';col='#27AE60';}else{bg='#fff8e6';col='#C98A00';}}
      h+='<div class="day" '+(dd?'onclick="openDay(\''+ds+'\')"':'')+' style="background:'+bg+';color:'+col+';font-weight:'+(dd?'700':'400')+';cursor:'+(dd?'pointer':'default')+';'+(ds===bt?'outline:2px solid #E31010;':'')+'">'+day+'</div>';
    }
    wrap.innerHTML=h+'</div>';
  }).catch(function(e){if(S.store===st)wrap.innerHTML=errHtml(e);});
}
function openDay(ds){
  $('day-title').textContent=fmtDate(ds);$('day-list').innerHTML='<div class="muted center pad">Loading&hellip;</div>';go('s-day');
  var st=S.store;
  loadRows('count_date=eq.'+ds+'&order=counted_at.asc').then(function(rows){
    if(S.store!==st)return;
    var by={};rows.forEach(function(r){var k=normReg(r.register);if(!by[k])by[k]=[];by[k].push(r);});
    S.dayRows=by;S.dayRegs=orderRegs(Object.keys(by));
    $('day-list').innerHTML=S.dayRegs.length?S.dayRegs.map(function(reg,i){
      var es=by[reg],cl=es.filter(function(e){return e.count_type==='closer';}),closed=cl.length>0,last=closed?cl[cl.length-1]:es[es.length-1];
      return '<div class="dcard" onclick="openDayReg('+i+')"><div class="dname">'+esc(labelOf(reg))+'</div><div class="dstat" style="color:'+(closed?'#1a7a3c':'#8a6d00')+';font-weight:600;">'+es.length+' count(s) \u00b7 '+(closed?'Closed '+money(last.total):'Not yet closed')+'</div></div>';
    }).join(''):'<div class="muted">No counts for this day.</div>';
  }).catch(function(e){$('day-list').innerHTML=errHtml(e);});
}
function openDayReg(i){var reg=S.dayRegs[i];S.regRows=S.dayRows[reg]||[];renderReg(reg);go('s-reg');}

// ---------- discrepancies ----------
function openDisc(){S.discDays=30;go('s-disc');loadDisc();}
function setDiscDays(n){S.discDays=n;loadDisc();}
function loadDisc(){
  var st=S.store,body=$('disc-body');
  $('disc-chips').innerHTML=[7,30,90].map(function(n){return '<div class="chip'+(S.discDays===n?' on':'')+'" onclick="setDiscDays('+n+')">'+n+' days</div>';}).join('');
  body.innerHTML='<div class="muted center pad">Loading&hellip;</div>';
  var s=new Date(getBusinessDate()+'T12:00:00');s.setDate(s.getDate()-(S.discDays-1));
  var start=s.getFullYear()+'-'+pad(s.getMonth()+1)+'-'+pad(s.getDate());
  loadRows('count_date=gte.'+start+'&order=count_date.desc,counted_at.desc&limit=2000').then(function(rows){
    if(S.store!==st)return;
    var flagged=[];
    rows.forEach(function(r){
      var reg=normReg(r.register),d=drawerById(reg),safe=(d&&d.kind==='safe');
      if(safe){if(r.count_type!=='spot_check'&&r.pull_amount!=null&&Math.abs(Number(r.pull_amount))>=0.005)flagged.push({r:r,reg:reg,diff:Number(r.pull_amount),kind:'safe'});}
      else if(r.pos_variance!=null&&Math.abs(Number(r.pos_variance))>=0.005)flagged.push({r:r,reg:reg,diff:Number(r.pos_variance),kind:'pos'});
    });
    S.discRows=flagged.map(function(f){return f.r;});
    var shorts=flagged.filter(function(f){return f.diff<0;}).length,overs=flagged.length-shorts,net=0,by={};
    flagged.forEach(function(f){net+=f.diff;by[f.reg]=(by[f.reg]||0)+f.diff;});
    var h='<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;"><span class="muted">Flagged counts, last '+S.discDays+' days</span><b style="font-size:20px;">'+flagged.length+'</b></div>'
      +'<div class="srow"><span>Short</span><span style="color:#c8102e;font-weight:700;">'+shorts+'</span></div><div class="srow"><span>Over</span><span style="color:#8a6d00;font-weight:700;">'+overs+'</span></div>'
      +'<div class="srow" style="border-bottom:none;"><span><b>Net difference</b></span><span style="color:'+sc(net)+';font-weight:700;">'+sm(r2(net))+'</span></div>';
    orderRegs(Object.keys(by)).forEach(function(reg){h+='<div class="srow"><span>'+esc(labelOf(reg))+'</span><span style="color:'+sc(by[reg])+';font-weight:700;">'+sm(r2(by[reg]))+'</span></div>';});
    h+='</div>';
    if(!flagged.length)h+='<div class="card center" style="color:#1a7a3c;font-weight:600;">Nothing flagged &mdash; every POS check and safe count matched.</div>';
    flagged.forEach(function(f,i){
      var r=f.r,what=(f.kind==='safe')?('Counted '+money(r.total)+' vs target '+money(Number(r.total)-Number(r.pull_amount))):('Counted '+money(r.total)+' vs POS '+money(r.pos_expected));
      h+='<div class="drow" onclick="openDiscEntry('+i+')"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:13.5px;"><span>'+esc(labelOf(f.reg))+' \u00b7 '+(TYPE_LABELS[r.count_type]||'')+'</span><span style="color:'+sc(f.diff)+';">'+sm(f.diff)+'</span></div>'
        +'<div style="font-size:11.5px;color:#888;margin-top:3px;">'+r.count_date+' \u00b7 '+fmtTime(r.counted_at)+' \u00b7 '+esc(r.counted_by||r.cashier_name||'\u2014')+'</div><div style="font-size:11.5px;color:#666;margin-top:2px;">'+what+'</div></div>';
    });
    body.innerHTML=h;
  }).catch(function(e){if(S.store===st)body.innerHTML=errHtml(e);});
}
function openDiscEntry(i){S.regRows=S.discRows;openEntry(i);}

// ---------- end-of-day report (what prints) ----------
function openReport(){
  var bd=getBusinessDate(),st=S.store;
  loadRows('count_date=eq.'+bd+'&order=counted_at.asc').then(function(rows){
    if(S.store!==st)return;
    if(!rows.length){alert('No drawer counts logged for today yet.');return;}
    $('rpt').innerHTML=buildReport(bd,rows);go('s-report');
  }).catch(function(e){alert('Couldn\'t load the counts: '+e.message);});
}
function buildReport(dateStr,rows){
  var groups={},names=[];
  rows.forEach(function(r){var k=normReg(r.register);if(!groups[k]){groups[k]=[];names.push(k);}groups[k].push(r);});
  names=orderRegs(names);
  var posShort=0,eod=0,sections='',summary='';
  names.forEach(function(name){
    var list=groups[name].slice().sort(function(a,b){return new Date(a.counted_at)-new Date(b.counted_at);});
    var label=labelOf(name),net=0,body='';
    list.forEach(function(r){
      var spot=r.count_type==='spot_check',line=Number(r.pull_amount||0);if(!spot)net+=line;
      var hasPos=r.pos_expected!=null&&r.pos_variance!=null;
      body+='<tr class="'+(hasPos?'hp':'')+'"><td class="ty">'+(TYPE_LABELS[r.count_type]||'')+'</td><td>'+esc(r.counted_by||r.cashier_name||'\u2014')+'</td><td class="g">'+fmtTime(r.counted_at)+'</td><td class="n">'+money(r.total)+'</td><td class="n b" style="color:'+(spot?'#666':sc(line))+'">'+(spot?'Counted only':sm(line))+'</td></tr>';
      if(hasPos){var pv=Number(r.pos_variance);if(pv<-0.005)posShort++;
        body+='<tr class="pos"><td colspan="5" style="color:'+(pv<-0.005?'#c8102e':(Math.abs(pv)<0.005?'#1a7a3c':'#8a6d00'))+'">POS check: '+(Math.abs(pv)<0.005?'Even':(pv<0?'SHORT '+money(Math.abs(pv)):'OVER '+money(pv)))+' (expected '+money(r.pos_expected)+')</td></tr>';}
    });
    eod+=net;
    sections+='<div class="dr-sec"><div class="dr-head">'+esc(label)+'</div><table class="dr"><tr><th>Count</th><th>Name</th><th>Time</th><th class="n">Total</th><th class="n">+ / -</th></tr>'+body+'</table><div class="dr-net"><span>DRAWER NET</span><b style="color:'+sc(net)+'">'+sm(r2(net))+'</b></div></div>';
    summary+='<div class="dr-srow"><span>'+esc(label)+'</span><span style="color:'+scDark(net)+'">'+sm(r2(net))+'</span></div>';
  });
  return '<div class="rpt-head"><img src="'+LOGOS[S.store.key]+'" alt=""><div><div class="rpt-title">END OF DAY &mdash; DRAWER COUNTS</div><div class="rpt-sub">Zazzo\'s Pizza &amp; Catering &mdash; '+esc(S.store.name)+'</div></div></div>'
    +'<div class="rpt-date">'+fmtDate(dateStr)+'</div>'+sections
    +'<div class="dr-eod">'+summary+'<div class="dr-total"><span>END OF DAY TOTAL</span><span style="color:'+scDark(eod)+'">'+sm(r2(eod))+'</span></div>'+(posShort?'<div style="font-size:10px;color:#ff8a8a;margin-top:6px;letter-spacing:0.04em;">'+posShort+' POS SHORTAGE(S)</div>':'')+'</div>'
    +'<div class="rpt-foot">Each line is that count compared to the drawer\'s opening amount (Safe: its target). Drawer Net adds up that drawer\'s lines. Spot checks are not included.</div>';
}

// ---------- home screen: Drawer Count (anyone) or Stores (PIN) ----------
var PIN='1043';
function openStores(){
  if(S.unlocked){go('s-stores');return;}
  askPin('Stores','Enter the PIN to open the stores.',function(){S.unlocked=true;go('s-stores');});
}
function askPin(title,sub,cb){
  S.pinCb=cb;$('pin-title').textContent=title;$('pin-sub').textContent=sub||'';$('pin-input').value='';$('pin-err').textContent='';
  $('pin-modal').className='modal on';setTimeout(function(){try{$('pin-input').focus();}catch(e){}},60);
}
function pinSubmit(){
  if($('pin-input').value===PIN){var cb=S.pinCb;S.pinCb=null;$('pin-modal').className='modal';if(cb)cb();}
  else{$('pin-err').textContent='Wrong PIN';$('pin-input').value='';}
}
function pinCancel(){S.pinCb=null;$('pin-modal').className='modal';}

// ---------- simple counter: coins, coin rolls, dollars -> total. Nothing is saved. ----------
function openSimple(){buildSimple();go('s-simple');}
function buildSimple(){
  ['coins','rolls','bills'].forEach(function(sec){
    var h='';ITEMS[sec].forEach(function(it){h+='<div class="qrow"><span>'+it.label+'</span><input type="number" inputmode="numeric" min="0" id="sq-'+it.id+'" placeholder="0" oninput="recalcSimple()"></div>';});
    $('sbody-'+sec).innerHTML=h;
  });
  recalcSimple();
}
function recalcSimple(){
  var tot=0;
  ['coins','rolls','bills'].forEach(function(sec){
    var s=0;ITEMS[sec].forEach(function(it){var el=$('sq-'+it.id);var q=el?(parseInt(el.value,10)||0):0;s+=q*it.value;});
    s=r2(s);$('st-'+sec).textContent=money(s);tot+=s;
  });
  $('st-total').textContent=money(r2(tot));
}

// ---------- editing a saved count (PIN) -- the original numbers are kept on the count ----------
function editEntry(){
  askPin('Edit count','Enter the password to edit this saved count.',function(){startEdit(S.regRows[S.entryIdx]);});
}
function startEdit(row){
  var reg=normReg(row.register),d=drawerById(reg);
  if(!d)d={id:reg,label:String(reg).toUpperCase(),kind:'register',float:Number(row.starting_balance)||250};
  var b={};try{b=JSON.parse(row.counts_json||'{}')||{};}catch(e){}
  var q={};['coins','rolls','bills'].forEach(function(sec){var s=b[sec]||{};for(var k in s){if(s[k])q[k]=String(s[k]);}});
  S.drawer=d;S.type=row.count_type;
  openForm({type:row.count_type,name:row.counted_by||row.cashier_name||'',open:(row.starting_balance!=null?String(row.starting_balance):''),pos:(row.pos_expected!=null?String(row.pos_expected):''),tip:(b.tipout?String(b.tipout):''),q:q},true);
  S.editRow=row;
  $('form-title').textContent='EDIT \u2014 '+d.label+' \u2014 '+TYPE_LABELS[row.count_type];
  $('draft-banner').style.display='none';
}

// ---------- start ----------
document.getElementById('logo-darien').src=LOGOS.darien;
document.getElementById('logo-westmont').src=LOGOS.westmont;
loadDrafts();
show('s-landing');
