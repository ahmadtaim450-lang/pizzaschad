// Firebase Configuration - Tana Vibe Kodor
// IMPORTANT: Replace these values with your Firebase project config
// 1. Go to https://console.firebase.google.com
// 2. Create a new project or use existing
// 3. Go to Project Settings > General > Your apps > Web app
// 4. Copy the firebaseConfig object values below

const firebaseConfig = {
  apiKey: "AIzaSyDH-UQwNv4t0Xafz8-ARZjyr69k9VHVlDI",
  authDomain: "schad-62da7.firebaseapp.com",
  projectId: "schad-62da7",
  storageBucket: "schad-62da7.firebasestorage.app",
  messagingSenderId: "331626315267",
  appId: "1:331626315267:web:30bf0cc377186b32131836"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Enable offline persistence for better performance
db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser');
  }
});

// Collection references
const categoriesRef = db.collection('categories');
const productsRef = db.collection('products');
const ordersRef = db.collection('orders');
const settingsRef = db.collection('settings');
const countersRef = db.collection('counters');

// Helper: Generate next order number
async function generateOrderNumber() {
  const counterDoc = countersRef.doc('orderCounter');
  
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterDoc);
    
    if (!doc.exists) {
      transaction.set(counterDoc, { lastNumber: 1000 });
      return 'TK-1001';
    }
    
    const newNumber = (doc.data().lastNumber || 1000) + 1;
    transaction.update(counterDoc, { lastNumber: newNumber });
    return 'TK-' + newNumber;
  });
}

// Helper: Create new order
async function createOrder(orderData) {
  const orderNumber = await generateOrderNumber();
  const now = firebase.firestore.Timestamp.now();
  
  const order = {
    orderNumber: orderNumber,
    status: 'NEW',
    items: orderData.items,
    subtotal: orderData.subtotal,
    total: orderData.total,
    notes: orderData.notes || '',
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
  
  const docRef = await ordersRef.add(order);
  return { id: docRef.id, orderNumber, ...order };
}

// Helper: Update order status
async function updateOrderStatus(orderId, newStatus) {
  const updates = { 
    status: newStatus, 
    updatedAt: firebase.firestore.Timestamp.now() 
  };
  
  if (newStatus === 'READY') {
    updates.completedAt = firebase.firestore.Timestamp.now();
  }
  
  return ordersRef.doc(orderId).update(updates);
}

// Helper: Listen to active orders (NEW + PREPARING)
function listenToActiveOrders(callback) {
  return ordersRef
    .where('status', 'in', ['NEW', 'PREPARING'])
    .orderBy('createdAt', 'asc')
    .onSnapshot((snapshot) => {
      const orders = [];
      snapshot.docChanges().forEach((change) => {
        const order = { id: change.doc.id, ...change.doc.data() };
        if (change.type === 'added') {
          orders.push({ ...order, changeType: 'added' });
        } else if (change.type === 'modified') {
          orders.push({ ...order, changeType: 'modified' });
        } else if (change.type === 'removed') {
          orders.push({ ...order, changeType: 'removed' });
        }
      });
      callback(orders, snapshot);
    });
}

// Helper: Listen to all orders (for history)
function listenToAllOrders(callback) {
  return ordersRef
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      const orders = [];
      snapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      callback(orders);
    });
}

// Helper: Get all products
async function getAllProducts() {
  const snapshot = await productsRef.orderBy('productNumber').get();
  const products = [];
  snapshot.forEach((doc) => {
    products.push({ id: doc.id, ...doc.data() });
  });
  return products;
}

// Helper: Get all categories
async function getAllCategories() {
  const snapshot = await categoriesRef.orderBy('sortOrder').get();
  const categories = [];
  snapshot.forEach((doc) => {
    categories.push({ id: doc.id, ...doc.data() });
  });
  return categories;
}

// Helper: Search product by number
async function findProductByNumber(productNumber) {
  const snapshot = await productsRef
    .where('productNumber', '==', productNumber)
    .limit(1)
    .get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

console.log('Firebase initialized - Tana Vibe Kodor');
