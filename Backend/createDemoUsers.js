const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintel_ai';

async function createDemoUsers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Delete existing demo users
    await User.deleteMany({ email: { $in: ['admin@fintel.ai', 'user@fintel.ai'] } });
    console.log('🗑️  Cleared existing demo users');

    // Create Admin User
    const admin = new User({
      username: 'admin',
      email: 'admin@fintel.ai',
      password: 'admin123',
      role: 'admin'
    });
    await admin.save();
    console.log('✅ Admin user created');
    console.log('   Email: admin@fintel.ai');
    console.log('   Password: admin123');
    console.log('   Role: admin');

    // Create Demo User
    const user = new User({
      username: 'demouser',
      email: 'user@fintel.ai',
      password: 'user123',
      role: 'user'
    });
    await user.save();
    console.log('✅ Demo user created');
    console.log('   Email: user@fintel.ai');
    console.log('   Password: user123');
    console.log('   Role: user');

    console.log('\n🎉 Demo users created successfully!');
    console.log('\n📋 DEMO CREDENTIALS:');
    console.log('=' * 50);
    console.log('\nADMIN LOGIN:');
    console.log('  Email: admin@fintel.ai');
    console.log('  Password: admin123');
    console.log('\nUSER LOGIN:');
    console.log('  Email: user@fintel.ai');
    console.log('  Password: user123');
    console.log('=' * 50);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
  }
}

createDemoUsers();
