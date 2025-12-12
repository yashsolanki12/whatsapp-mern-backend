import mongoose from "mongoose";
export async function connectDb(config) {
    try {
        await mongoose.connect(config.url, {
            dbName: config.dbName,
        });
        console.log("Connected with MongoDB 🛢️");
    }
    catch (error) {
        console.log("Failed to connect with MongoDB", error);
        process.exit(1);
    }
}
//# sourceMappingURL=db.js.map