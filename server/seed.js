import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();

const seedUsers = async () => {
  try {
    // Drop the collection to clear any problematic indexes
    await mongoose.connection.dropCollection('users').catch(() => {
      console.log('Collection does not exist yet, creating new...');
    });
    
    console.log('Collection cleared');
     //hi
    // Create dummy admin users 
    const users = [
      {
        email: 'admin@uom.lk',
        password: 'admin123',
        role: 'admin',
        name: 'System Administrator'
      },
      {
        email: 'admin@moratuwa.lk',
        password: 'password123',
        role: 'admin',
        name: 'Admin User'
      },
      {
        email: 'john.doe@admin.lk',
        password: 'john123',
        role: 'admin',
        name: 'John Doe'
      },
      {
        email: 'jane.smith@admin.lk',
        password: 'jane123',
        role: 'admin',
        name: 'Jane Smith'
      }
    ];

    const usersWithHashedPasswords = await Promise.all(
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10)
      }))
    );

    await User.insertMany(usersWithHashedPasswords);
    await User.insertMany(hashedUsers);
    console.log('✅ Dummy users added successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('================================');
    users.forEach(user => {
      console.log(`Email: ${user.email} | Password: ${user.password}`);
    });
    console.log('================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

// Run the seed function
connectDB().then(() => seedUsers());
