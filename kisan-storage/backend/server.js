require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure data directory exists for JSON storage
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB = f => path.join(dataDir, f);
const load = (f, d) => { try { return JSON.parse(fs.readFileSync(DB(f))); } catch { return d; } };
const save = (f, v) => fs.writeFileSync(DB(f), JSON.stringify(v, null, 2));

const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

mailer.verify()
  .then(() => console.log('✅ SMTP ready'))
  .catch(e => console.log('⚠️ SMTP not ready:', e.message));

// ---------- Auth ----------
const otps = new Map(); // phone -> {otp, exp, tries}
const phoneOk = p => /^\d{10}$/.test(p);
const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

app.post('/api/register-farmer', (req, res) => {
  const { name, phone, email, address, state } = req.body;
  if (!name || !phoneOk(phone) || !emailOk(email) || !address || !state)
    return res.status(400).json({ success: false, message: 'Fill all fields (10-digit phone, valid email).' });
  const users = load('users.json', {});
  users[phone] = { name: name.trim(), phone, email, address, state, registeredAt: new Date().toISOString() };
  save('users.json', users);
  res.json({ success: true, message: 'Registered. Please login.' });
});

app.post('/api/send-otp', async (req, res) => {
  const { name, phone } = req.body;
  const u = load('users.json', {})[phone];
  if (!u || u.name.toLowerCase() !== (name || '').trim().toLowerCase())
    return res.status(404).json({ success: false, message: 'No farmer found with this name and phone. Sign up first.' });
  
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  otps.set(phone, { otp, exp: Date.now() + 10 * 60000, tries: 0 });
  
  try {
    await mailer.sendMail({
      from: `"Kisan Storage" <${process.env.SMTP_USER}>`,
      to: u.email,
      subject: 'Your Kisan Storage OTP',
      html: `<h2>Hello ${u.name},</h2><p>Your OTP is <b style="font-size:22px">${otp}</b></p><p>Valid for 10 minutes. Do not share it.</p>`
    });
    res.json({ success: true, message: `OTP sent to ${u.email.replace(/(.{2}).*(@.*)/, '$1***$2')}` });
  } catch (e) {
    console.error('Mail error:', e.message);
    if (process.env.DEMO_OTP === 'true')
      return res.json({ success: true, message: 'Email failed; demo mode: use 123456' });
    res.status(500).json({ success: false, message: 'Could not send email. Check SMTP settings.' });
  }
});

app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const rec = otps.get(phone);
  const u = load('users.json', {})[phone];
  
  if (!u) return res.status(404).json({ success: false, message: 'User not found.' });
  if (process.env.DEMO_OTP === 'true' && otp === '123456') {
    otps.delete(phone);
    return res.json({ success: true, user: u });
  }
  if (!rec || Date.now() > rec.exp) return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
  if (++rec.tries > 3) {
    otps.delete(phone);
    return res.status(429).json({ success: false, message: 'Too many attempts. Request a new OTP.' });
  }
  if (rec.otp !== otp) return res.status(400).json({ success: false, message: 'Wrong OTP.' });
  
  otps.delete(phone);
  res.json({ success: true, user: u });
});

