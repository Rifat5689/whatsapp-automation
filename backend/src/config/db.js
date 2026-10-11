import mongoose from 'mongoose';
import { env } from './env.js';

const connectDatabase = async () => {
  if (!env.mongodbUri) return false;
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  return true;
};

const disconnectDatabase = async () => mongoose.disconnect();

export { connectDatabase, disconnectDatabase };
