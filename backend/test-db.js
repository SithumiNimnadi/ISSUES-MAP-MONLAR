require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Successfully connected to MongoDB!');
    console.log('📦 Database:', mongoose.connection.name);
    
    // Create a test collection
    const testSchema = new mongoose.Schema({ name: String });
    const Test = mongoose.model('Test', testSchema);
    
    await Test.create({ name: 'test' });
    console.log('✅ Successfully wrote to database!');
    
    const count = await Test.countDocuments();
    console.log('📊 Total documents:', count);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();