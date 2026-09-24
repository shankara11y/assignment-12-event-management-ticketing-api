const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db;

/**
 * In-Memory Mock Firestore for offline testing / development when credentials are unavailable.
 */
class MockFirestore {
  constructor() {
    this.collections = new Map();
  }

  _getCollection(colName) {
    if (!this.collections.has(colName)) {
      this.collections.set(colName, new Map());
    }
    return this.collections.get(colName);
  }

  collection(colName) {
    const self = this;
    const store = this._getCollection(colName);

    return {
      doc(id) {
        const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
          id: docId,
          async get() {
            const data = store.get(docId);
            return {
              exists: !!data,
              id: docId,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined)
            };
          },
          async set(data, options = {}) {
            if (options.merge && store.has(docId)) {
              const existing = store.get(docId);
              store.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
            } else {
              store.set(docId, JSON.parse(JSON.stringify(data)));
            }
          },
          async update(data) {
            if (!store.has(docId)) {
              throw new Error(`Document ${docId} does not exist for update`);
            }
            const existing = store.get(docId);
            store.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
          },
          async delete() {
            store.delete(docId);
          }
        };
      },
      where(field, op, val) {
        return {
          async get() {
            const docs = [];
            for (const [id, data] of store.entries()) {
              let match = false;
              if (op === '==' && data[field] === val) match = true;
              if (op === '>=' && data[field] >= val) match = true;
              if (op === '<=' && data[field] <= val) match = true;
              if (match) {
                docs.push({
                  id,
                  data: () => JSON.parse(JSON.stringify(data))
                });
              }
            }
            return { docs };
          }
        };
      },
      async get() {
        const docs = [];
        for (const [id, data] of store.entries()) {
          docs.push({
            id,
            data: () => JSON.parse(JSON.stringify(data))
          });
        }
        return { docs };
      }
    };
  }

  async runTransaction(updateFunction) {
    const transaction = {
      async get(docRef) {
        return await docRef.get();
      },
      set(docRef, data, options) {
        docRef.set(data, options);
      },
      update(docRef, data) {
        docRef.update(data);
      },
      delete(docRef) {
        docRef.delete();
      }
    };
    return await updateFunction(transaction);
  }
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.join(__dirname, '../serviceAccountKey.json');

const serviceAccountExists = fs.existsSync(serviceAccountPath);

if (process.env.USE_MOCK_DB === 'true') {
  db = new MockFirestore();
  console.log('[Firebase] Initialized with In-Memory Mock Firestore.');
} else if (serviceAccountExists) {
  try {
    const serviceAccount = require(serviceAccountPath);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    db = admin.firestore();
    console.log('[Firebase] Initialized with Service Account Key file.');
  } catch (err) {
    console.warn('[Firebase] Error loading service account key, falling back to mock:', err.message);
    db = new MockFirestore();
  }
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_PROJECT_ID) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'keralaxplore-events'
      });
    }
    db = admin.firestore();
    console.log('[Firebase] Initialized with Firebase Admin SDK.');
  } catch (err) {
    console.warn('[Firebase] Fallback to Mock Firestore:', err.message);
    db = new MockFirestore();
  }
} else {
  db = new MockFirestore();
  console.log('[Firebase] Credentials not found. Defaulting to In-Memory Mock Firestore.');
}

module.exports = { db, admin, MockFirestore };