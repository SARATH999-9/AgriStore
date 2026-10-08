const $=s=>document.querySelector(s), api=(u,o)=>fetch('/api'+u,o&&{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}).then(r=>r.json());
let lang=localStorage.lang||'en', user=JSON.parse(sessionStorage.user||'null');
const t=k=>(T[lang]&&T[lang][k])||T.en[k];
const page=document.body.dataset.page;
const speak=txt=>{try{const u=new SpeechSynthesisUtterance(txt);u.lang=LANGS[lang][1];speechSynthesis.speak(u)}catch{}};

function shell(){
  const links=[['index.html','home'],['advisory.html','advisory'],['logistics.html','storage'],['market.html','market'],['financial.html','finance'],['coldStorage.html','directory']];
  document.body.insertAdjacentHTML('afterbegin',`<header><span class="logo">🌿 Kisan Storage</span><nav>${links.map(l=>`<a href="${l[0]}">${t(l[1])}</a>`).join('')}</nav>
  <span><select id="lang">${Object.entries(LANGS).map(([k,v])=>`<option value="${k}" ${k==lang?'selected':''}>${v[0]}</option>`).join('')}</select>
  ${user?`<button class="alt" id="out">${t('logout')}</button>`:''}</span></header>
  <button id="mic" title="Voice">🎤</button><div id="vbox"></div>`);
  $('#lang').onchange=e=>{localStorage.lang=e.target.value;location.reload()};
  if($('#out'))$('#out').onclick=()=>{sessionStorage.clear();location.href='index.html'};
  $('#mic').onclick=listen;
}

// ---------- Voice ----------
const ROUTES=[[/advis|सलाह|సలహా|ஆலோசனை|ಸಲಹೆ|ഉപദേശം/i,'advisory.html'],[/storage|स्टोरेज|స్టోరేజ్|கிடங்கு|ಗೋದಾಮು|സ്റ്റോറേജ്|transport/i,'logistics.html'],
[/price|market|भाव|ధర|விலை|ಬೆಲೆ|വില/i,'market.html'],[/loan|financ|insurance|ऋण|రుణ|கடன்|ಸಾಲ|വായ്പ/i,'financial.html'],[/director|guntur/i,'coldStorage.html']];
function listen(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition, box=$('#vbox');box.style.display='block';
  if(!SR){box.textContent='Voice not supported in this browser (use Chrome).';return}
  box.innerHTML='🎤 Listening…<br><small>Try: "Open advisory", "Market price of wheat", "Find cold storage", "Apply for loan", "Help"</small>';
  const r=new SR();r.lang=LANGS[lang][1];r.onresult=e=>{
    const s=e.results[0][0].transcript;box.textContent='“'+s+'”';
    if(/help/i.test(s)){speak('You can say open advisory, find cold storage, market price, or apply for loan.');return}
    const m=ROUTES.find(x=>x[0].test(s));m?setTimeout(()=>location.href=m[1],600):speak('Sorry, I did not understand.')};
  r.onend=()=>setTimeout(()=>box.style.display='none',2500);r.start();
}

// ---------- Helpers ----------
const status=s=>{const p=s.available/s.capacity*100;return p>30?['ok','Available','#2e7d32']:p>=10?['mid','Medium','#ef8a00']:['full','Full','#c62828']};
const rows=list=>list.map((s,i)=>{const [c,l,col]=status(s),used=Math.round((1-s.available/s.capacity)*100);
 return `<tr><td>${i+1}</td><td>${s.name}</td><td>${s.location}</td><td>${s.capacity} t</td><td><div class="bar"><i style="width:${used}%;background:${col}"></i></div>${used}%</td>
 <td class="${c}">${s.available?s.available+' t':'Full'} (${l})</td><td>${s.temperature}</td><td>${s.crops.join(', ')}</td><td>${s.contact}</td></tr>`}).join('');
const guard=()=>{if(!user){location.href='index.html';return false}return true};

