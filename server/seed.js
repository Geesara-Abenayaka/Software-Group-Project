import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    const dbUsername = 'adminpanel';
    const dbPassword = 'eAVM89vSCbATi8Tv';
    const connectionString = `mongodb+srv://${dbUsername}:${dbPassword}@cluster0.mgyo1zg.mongodb.net/POST_GRADUATE_LMS_DB?appName=Cluster0`;
    
    await mongoose.connect(connectionString);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    // Drop the collection to clear any problematic indexes
    await mongoose.connection.dropCollection('users').catch(() => {
      console.log('Collection does not exist yet, creating new...');
    });
    
    console.log('Collection cleared');

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

    await User.insertMany(users);
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
