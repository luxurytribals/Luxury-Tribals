require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const connectDB = require('./db');
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const PRODUCTS = [
  { name:'Warli Spirit', slug:'warli-spirit', subtitle:'Sacred Warli Geometry', price:1299, originalPrice:1799, category:'bestseller', description:'Warli-inspired rhythm lines and cosmic circles for bold ritual styling.', sizes:['XS','S','M','L','XL','XXL'], badge:'Bestseller', emoji:'🪶', svgAccentColor:'#c9a84c', features:['240 GSM combed cotton','Bio-wash softness','Fade-resistant print','Unisex fit'], imageUrls:['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], colors:[{name:'Bone',hex:'#f4ecd3'},{name:'Obsidian',hex:'#171717'},{name:'Ochre',hex:'#c27b2b'}], weight:0.28, inStock:true, stockCount:120 },
  { name:'Madhubani Moon', slug:'madhubani-moon', subtitle:'Mythic Lunar Storywork', price:1499, originalPrice:1999, category:'new', description:'Mythic moon geometry echoing Madhubani visual storytelling.', sizes:['S','M','L','XL','XXL'], badge:'New', emoji:'🌙', svgAccentColor:'#9475d6', features:['Premium ring-spun cotton','Shoulder tape','Soft neck rib','Pre-shrunk fabric'], imageUrls:['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], colors:[{name:'Moon',hex:'#d6d2ea'},{name:'Charcoal',hex:'#2b2b34'},{name:'Lotus',hex:'#b94b7a'}], weight:0.29, inStock:true, stockCount:100 },
  { name:'Gond Forest', slug:'gond-forest', subtitle:'Earthline Narratives', price:1399, category:'new', description:'Gond-inspired line work, layered foliage symbolism, earthy mood.', sizes:['XS','S','M','L','XL'], badge:'New', emoji:'🌿', svgAccentColor:'#3f8c63', features:['Breathable weave','High stitch density','Minimal shrinkage','Long-life color'], imageUrls:['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], colors:[{name:'Forest',hex:'#294738'},{name:'Mist',hex:'#d9e6dd'},{name:'Coal',hex:'#1b201e'}], weight:0.27, inStock:true, stockCount:90 },
  { name:'Kalamkari Khaos', slug:'kalamkari-khaos', subtitle:'Scripted Fire Symmetry', price:1599, originalPrice:2199, category:'limited', description:'Kalamkari chaos motifs crafted in luxe, high-contrast symmetry.', sizes:['S','M','L','XL'], badge:'Limited', emoji:'🔥', svgAccentColor:'#8b1a1a', features:['Heavyweight drape','Double needle hem','Street-luxe cut','Collector drop'], imageUrls:['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], colors:[{name:'Ember',hex:'#8b1a1a'},{name:'Night',hex:'#111111'},{name:'Sand',hex:'#d6c7a5'}], weight:0.3, inStock:true, stockCount:70 },
  { name:'Phulkari Dawn', slug:'phulkari-dawn', subtitle:'Sunburst Loom Geometry', price:1699, originalPrice:2399, category:'limited', description:'Sunburst triangles and floral grid inspired by Phulkari craft lineage.', sizes:['XS','S','M','L','XL','XXL'], badge:'Limited', emoji:'🌅', svgAccentColor:'#d6762e', features:['Structured silhouette','Soft-touch finish','Reactive dyed','Premium trims'], imageUrls:['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], colors:[{name:'Dawn',hex:'#d6762e'},{name:'Ivory',hex:'#f8f3e7'},{name:'Maroon',hex:'#5b2020'}], weight:0.31, inStock:true, stockCount:65 },
  { name:'Santhali Ritual', slug:'santhali-ritual', subtitle:'Ceremonial Rhythm Wear', price:1349, originalPrice:1799, category:'bestseller', description:'Santhali ceremonial forms translated into geometric rhythm and balance.', sizes:['S','M','L','XL','XXL'], badge:'Bestseller', emoji:'🥁', svgAccentColor:'#a36a2d', features:['Moisture comfort','Reinforced seams','Smooth handfeel','Signature chest mark'], imageUrls:['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], colors:[{name:'Clay',hex:'#a36a2d'},{name:'Ebony',hex:'#1a1a1a'},{name:'Chalk',hex:'#e9dfcd'}], weight:0.28, inStock:true, stockCount:110 }
];

(async () => {
  await connectDB();
  await Promise.all([Admin.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}), Customer.deleteMany({})]);

  const admin = new Admin({ email: process.env.ADMIN_EMAIL || 'admin@luxurytribals.in', password: process.env.ADMIN_PASSWORD || 'ChangeMe123!' });
  await admin.save();
  await Product.insertMany(PRODUCTS);

  console.log('Seeded admin and 6 products. WARNING: this clears all data.');
  process.exit(0);
})();