// ---------- Pages ----------
const pages={
index(){
  if(user)return dashboard();
  $('#app').innerHTML=`<main><h1>${t('welcome')}</h1><p>${t('tag')}</p>
  <div class="tabs"><button id="tl">Login</button><button id="ts">Sign up</button></div><br>
  <form id="login"><input id="ln" placeholder="Full name"><input id="lp" placeholder="Phone (10 digits)" maxlength="10">
   <button type="button" id="so">Send OTP to my email</button><input id="lo" placeholder="6-digit OTP" maxlength="6"><button type="button" id="vo">Verify &amp; Login</button></form>
  <form id="signup" style="display:none"><input id="sn" placeholder="Full name"><input id="sp" placeholder="Phone (10 digits)" maxlength="10"><input id="se" type="email" placeholder="Email (OTP is sent here)">
   <textarea id="sa" placeholder="Address"></textarea><select id="ss"><option value="">State</option><option>Andhra Pradesh</option><option>Telangana</option><option>Tamil Nadu</option><option>Karnataka</option><option>Kerala</option><option>Punjab</option><option>Haryana</option><option>Maharashtra</option><option>Uttar Pradesh</option></select>
   <button type="button" id="sg">Create account</button></form><div class="msg" id="m"></div>
  <h2>Features</h2><div class="grid"><div class="card"><h3>🤖 ${t('advisory')}</h3>Crop advice from soil and weather</div><div class="card"><h3>🚚 ${t('storage')}</h3>Storage and transport booking</div><div class="card"><h3>📈 ${t('market')}</h3>Live mandi prices</div><div class="card"><h3>💰 ${t('finance')}</h3>Loans, insurance, schemes</div></div></main>`;
  const m=x=>$('#m').textContent=x;
  $('#tl').onclick=()=>{$('#login').style.display='grid';$('#signup').style.display='none'};
  $('#ts').onclick=()=>{$('#signup').style.display='grid';$('#login').style.display='none'};
  $('#sg').onclick=async()=>{const r=await api('/register-farmer',{name:$('#sn').value,phone:$('#sp').value,email:$('#se').value,address:$('#sa').value,state:$('#ss').value});m(r.message);if(r.success)$('#tl').click()};
  $('#so').onclick=async()=>{m('Sending…');m((await api('/send-otp',{name:$('#ln').value,phone:$('#lp').value})).message)};
  $('#vo').onclick=async()=>{const r=await api('/verify-otp',{phone:$('#lp').value,otp:$('#lo').value});if(!r.success)return m(r.message);
    sessionStorage.user=JSON.stringify(r.user);user=r.user;speak(`${t('welcome')}, ${user.name}!`);location.reload()};
},
advisory(){if(!guard())return;$('#app').innerHTML=`<main><h1>${t('advisory')}</h1><div class="grid">
 <div class="card"><h3>☁️ Weather</h3>32°C · Humidity 68% · Wind 12 km/h · Rain chance 20%<br><small>Sample data. Connect OpenWeatherMap for live data.</small></div>
 <div class="card"><h3>🌱 Soil</h3>Black cotton soil · pH 7.1<br>N 280 · P 22 · K 190 kg/ha</div>
 <div class="card"><h3>🔁 Rotation</h3>Kharif: Rice, Cotton<br>Rabi: Wheat, Chickpea<br>Zaid: Maize, Vegetables</div></div>
 <div class="card" style="margin-top:1rem"><h3>Recommendations</h3><ul><li>Wheat: ideal for this soil. Expected 4.2 t/ha</li><li>Rice: suitable with water management. 5.1 t/ha</li><li>Corn: good market demand. 6.3 t/ha</li></ul>Diversify with chickpea or soybean.</div></main>`},
logistics(){if(!guard())return;
  $('#app').innerHTML=`<main><h1>${t('storage')}</h1><input id="q" placeholder="Search location or crop" style="width:100%"><div class="grid" id="cards" style="margin-top:1rem"></div>
  <h2>Transport</h2><table><tr><th>Vehicle</th><th>Capacity</th><th>Price</th></tr><tr><td>Open Truck</td><td>5-8 t</td><td>₹8-12/km</td></tr><tr><td>Closed Truck</td><td>5-10 t</td><td>₹10-15/km</td></tr><tr><td>Reefer Van</td><td>3-6 t</td><td>₹15-20/km</td></tr><tr><td>Tractor Trailer</td><td>2-4 t</td><td>₹5-8/km</td></tr></table></main>`;
  const draw=async()=>{const r=await api('/storages?q='+encodeURIComponent($('#q').value));$('#cards').innerHTML=r.data.map(s=>{const [c,l]=status(s);return `<div class="card"><h3>${s.name}</h3>📍 ${s.location}<br>${s.price}<br>${s.temperature} · <span class="${c}">${l}</span><br>
   <button data-id="${s.id}" style="margin-top:.6rem">Book storage</button></div>`}).join('');
   document.querySelectorAll('[data-id]').forEach(b=>b.onclick=async()=>{const q=+prompt('Quantity (tons)?');if(q)alert((await api('/book-storage',{storageId:b.dataset.id,phone:user.phone,quantity:q})).message)})};
  $('#q').oninput=draw;draw()},
async market(){if(!guard())return;
  $('#app').innerHTML=`<main><h1>${t('market')}</h1><select id="c"><option>Wheat</option><option>Rice</option><option>Chillies</option><option>Cotton</option><option>Onions</option><option>Sugarcane</option></select>
  <select id="r"><option value="7d">7 Days</option><option value="1m" selected>1 Month</option><option value="3m">3 Months</option><option value="6m">6 Months</option><option value="1y">1 Year</option></select>
  <canvas id="ch" height="110" style="margin:1rem 0;background:#fff;border-radius:12px"></canvas><table><tr><th>Market</th><th>Crop</th><th>Price (₹/q)</th><th>Change</th><th>Updated</th></tr><tbody id="tb"></tbody></table></main>`;
  let chart;const draw=async()=>{const h=await api(`/price-history?crop=${$('#c').value}&range=${$('#r').value}`);chart&&chart.destroy();
   chart=new Chart($('#ch'),{type:'line',data:{labels:h.data.map(d=>d.day),datasets:[{label:$('#c').value+' ₹/quintal',data:h.data.map(d=>d.price),borderColor:'#2e7d32',tension:.3}]}});
   const p=await api('/market-prices?crop='+$('#c').value);$('#tb').innerHTML=p.data.map(x=>`<tr><td>${x.market}</td><td>${x.crop}</td><td>₹${x.price}</td><td class="${x.trend=='up'?'ok':'full'}">${x.change>0?'+':''}${x.change}%</td><td>${x.lastUpdated}</td></tr>`).join('')||'<tr><td colspan=5>No data</td></tr>'};
  $('#c').onchange=$('#r').onchange=draw;draw()},
financial(){if(!guard())return;$('#app').innerHTML=`<main><h1>${t('finance')}</h1><div class="grid"><div class="card"><h3>🛡️ Crop Insurance</h3>PMFBY (government-backed) and private plans. Steps: check eligibility → select plan → submit documents → approval.</div>
 <div class="card"><h3>🚜 Loans</h3>Equipment, input and storage loans.</div><div class="card"><h3>📚 Resources</h3>Literacy material, workshops, scheme finder.</div></div>
 <div class="card" style="margin-top:1rem"><h3>Loan calculator</h3><form><input id="a" type="number" placeholder="Amount ₹"><input id="i" type="number" placeholder="Interest % per year"><input id="n" type="number" placeholder="Term (months)"><button type="button" id="go">Calculate</button></form><p id="res" class="msg"></p></div></main>`;
 $('#go').onclick=()=>{const P=+$('#a').value,r=+$('#i').value/1200,n=+$('#n').value;if(!P||!n)return;const e=r?P*r*(1+r)**n/((1+r)**n-1):P/n;
  $('#res').textContent=`Monthly ₹${e.toFixed(0)} · Total ₹${(e*n).toFixed(0)} · Interest ₹${(e*n-P).toFixed(0)}`}},
async coldStorage(){if(!guard())return;const r=await api('/storages');
  $('#app').innerHTML=`<main><h1>${t('directory')}</h1><div style="overflow-x:auto"><table><tr><th>#</th><th>Name</th><th>Location</th><th>Capacity</th><th>Usage</th><th>Available</th><th>Temp</th><th>Products</th><th>Contact</th></tr>${rows(r.data)}</table></div></main>`}
};
pages.details=pages.coldStorage;

