require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const connectDB = require('./db');
const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const PRODUCTS = [
  { 
    name: 'Warli Spirit', 
    slug: 'warli-spirit', 
    subtitle: 'Sacred Warli Geometry', 
    price: 1299, 
    originalPrice: 1799, 
    category: 'bestseller', 
    description: 'Warli-inspired rhythm lines and cosmic circles for bold ritual styling.', 
    sizes: ['XS','S','M','L','XL','XXL'], 
    badge: 'Bestseller', 
    emoji: '🪶', 
    svgAccentColor: '#c9a84c', 
    features: ['240 GSM combed cotton','Bio-wash softness','Fade-resistant print','Unisex fit'], 
    imageUrls: ['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], 
    colors: [
      {name: 'Bone', hex: '#f4ecd3'},
      {name: 'Obsidian', hex: '#171717'},
      {name: 'Ochre', hex: '#c27b2b'}
    ], 
    weight: 0.28, 
    inStock: true, 
    stockCount: 120 
  },
  { 
    name: 'Madhubani Moon', 
    slug: 'madhubani-moon', 
    subtitle: 'Mythic Lunar Storywork', 
    price: 1499, 
    originalPrice: 1999, 
    category: 'new', 
    description: 'Mythic moon geometry echoing Madhubani visual storytelling.', 
    sizes: ['S','M','L','XL','XXL'], 
    badge: 'New', 
    emoji: '🌙', 
    svgAccentColor: '#9475d6', 
    features: ['Premium ring-spun cotton','Shoulder tape','Soft neck rib','Pre-shrunk fabric'], 
    imageUrls: ['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], 
    colors: [
      {name: 'Moon', hex: '#d6d2ea'},
      {name: 'Charcoal', hex: '#2b2b34'},
      {name: 'Lotus', hex: '#b94b7a'}
    ], 
    weight: 0.29, 
    inStock: true, 
    stockCount: 100 
  },
  { 
    name: 'Gond Forest', 
    slug: 'gond-forest', 
    subtitle: 'Earthline Narratives', 
    price: 1399, 
    category: 'new', 
    description: 'Gond-inspired line work, layered foliage symbolism, earthy mood.', 
    sizes: ['XS','S','M','L','XL'], 
    badge: 'New', 
    emoji: '🌿', 
    svgAccentColor: '#3f8c63', 
    features: ['Breathable weave','High stitch density','Minimal shrinkage','Long-life color'], 
    imageUrls: ['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], 
    colors: [
      {name: 'Forest', hex: '#294738'},
      {name: 'Mist', hex: '#d9e6dd'},
      {name: 'Coal', hex: '#1b201e'}
    ], 
    weight: 0.27, 
    inStock: true, 
    stockCount: 90 
  },
  { 
    name: 'Kalamkari Khaos', 
    slug: 'kalamkari-khaos', 
    subtitle: 'Scripted Fire Symmetry', 
    price: 1599, 
    originalPrice: 2199, 
    category: 'limited', 
    description: 'Kalamkari chaos motifs crafted in luxe, high-contrast symmetry.', 
    sizes: ['S','M','L','XL'], 
    badge: 'Limited', 
    emoji: '🔥', 
    svgAccentColor: '#8b1a1a', 
    features: ['Heavyweight drape','Double needle hem','Street-luxe cut','Collector drop'], 
    imageUrls: ['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], 
    colors: [
      {name: 'Ember', hex: '#8b1a1a'},
      {name: 'Night', hex: '#111111'},
      {name: 'Sand', hex: '#d6c7a5'}
    ], 
    weight: 0.3, 
    inStock: true, 
    stockCount: 70 
  },
  { 
    name: 'Phulkari Dawn', 
    slug: 'phulkari-dawn', 
    subtitle: 'Sunburst Loom Geometry', 
    price: 1699, 
    originalPrice: 2399, 
    category: 'limited', 
    description: 'Sunburst triangles and floral grid inspired by Phulkari craft lineage.', 
    sizes: ['XS','S','M','L','XL','XXL'], 
    badge: 'Limited', 
    emoji: '🌅', 
    svgAccentColor: '#d6762e', 
    features: ['Structured silhouette','Soft-touch finish','Reactive dyed','Premium trims'], 
    imageUrls: ['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], 
    colors: [
      {name: 'Dawn', hex: '#d6762e'},
      {name: 'Ivory', hex: '#f8f3e7'},
      {name: 'Maroon', hex: '#5b2020'}
    ], 
    weight: 0.31, 
    inStock: true, 
    stockCount: 65 
  },
  { 
    name: 'Santhali Ritual', 
    slug: 'santhali-ritual', 
    subtitle: 'Ceremonial Rhythm Wear', 
    price: 1349, 
    originalPrice: 1799, 
    category: 'bestseller', 
    description: 'Santhali ceremonial forms translated into geometric rhythm and balance.', 
    sizes: ['S','M','L','XL','XXL'], 
    badge: 'Bestseller', 
    emoji: '🥁', 
    svgAccentColor: '#a36a2d', 
    features: ['Moisture comfort','Reinforced seams','Smooth handfeel','Signature chest mark'], 
    imageUrls: ['pattern-1.svg','pattern-2.svg','pattern-3.svg','pattern-4.svg'], 
    colors: [
      {name: 'Clay', hex: '#a36a2d'},
      {name: 'Ebony', hex: '#1a1a1a'},
      {name: 'Chalk', hex: '#e9dfcd'}
    ], 
    weight: 0.28, 
    inStock: true, 
    stockCount: 110 
  }
];

(async () => {
  console.log('');
  console.log('🌱 Luxury Tribals Database Seeder');
  console.log('==================================');
  console.log('');

  // ========================================
  // SAFETY CHECK #1: Prevent production seeding
  // ========================================
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ CRITICAL ERROR: Cannot run seed script in PRODUCTION!');
    console.error('');
    console.error('This script deletes ALL data from the database.');
    console.error('To seed the database, set NODE_ENV=development in your .env file.');
    console.error('');
    process.exit(1);
  }

  // ========================================
  // SAFETY CHECK #2: Require confirmation flag
  // ========================================
  const hasForceFlag = process.argv.includes('--force');
  
  if (!hasForceFlag) {
    console.warn('⚠️  WARNING: THIS WILL DELETE ALL DATA!');
    console.warn('');
    console.warn('This seed script will permanently delete:');
    console.warn('  • All admin accounts');
    console.warn('  • All products');
    console.warn('  • All orders');
    console.warn('  • All customers');
    console.warn('');
    console.warn('To proceed, run with the --force flag:');
    console.warn('  npm run seed -- --force');
    console.warn('');
    process.exit(0);
  }

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Delete all existing data
    console.log('🗑️  Deleting existing data...');
    await Promise.all([
      Admin.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Customer.deleteMany({})
    ]);
    console.log('   ✓ All collections cleared');
    console.log('');

    // Create admin account
    console.log('👤 Creating admin account...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@luxurytribals.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    
    const admin = new Admin({ 
      email: adminEmail, 
      password: adminPassword 
    });
    await admin.save();
    console.log(`   ✓ Admin created: ${adminEmail}`);
    console.log(`   ✓ Password: ${adminPassword}`);
    console.log('   ⚠️  Change this password after first login!');
    console.log('');

    // Create products
    console.log('🎨 Creating products...');
    await Product.insertMany(PRODUCTS);
    console.log(`   ✓ ${PRODUCTS.length} products created`);
    console.log('');

    // Success summary
    console.log('==================================');
    console.log('✅ Database seeded successfully!');
    console.log('==================================');
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Open admin panel: http://localhost:5501/admin.html');
    console.log(`  3. Login with: ${adminEmail}`);
    console.log('  4. Change the admin password immediately!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Seeding failed!');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
})();
