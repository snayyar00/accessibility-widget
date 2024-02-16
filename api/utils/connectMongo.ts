// db.js
const mongoose =require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const dbURI = process.env.MONGODB_URI;

mongoose.connect(dbURI);

const db = mongoose.connection;
console.log('hello from connectMongo')
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

export default mongoose;