function dashboard(){
  $('#app').innerHTML=`<main><h1>${t('hello')}, ${user.name}!</h1><div class="grid">
  <div class="card stat"><b>25+</b>Nearby storages</div><div class="card stat"><b>₹2,350/q</b>Wheat price</div><div class="card stat"><b id="bk">0</b>Active bookings</div><div class="card stat"><b>12%</b>Price increase</div></div><br>
  <div class="grid"><a class="card" href="advisory.html"><h3>🤖 ${t('advisory')}</h3></a><a class="card" href="logistics.html"><h3>🏭 ${t('storage')}</h3></a><a class="card" href="market.html"><h3>📈 ${t('market')}</h3></a><a class="card" href="financial.html"><h3>💰 ${t('finance')}</h3></a><a class="card" href="coldStorage.html"><h3>🗺️ ${t('directory')}</h3></a></div>
  <div class="card" style="margin-top:1rem"><h3>🎤 Voice commands</h3>"Open advisory" · "Find cold storage" · "Market price of wheat" · "Apply for loan" · "Help"</div></main>`;
  api('/bookings/'+user.phone).then(r=>$('#bk').textContent=r.data.length);
}

window.addEventListener('DOMContentLoaded',()=>{
  document.body.insertAdjacentHTML('beforeend','<div id="app"></div>');shell();
  if(page==='index'&&!sessionStorage.splashed){sessionStorage.splashed=1;
    document.body.insertAdjacentHTML('beforeend','<div id="splash"><h1>AGRI STORAGE</h1><p>MADE BY SPARKS</p></div>');
    setTimeout(()=>{$('#splash').style.opacity=0;setTimeout(()=>$('#splash').remove(),600)},3000)}
  pages[page]&&pages[page]();
});
