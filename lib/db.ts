import mongoose from "mongoose";

const globalForMongoose = globalThis as unknown as { mongooseConnection?: Promise<typeof mongoose> };

export async function connectToDatabase() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured.");
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!globalForMongoose.mongooseConnection) {
    globalForMongoose.mongooseConnection = mongoose.connect(process.env.MONGO_URI);
  }
  await globalForMongoose.mongooseConnection;
  return mongoose;
}
