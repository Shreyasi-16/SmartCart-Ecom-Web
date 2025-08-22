const { MongoClient } = require('mongodb');

let client = null;

const connectToMongoDB = async () => {
    if (!client) {
        const url = "mongodb+srv://tanzeeem6:K5wI2A1mGKU3vnZl@cluster0.anb1ekt.mongodb.net/";
       
        client = new MongoClient(url);
        try {
            await client.connect();
            console.log("MongoDB Connected Successfully!");
        } catch (err) {
            console.log('Error in MongoDB ', err);
        }
    }
    return client;
}
const getCollection = async (dbName, collectionName) => {
    const db = client.db(dbName);
    return db.collection(collectionName);
}

const closeMongoDB = async () => {
    if (client) {
        await client.close();
        client = null;
        console.log('MongoDB Connection closed...');
    }
}

module.exports = {
    connectToMongoDB,
    getCollection,
    closeMongoDB
}