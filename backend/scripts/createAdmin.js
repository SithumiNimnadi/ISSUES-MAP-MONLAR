/**
 * Script to create default admin user
 * Run with: node scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema (must match your server.js schema)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'reviewer', 'user'], 
    default: 'user' 
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecoGuardian';

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('📋 Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log('   Password: (hidden)');
      
      // Optionally update password
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise((resolve) => {
        readline.question('Do you want to reset admin password? (y/N): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() === 'y') {
        const newPassword = 'Admin@123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
        console.log(`✅ Admin password reset to: ${newPassword}`);
      }
      
      process.exit(0);
    }

    // Create new admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    const admin = new User({
      username: 'admin',
      email: 'admin@ecoguardian.com',
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();
    
    console.log('\n👑 ========================================');
    console.log('👑 DEFAULT ADMIN USER CREATED SUCCESSFULLY!');
    console.log('👑 ========================================');
    console.log(`📧 Email: admin@ecoguardian.com`);
    console.log(`🔑 Password: Admin@123`);
    console.log(`👤 Username: admin`);
    console.log(`👑 Role: Admin`);
    console.log('\n⚠️  IMPORTANT: Please change this password after first login!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmin();