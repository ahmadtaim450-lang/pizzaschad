// Firebase Firestore Schema & Setup Instructions
// Tana Vibe Kodor - Restaurant POS System
//
// ============================================
// FIRESTORE STRUCTURE
// ============================================
//
// ┌─────────────────────────────────────────┐
// │  Collection: categories                 │
// ├─────────────────────────────────────────┤
// │  id: string (auto)                      │
// │  name: string                           │
// │  sortOrder: number                      │
// │  icon: string (emoji)                   │
// │  color: string (hex)                    │
// │  description: string                    │
// └─────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────┐
// │  Collection: products                   │
// ├─────────────────────────────────────────┤
// │  id: string (auto)                      │
// │  productNumber: string                  │
// │  name: string                           │
// │  category: string (category id)         │
// │  price: number                          │
// │  description: string                    │
// │  sizes: array [{id,name,price}]         │
// │  defaultSize: string|null               │
// │  modifiers: array [{type,name,...}]     │
// │  searchTerms: array [string]            │
// │  isSpicy: boolean                       │
// │  isAvailable: boolean                   │
// │  imageUrl: string|null                  │
// │  createdAt: timestamp                   │
// └─────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────┐
// │  Collection: orders                     │
// ├─────────────────────────────────────────┤
// │  id: string (auto)                      │
// │  orderNumber: string (TK-1001)          │
// │  status: 'NEW'|'PREPARING'|'READY'     │
// │  items: array [OrderItem]               │
// │  subtotal: number                       │
// │  total: number                          │
// │  notes: string                          │
// │  createdAt: timestamp                   │
// │  updatedAt: timestamp                   │
// │  completedAt: timestamp|null            │
// └─────────────────────────────────────────┘
//
// OrderItem:
// {
//   productId: string,
//   productNumber: string,
//   name: string,
//   price: number,
//   quantity: number,
//   size: {id, name, price}|null,
//   modifiers: [{group, option, price}],
//   notes: string,
//   lineTotal: number
// }
//
// ┌─────────────────────────────────────────┐
// │  Collection: counters                   │
// ├─────────────────────────────────────────┤
// │  id: "orderCounter"                     │
// │  lastNumber: number (1000+)             │
// └─────────────────────────────────────────┘
//
// ┌─────────────────────────────────────────┐
// │  Collection: settings                   │
// ├─────────────────────────────────────────┤
// │  id: "general"                          │
// │  restaurantName: string                 │
// │  taxRate: number (19)                   │
// │  currency: string (EUR)                 │
// │  orderNumberPrefix: string (TK)         │
// │  orderTimeoutMin: number (60)           │
// │  soundEnabled: boolean                  │
// └─────────────────────────────────────────┘
//
// ============================================
// HOW TO SET UP
// ============================================
//
// 1. Create a Firebase project at https://console.firebase.google.com
// 2. Enable Firestore Database in native mode
// 3. Register a Web App and copy config to firebase-config.js
// 4. Set Firestore Rules (for internal use, no auth):
//
//    rules_version = '2';
//    service cloud.firestore {
//      match /databases/{database}/documents {
//        match /{document=**} {
//          allow read, write: if true;
//        }
//      }
//    }
//
// 5. Run this seed script or import menu-data.json manually
// 6. Open index.html in a browser
//
// ============================================
// SECURITY NOTE
// ============================================
// The above rules allow anyone to read/write.
// This is fine for LOCAL/INTERNAL use only.
// For production with external access, add Firebase Auth.

console.log('Firestore Schema loaded - Tana Vibe Kodor');
