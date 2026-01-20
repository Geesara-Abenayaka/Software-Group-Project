import mongoose from 'mongoose';

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

export default connectDB;
