// Seed Data for Firestore Import
// Tana Vibe Kodor - Complete Menu Data
// 
// HOW TO USE:
// 1. Include this script AFTER firebase-config.js in an HTML page
// 2. Call seedFirestore() to import all data
// 3. Check console for progress

async function seedFirestore() {
  console.log('Starting Firestore seed...');
  
  // Categories
  const categories = [
    { id: "pizza", name: "Pizza", sortOrder: 1, icon: "🍕", color: "#e74c3c", description: "Alle Pizzen mit Tomatensauce und Käse" },
    { id: "angebote", name: "Angebote", sortOrder: 2, icon: "🌟", color: "#f39c12", description: "Spezielle Angebote und Combos" },
    { id: "lasagne", name: "Lasagne", sortOrder: 3, icon: "📦", color: "#e67e22", description: "Hausgemachte Lasagne" },
    { id: "pasta", name: "Nudeln / Pasta", sortOrder: 4, icon: "🍝", color: "#2ecc71", description: "Pasta Gerichte" },
    { id: "gnocchi", name: "Gnocchi", sortOrder: 5, icon: "🥟", color: "#27ae60", description: "Italienische Gnocchi Gerichte" },
    { id: "schnitzel", name: "Schnitzel", sortOrder: 6, icon: "🍖", color: "#c0392b", description: "Frisch zubereitete Schnitzel" },
    { id: "mexikanisch", name: "Mexikanische Gerichte", sortOrder: 7, icon: "🌮", color: "#f1c40f", description: "Mexikanische Spezialitäten" },
    { id: "enchiladas", name: "Enchiladas", sortOrder: 8, icon: "🫔", color: "#e67e22", description: "Weiche Weizentortillas" },
    { id: "gegrilltes", name: "Vom Grill", sortOrder: 9, icon: "🍗", color: "#d35400", description: "Gegrillte Spezialitäten" },
    { id: "pakistanisch", name: "Pakistanische Gerichte", sortOrder: 10, icon: "🍛", color: "#8e44ad", description: "Authentische pakistanische Küche" },
    { id: "salate", name: "Salate", sortOrder: 11, icon: "🥗", color: "#27ae60", description: "Frische Salate" },
    { id: "burger", name: "Burger", sortOrder: 12, icon: "🍔", color: "#e67e22", description: "Burger" },
    { id: "fingerfood", name: "Finger Food", sortOrder: 13, icon: "🍟", color: "#f39c12", description: "Snacks und Beilagen" },
    { id: "extras", name: "Extras", sortOrder: 14, icon: "🍰", color: "#e91e63", description: "Desserts und Nachspeisen" },
    { id: "getraenke", name: "Getränke", sortOrder: 15, icon: "🥤", color: "#3498db", description: "Kalte Getränke" }
  ];

  console.log('Seeding categories...');
  for (const cat of categories) {
    await categoriesRef.doc(cat.id).set(cat);
  }

  // Settings
  await settingsRef.doc('general').set({
    restaurantName: 'Tana Vibe Kodor',
    taxRate: 19,
    currency: 'EUR',
    orderNumberPrefix: 'TK',
    orderTimeoutMin: 60,
    soundEnabled: true
  });

  // Counter
  await countersRef.doc('orderCounter').set({ lastNumber: 1000 });

  console.log('Categories & Settings seeded!');
  console.log('Now loading products from menu-data.json...');
  
  // Load products from the JSON file
  const response = await fetch('../firebase/menu-data.json');
  const menuData = await response.json();
  const products = menuData.products;

  // Add shared modifiers to pizza products
  const sharedExtras = menuData.sharedModifiers.pizzaExtras;
  const kaeserand = menuData.sharedModifiers.kaeserand;

  let count = 0;
  for (const product of products) {
    // Add shared extras + kaeserand to all pizza products
    if (product.category === 'pizza' || product.category === 'angebote') {
      if (!product.modifiers) product.modifiers = [];
      
      // Check if it already has extras
      const hasExtras = product.modifiers.some(m => m.type === 'extrazutaten');
      if (!hasExtras) {
        product.modifiers.push(sharedExtras);
      }
      
      const hasKaeserand = product.modifiers.some(m => m.type === 'special');
      if (!hasKaeserand) {
        product.modifiers.push(kaeserand);
      }
    }
    
    product.isAvailable = true;
    product.imageUrl = null;
    product.createdAt = firebase.firestore.Timestamp.now();

    await productsRef.add(product);
    count++;
  }

  console.log(`Seeding complete! ${count} products imported.`);
  console.log('Categories: 15');
  console.log('Total products: ' + count);
  console.log('Settings & counter initialized.');
  console.log('---');
  console.log('Tana Vibe Kodor is ready! Open cashier/index.html or kitchen/index.html');
}

// Auto-seed check
async function checkAndSeed() {
  const snapshot = await categoriesRef.limit(1).get();
  if (snapshot.empty) {
    console.log('No data found. Starting seed...');
    await seedFirestore();
  } else {
    console.log('Data already exists. Skipping seed.');
  }
}
