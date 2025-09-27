import mongoose from 'mongoose';

export const connectMongo = async () => {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/restaurant';
  try {
    await mongoose.connect(mongoUrl, {
      autoIndex: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error instanceof Error ? error.message : String(error));
    console.log('💡 To fix this, either:');
    console.log('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
    console.log('   2. Use MongoDB Atlas (free): https://www.mongodb.com/atlas');
    console.log('   3. Set MONGO_URL environment variable');
    throw error;
  }
};
