// server/seed.js
// Database seeder – creates test users for development
// Run with: node seed.js
// =========================================================

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const users = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@company.com',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    firstName: 'Sarah',
    lastName: 'Manager',
    email: 'manager@company.com',
    password: 'Manager@123',
    role: 'manager',
  },
  {
    firstName: 'Rahma',
    lastName: 'Employee',
    email: 'employee@company.com',
    password: 'Employee@123',
    role: 'employee',
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Insert seed users (password will be hashed by the pre-save hook)
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`👤 Created ${user.role}: ${user.email}`);
    }

    console.log('\n✅ Seed completed! Test credentials:');
    console.log('   Admin:    admin@company.com    / Admin@123');
    console.log('   Manager:  manager@company.com  / Manager@123');
    console.log('   Employee: employee@company.com / Employee@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seedDB();
