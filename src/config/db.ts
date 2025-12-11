import mongoose from "mongoose";
import { MongoDbConnectionProps } from "../types/db.types.js";

export async function connectDb(config: MongoDbConnectionProps): Promise<void> {
  try {
    await mongoose.connect(config.url, {
      dbName: config.dbName,
    });
    console.log("Connected with MongoDB 🛢️");
  } catch (error: unknown) {
    console.log("Failed to connect with MongoDB", error);
    process.exit(1);
  }
}
