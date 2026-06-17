// Run with: node scripts/test-db.mjs
// Loads .env.local and tests the MongoDB Atlas connection

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.local manually
const envPath = resolve(__dirname, '../.env.local');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  process.env[key] ??= val;
}

const { MONGODB_URI } = process.env;
const safeUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');

console.log('\n=== MongoDB Atlas Test ===');
console.log(`URI: ${safeUri}\n`);

// 1. Connect
process.stdout.write('Connecting... ');
await mongoose.connect(MONGODB_URI);
console.log('OK');

// 2. Ping
process.stdout.write('Pinging cluster... ');
await mongoose.connection.db.admin().ping();
console.log('OK');

// 3. Write a test document
process.stdout.write('Writing test document... ');
const TestDoc = mongoose.model('_ConnectionTest', new mongoose.Schema({
  message: String,
  createdAt: { type: Date, default: Date.now },
}));
const doc = await TestDoc.create({ message: 'db-test-ok' });
console.log(`OK (id: ${doc._id})`);

// 4. Read it back
process.stdout.write('Reading it back... ');
const found = await TestDoc.findById(doc._id).lean();
console.log(`OK (message: "${found.message}")`);

// 5. Delete it
process.stdout.write('Cleaning up... ');
await TestDoc.deleteOne({ _id: doc._id });
console.log('OK');

// 6. List collections
const collections = await mongoose.connection.db.listCollections().toArray();
console.log(`\nCollections in DB: ${collections.length ? collections.map(c => c.name).join(', ') : '(none yet)'}`);

await mongoose.disconnect();
console.log('\nAll checks passed. MongoDB Atlas is working correctly.\n');