// ---------- Storages ----------
const seed = [
  ['Guntur Chillies Cold Storage','Guntur','Chilakaluripet',5000,1800,'8-12',['Red Chillies','Turmeric']],
  ['Guntur Agri Fresh','Guntur','Guntur City',3500,350,'2-6',['Vegetables','Onions']],
  ['Krishna Banana Cold Chain','Krishna','Machilipatnam',4200,0,'12-14',['Banana']],
  ['Vijayawada Cold Storage','Krishna','Vijayawada',6000,3000,'2-8',['Mixed']],
  ['Prakasam Agri Cold Storage','Prakasam','Ongole',3800,950,'4-8',['Tobacco','Chillies']],
  ['Chittoor Mango Cold Storage','Chittoor','Chittoor',4500,2700,'10-13',['Mango']],
  ['Anantapur Groundnut Storage','Anantapur','Anantapur',5500,1650,'10-15',['Groundnut']],
  ['Nellore Rice Cold Storage','Nellore','Nellore',7200,3600,'8-12',['Rice','Paddy']],
  ['Vizag Seafood Cold Storage','Visakhapatnam','Gajuwaka',3000,600,'-18 to 0',['Seafood']],
  ['Kurnool Multi-Crop Storage','Kurnool','Kurnool',4800,0,'4-10',['Onions','Cotton']],
  ['Godavari Fruit Chain','East Godavari','Kakinada',3200,1400,'4-10',['Fruits']],
  ['Eluru Veggie Store','West Godavari','Eluru',2800,900,'2-6',['Vegetables']],
  ['Tenali Turmeric Store','Guntur','Tenali',3600,1500,'8-12',['Turmeric']],
  ['Narasaraopet Chilli Vault','Guntur','Narasaraopet',4100,500,'8-12',['Red Chillies']],
  ['Srikakulam Cashew Store','Srikakulam','Srikakulam',2500,1700,'10-14',['Cashew']],
  ['Kadapa Tomato Cold Chain','Kadapa','Kadapa',3300,1000,'6-10',['Tomato']],
  ['Tirupati Fresh Hub','Chittoor','Tirupati',4000,2200,'4-8',['Fruits','Vegetables']],
  ['Bapatla Agri Cold Store','Guntur','Bapatla',3000,2100,'6-10',['Vegetables']],
  ['Amalapuram Coconut Store','East Godavari','Amalapuram',2700,800,'10-14',['Coconut']],
  ['Rajahmundry Cold Storage','East Godavari','Rajahmundry',5200,2600,'2-8',['Mixed']],
  ['Hindupur Fruit Store','Anantapur','Hindupur',2600,300,'6-10',['Fruits']],
  ['Nandyal Onion Store','Kurnool','Nandyal',4400,1200,'4-8',['Onions']],
  ['Chirala Seafood Store','Prakasam','Chirala',2900,1100,'-18 to 0',['Seafood']],
  ['Gudur Rice Store','Nellore','Gudur',3900,2000,'8-12',['Rice']],
  ['Nellore Mega Cold Storage','Nellore','Nellore',7500,3750,'4-10',['Mixed']]
].map((s, i) => ({ 
  id: i + 1, name: s[0], district: s[1], location: `${s[2]}, ${s[1]}`, capacity: s[3], available: s[4],
  temperature: s[5] + '°C', price: '₹' + (2.5 + (i % 5) * 0.5).toFixed(2) + '/kg/month', crops: s[6],
  contact: '0' + (8600 + i * 7) + '-' + (220000 + i * 1111) 
}));

app.get('/api/storages', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  res.json({ success: true, data: seed.filter(s => !q || (s.name + s.location + s.crops.join()).toLowerCase().includes(q)) });
});

app.get('/api/storages/:id', (req, res) => {
  const s = seed.find(x => x.id == req.params.id);
  s ? res.json({ success: true, data: s }) : res.status(404).json({ success: false });
});

app.post('/api/book-storage', (req, res) => {
  const { storageId, phone, quantity } = req.body;
  const s = seed.find(x => x.id == storageId);
  if (!s || !quantity) return res.status(400).json({ success: false, message: 'Invalid booking.' });
  if (quantity > s.available) return res.status(400).json({ success: false, message: 'Not enough space available.' });
  
  const b = load('bookings.json', []);
  b.push({ id: Date.now(), storageId, phone, quantity, at: new Date().toISOString() });
  save('bookings.json', b);
  res.json({ success: true, message: `Booked ${quantity} tons at ${s.name}.` });
});

app.get('/api/bookings/:phone', (req, res) => {
  res.json({ success: true, data: load('bookings.json', []).filter(b => b.phone === req.params.phone) });
});

// ---------- Market ----------
const prices = [
  ['Ambala Mandi','Haryana','Wheat',2350,6.8],['Ludhiana Mandi','Punjab','Wheat',2420,10.0],['Meerut Mandi','UP','Wheat',2290,4.6],
  ['Guntur Mandi','Andhra Pradesh','Chillies',14500,3.2],['Guntur Mandi','Andhra Pradesh','Cotton',6800,-1.4],
  ['Nashik Mandi','Maharashtra','Onions',1800,-2.1],['Raichur Mandi','Karnataka','Rice',3100,2.4],['Karnal Mandi','Haryana','Rice',3250,1.9],
  ['Nellore Mandi','Andhra Pradesh','Rice',3050,2.0],['Kolhapur Mandi','Maharashtra','Sugarcane',340,0.8]
].map(p => ({ market: p[0], state: p[1], crop: p[2], price: p[3], change: p[4], trend: p[4] >= 0 ? 'up' : 'down', lastUpdated: 'Today' }));

app.get('/api/market-prices', (req, res) => {
  const { crop, state } = req.query;
  res.json({ success: true, data: prices.filter(p => (!crop || p.crop.toLowerCase() === crop.toLowerCase()) && (!state || p.state === state)) });
});

app.get('/api/price-history', (req, res) => {
  const base = (prices.find(p => p.crop.toLowerCase() === (req.query.crop || 'wheat').toLowerCase()) || prices[0]).price;
  const days = { '7d': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 }[req.query.range] || 30;
  const step = Math.max(1, Math.floor(days / 12)), out = [];
  for (let i = days; i >= 0; i -= step) {
    out.push({ day: `-${i}d`, price: Math.round(base * (1 + Math.sin(i / 9) * 0.04 - i / 4000)) });
  }
  res.json({ success: true, data: out });
});

// Fallback to serve index.html for frontend routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌾 Kisan Storage running → http://localhost:${PORT}`));
