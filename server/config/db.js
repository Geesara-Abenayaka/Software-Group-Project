import dns from 'node:dns';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connectionString = process.env.MONGODB_URI;

    if (!connectionString) {
      throw new Error('MONGODB_URI is not set. Add it to server/.env (see server/.env.example).');
    }

    // Optional: some networks block the SRV lookup used by mongodb+srv:// URIs.
    // Set DNS_SERVERS=8.8.8.8,1.1.1.1 in server/.env to use other DNS servers.
    if (process.env.DNS_SERVERS) {
      dns.setServers(process.env.DNS_SERVERS.split(',').map((server) => server.trim()));
    }

    await mongoose.connect(connectionString);

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
