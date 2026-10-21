const { MongoClient } = require('mongodb');

let client = null;
let db = null;

async function connect() {
  const url = process.env.MONGODB_URL;
  if (!url) {
    console.error('FATAL: MONGODB_URL is not set. Create backend/.env from backend/.env.example.');
    process.exit(1);
  }
  client = new MongoClient(url, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
  } catch (err) {
    console.error('FATAL: Could not connect to MongoDB:', err.message);
    process.exit(1);
  }
  db = client.db(); // database name taken from the connection string
  console.log(`Connected to MongoDB database "${db.databaseName}"`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not connected yet');
  return db;
}

module.exports = { connect, getDb };
