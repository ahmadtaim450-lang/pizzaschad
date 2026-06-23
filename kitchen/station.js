/* ============================================================
   PIZZA SCHAD - Küchen-Stationen (gemeinsame Logik)
   Erwartet eine globale Konfiguration window.STATION:
   { id:'pizza'|'salat'|'kochen', title:'…', icon:'…', empty:'…' }
   ============================================================ */
(function(){
'use strict';

var STATION = window.STATION || { id:'kochen', title:'Station', icon:'🍳', empty:'Keine Artikel' };

/* ---- Stations-Zuordnung -------------------------------------------------
   pizza  : alle Pizzen (inkl. Pizza-Teile aus Angeboten)
   salat  : Salate + Burger
   kochen : Pasta, Lasagne, Gnocchi, Schnitzel, mexikanisch, Enchiladas,
            Grill, pakistanisch, Finger Food …  (alles übrige Gekochte)
   null   : Getränke / Extras (gehören zu keiner Koch-Station, blockieren
            die Fertigmeldung nicht)
*/
var CAT_STATION = {
  pizza:'pizza',
  salate:'salat', burger:'salat', fingerfood:'salat', extras:'salat', getraenke:'salat',
  lasagne:'kochen', pasta:'kochen', gnocchi:'kochen', schnitzel:'kochen',
  mexikanisch:'kochen', enchiladas:'kochen', gegrilltes:'kochen',
  pakistanisch:'kochen'
};

function nameStation(name){
  var n = String(name||'').toLowerCase();
  if (/pizza/.test(n)) return 'pizza';
  if (/salat|burger|pommes|cola|fanta|sprite|mezzo|eistee|wasser|sprudel|getr|saft|limo|tiramisu|apfelstrudel|nuggets|wings|onion|calamari|krokette|potato|cookie/.test(n)) return 'salat';
  return 'kochen';
}

function itemStation(item){
  if (!item) return null;
  if (item.combo && item.combo.isPizza) return 'pizza';
  var cat = getItemCategory(item);
  if (cat && Object.prototype.hasOwnProperty.call(CAT_STATION, cat)) return CAT_STATION[cat];
  // Unbekannte Kategorie (z.B. Angebots-Teile ohne echte productId) -> über Namen
  return nameStation(item.name);
}

function orderItemsForStation(order, sid){
  return (order.items||[]).filter(function(it){ return itemStation(it) === sid; });
}

/* ---- State ---- */
var orders = {};
var seenForStation = {};   // orderId -> true
var firstSeenMap = {};     // orderId -> Zeitpunkt (ms), an dem diese Anzeige die Bestellung zuerst sah
var db = null;
var menuDesc = {};
var menuCat = {};

/* ---- Firebase ---- */
var firebaseConfig = {
  apiKey: "AIzaSyDH-UQwNv4t0Xafz8-ARZjyr69k9VHVlDI",
  authDomain: "schad-62da7.firebaseapp.com",
  projectId: "schad-62da7",
  storageBucket: "schad-62da7.firebasestorage.app",
  messagingSenderId: "331626315267",
  appId: "1:331626315267:web:30bf0cc377186b32131836"
};
function setStatus(txt, ok){
  var el = document.getElementById('firebaseStatus');
  if (!el) return;
  el.textContent = txt;
  el.style.background = ok ? '#2ecc7122' : '#e74c3c22';
  el.style.color = ok ? '#2ecc71' : '#e74c3c';
  el.style.borderColor = ok ? '#2ecc7144' : '#e74c3c44';
}
try {
  if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  setStatus('Online', true);
} catch(e){
  setStatus('Offline', false);
  document.getElementById('ordersGrid').innerHTML = '<div class="empty-state"><div class="icon">❌</div><h2>Firebase nicht verbunden</h2><p>Bitte Seite neu laden (Ctrl+Shift+R)</p></div>';
}

/* ---- Menu (Kategorie + Zutaten) ---- */
function loadMenu(){
  fetch('../firebase/menu-data.json')
    .then(function(r){ return r.json(); })
    .then(function(data){
      ((data && data.products) || []).forEach(function(p){
        var d = (p.description == null ? '' : String(p.description)).trim();
        if (p.id){ if (d) menuDesc['id:'+p.id] = d; if (p.category) menuCat['id:'+p.id] = p.category; }
        if (p.productNumber != null){ if (d) menuDesc['num:'+String(p.productNumber)] = d; if (p.category) menuCat['num:'+String(p.productNumber)] = p.category; }
      });
      renderAll();
    })
    .catch(function(){});
}
function getItemIngredients(item){
  if (!item) return '';
  if (item.productId && menuDesc['id:'+item.productId]) return menuDesc['id:'+item.productId];
  if (item.productNumber != null && menuDesc['num:'+String(item.productNumber)]) return menuDesc['num:'+String(item.productNumber)];
  return '';
}
function getItemCategory(item){
  if (!item) return '';
  if (item.productId && menuCat['id:'+item.productId]) return menuCat['id:'+item.productId];
  if (item.productNumber != null && menuCat['num:'+String(item.productNumber)]) return menuCat['num:'+String(item.productNumber)];
  return '';
}

/* ---- Uhr ---- */
function tickClock(){ document.getElementById('clock').textContent = new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
setInterval(tickClock,1000); tickClock();

/* ---- Kein Ton in den Stationen (nur die "Alle"-Anzeige spielt Töne) ---- */

/* ---- Zeit / Deadline ----
   Der Timer wird am Zeitpunkt verankert, an dem DIESE Anzeige die Bestellung
   zuerst gesehen hat. Dadurch startet jede neue Bestellung bei 0 — unabhängig
   von einer falsch eingestellten Geräteuhr (sonst sprang der Timer z.B. auf
   tausende Sekunden). createdAt wird nur genutzt, wenn es plausibel ist. */
function getEffectiveStart(order){
  var now = Date.now();
  var fs = firstSeenMap[order.id] || now;
  var created = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
  if (!isFinite(created)) return fs;
  if (created > now || (fs - created) > 120000) return fs; // Uhr unzuverlässig
  return created;
}
function getOrderAgeMinutes(order){ return Math.floor(Math.max(0, Date.now()-getEffectiveStart(order))/60000); }
function formatTimeAgo(ts){
  if (!ts) return '0 min';
  var d = Math.floor((Date.now()-new Date(ts).getTime())/1000);
  if (d < 0) d = 0;
  var m = Math.floor(d/60), h = Math.floor(m/60);
  if (h>0) return h+' Std '+(m%60)+' min';
  return m+' min';
}
function getDeadlineInfo(order){
  if (!order.deadline) return null;
  var p = order.deadline.split(':').map(Number), dl = new Date(); dl.setHours(p[0],p[1],0,0);
  var diff = Math.floor((dl - Date.now())/60000);
  return { time:order.deadline, minsLeft:diff, isDue:diff<=0 };
}
setInterval(function(){
  document.querySelectorAll('.card-timer').forEach(function(e){ var t = e.dataset.timestamp; if (t) e.textContent = '⏱ '+formatTimeAgo(t); });
  document.querySelectorAll('.deadline-banner').forEach(function(el){
    var ts = el.dataset.deadline; if (!ts) return;
    var p = ts.split(':').map(Number), dl = new Date(); dl.setHours(p[0],p[1],0,0);
    var dm = Math.floor((dl-Date.now())/60000), mins = Math.abs(dm);
    if (dm<=0){ el.className='deadline-banner due'; el.textContent='⚠️ ÜBERFÄLLIG seit '+mins+' min — SOFORT! ('+ts+')'; }
    else if (dm<=15){ el.className='deadline-banner near'; el.textContent='🚨 NOCH '+mins+' MIN — Fertig bis '+ts; }
    else if (dm<=30){ el.className='deadline-banner near'; el.textContent='⏰ NOCH '+mins+' MIN — Fertig bis '+ts; }
    else { el.className='deadline-banner ok'; el.textContent='✓ Fertig bis '+ts+' (in '+mins+' min)'; }
  });
},1000);

/* ---- Modifier-/Item-Rendering (wie Hauptanzeige) ---- */
function modGroupMeta(rawGroup){
  var g = String(rawGroup||'').trim().toLowerCase();
  if (g==='belag'||g==='beläge'||g==='belaege') return { label:'🍕 Belag', cls:'g-belag' };
  if (g==='special'||g==='käserand'||g==='kaeserand'||g==='auf wunsch') return { label:'🧀 Wunsch', cls:'g-special' };
  if (g==='extras'||g==='extra'||g==='extrazutaten'||g==='extra zutaten') return { label:'➕ Extra', cls:'g-extra' };
  if (!g) return { label:'➕ Extra', cls:'g-extra' };
  return { label:'➕ '+String(rawGroup).trim(), cls:'g-extra' };
}
function renderItemModifiers(item){
  var mods = (item && item.modifiers) || [];
  if (!Array.isArray(mods) || mods.length === 0) return '';
  var order = [], map = {};
  for (var i=0;i<mods.length;i++){
    var m = mods[i]; if (!m) continue;
    var name = (typeof m === 'string') ? m : (m.option != null ? m.option : (m.name != null ? m.name : ''));
    name = String(name).trim();
    if (!name || name.toLowerCase()==='undefined' || name.toLowerCase()==='null') continue;
    var rawGroup = (typeof m === 'object' && m && m.group != null) ? m.group : 'Extra';
    var key = String(rawGroup).trim().toLowerCase() || 'extra';
    if (!map[key]){ map[key] = { meta:modGroupMeta(rawGroup), vals:[] }; order.push(key); }
    map[key].vals.push(name);
  }
  if (order.length === 0) return '';
  var html = '<div class="item-modifiers">';
  for (var j=0;j<order.length;j++){
    var grp = map[order[j]];
    html += '<div class="mod-group '+grp.meta.cls+'"><span class="mod-label">'+grp.meta.label+'</span>'
      + grp.vals.map(function(n){ return '<span class="mod-val">'+n+'</span>'; }).join('') + '</div>';
  }
  return html + '</div>';
}
function renderItemsList(items){
  if (!Array.isArray(items)) return '';
  var html = '', lastCombo = null;
  items.forEach(function(item){
    if (!item) return;
    var cid = item.comboId || null;
    if (cid && cid !== lastCombo){ html += '<li class="combo-header">🌟 '+(String(item.comboName||'Angebot').trim()||'Angebot')+'</li>'; lastCombo = cid; }
    else if (!cid){ lastCombo = null; }
    var sizeName = item.size ? String(item.size.name||item.size.id||'').trim() : '';
    var notes = item.notes ? String(item.notes).trim() : '';
    var ingredients = getItemIngredients(item);
    html += '<li'+(cid?' class="combo-item"':'')+'><span class="item-qty">'+(item.quantity||1)+'x</span><div class="item-info">'
      + '<div class="item-name">'+(item.name||'?')+(item.productNumber?' <span class="item-product-num">#'+item.productNumber+'</span>':'')+'</div>'
      + (ingredients?'<div class="item-base"><span class="ib-icon">🧾</span><span>'+ingredients+'</span></div>':'')
      + (sizeName?'<div class="item-size">📏 '+sizeName+'</div>':'')
      + renderItemModifiers(item)
      + (notes?'<div class="item-notes">📝 '+notes+'</div>':'')
      + '</div></li>';
  });
  return html;
}

/* ---- Karte ---- */
function renderCard(order){
  var items = orderItemsForStation(order, STATION.id);
  var ts = order.createdAt, age = getOrderAgeMinutes(order);
  var effIso = new Date(getEffectiveStart(order)).toISOString();
  var addr = order.address ? String(order.address).trim() : '';
  var ageCard = age>60 ? ' age-crit' : (age>30 ? ' age-hot' : '');
  var ageTimer = age>60 ? ' age-crit' : (age>30 ? ' age-hot' : (age>15 ? ' age-warn' : ''));

  var deadlineHtml = '';
  if (order.deadline){
    var dl = getDeadlineInfo(order);
    if (dl){
      var cls, txt;
      if (dl.isDue){ cls=' due'; txt='⚠️ ÜBERFÄLLIG seit '+Math.abs(dl.minsLeft)+' min — SOFORT! ('+dl.time+')'; }
      else if (dl.minsLeft<=15){ cls=' near'; txt='🚨 NOCH '+dl.minsLeft+' MIN — Fertig bis '+dl.time; }
      else if (dl.minsLeft<=30){ cls=' near'; txt='⏰ NOCH '+dl.minsLeft+' MIN — Fertig bis '+dl.time; }
      else { cls=' ok'; txt='✓ Fertig bis '+dl.time+' (in '+dl.minsLeft+' min)'; }
      deadlineHtml = '<div class="deadline-banner'+cls+'" data-deadline="'+order.deadline+'">'+txt+'</div>';
    }
  }

  return '<div class="order-card'+ageCard+'" id="card-'+order.id+'">'
    + '<div class="card-header">'
    +   '<div><div class="order-number">'+order.orderNumber+'</div><div class="order-time">'+new Date(ts).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr</div></div>'
    +   '<div class="card-timer'+ageTimer+'" data-timestamp="'+effIso+'">⏱ '+formatTimeAgo(effIso)+'</div>'
    + '</div>'
    + (addr ? '<div class="card-address">📍 '+addr+'</div>' : '')
    + deadlineHtml
    + '<div class="card-body"><ul class="order-items-list">'+renderItemsList(items)+'</ul></div>'
    + '<div class="card-actions"><button class="btn-station-ready" onclick="stationReady(\''+order.id+'\')">✓ جاهز</button></div>'
    + '</div>';
}

function visibleOrders(){
  return Object.values(orders).filter(function(o){
    if ((o.stationsDone||[]).indexOf(STATION.id) >= 0) return false;      // diese Station schon fertig
    return orderItemsForStation(o, STATION.id).length > 0;                 // hat Artikel für uns
  }).sort(function(a,b){ return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); });
}

function renderAll(){
  var grid = document.getElementById('ordersGrid');
  var list = visibleOrders();
  var cnt = document.getElementById('countNew'); if (cnt) cnt.textContent = list.length;
  if (list.length === 0){
    grid.innerHTML = '<div class="empty-state"><div class="icon">'+STATION.icon+'</div><h2>'+STATION.empty+'</h2><p>Neue Bestellungen erscheinen hier in Echtzeit</p></div>';
    return;
  }
  grid.innerHTML = list.map(renderCard).join('');
}

/* ---- Fertig melden: NUR die eigene Station ----
   Setzt den Bestellstatus NICHT auf READY. Die Bestellung bleibt NEW und
   verschwindet erst aus der "Alle"-Anzeige, wenn dort manuell "جاهز" gedrückt
   wird. Hier wird nur diese Station als erledigt markiert (atomar via arrayUnion),
   wodurch die Bestellung von DIESER Station-Anzeige verschwindet. */
window.stationReady = function(orderId){
  if (!db) return;
  db.collection('orders').doc(orderId).update({
    stationsDone: firebase.firestore.FieldValue.arrayUnion(STATION.id),
    updatedAt: firebase.firestore.Timestamp.now()
  }).then(function(){
    // Lokal sofort ausblenden (Snapshot bestätigt gleich darauf)
    if (orders[orderId]){
      var sd = orders[orderId].stationsDone || [];
      if (sd.indexOf(STATION.id) < 0) sd.push(STATION.id);
      orders[orderId].stationsDone = sd;
    }
    renderAll();
  }).catch(function(e){ console.error('stationReady error:', e); });
};

/* ---- Firestore-Listener ---- */
function processOrders(list){
  var next = {};
  var now = Date.now();
  list.forEach(function(o){
    next[o.id] = o;
    if (!firstSeenMap[o.id]) firstSeenMap[o.id] = now;   // Timer-Anker
    seenForStation[o.id] = true;
  });
  // aufräumen
  Object.keys(seenForStation).forEach(function(id){ if (!next[id]) delete seenForStation[id]; });
  Object.keys(firstSeenMap).forEach(function(id){ if (!next[id]) delete firstSeenMap[id]; });
  orders = next;
  renderAll();
}
function startListener(){
  if (!db) return false;
  try{
    db.collection('orders').where('status','==','NEW').onSnapshot(function(snapshot){
      var list = [];
      snapshot.forEach(function(doc){
        var d = doc.data();
        list.push({
          id: doc.id,
          orderNumber: d.orderNumber || '',
          status: d.status || 'NEW',
          items: d.items || [],
          deadline: d.deadline || null,
          address: d.address || null,
          stationsDone: d.stationsDone || [],
          createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString()
        });
      });
      processOrders(list);
    }, function(error){ console.error('Firestore listener error:', error); setStatus('Error', false); });
    return true;
  }catch(e){ console.error('listener start failed:', e); return false; }
}

loadMenu();
if (db) startListener();

})();
