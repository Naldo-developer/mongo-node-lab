require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/miBaseDeDatos";
const dbName = process.env.DB_NAME || "miBaseDeDatos";

const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (db) {
    return db;
  }

  await client.connect();
  db = client.db(dbName);
  console.log(`MongoDB conectado a la base "${dbName}"`);
  return db;
}

module.exports = { connectDB, client };
