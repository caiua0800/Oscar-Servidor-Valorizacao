const { MongoClient } = require('mongodb');
require('dotenv').config();

class MongoDBService {
    constructor() {
        this.client = new MongoClient(process.env.MONGODB_URI);
    }

    async connect() {
        await this.client.connect();
        console.log('Conectado ao MongoDB');
    }

    getDatabase(dbName) {
        return this.client.db(dbName);
    }

    async close() {
        await this.client.close();
        console.log('Conexão com o MongoDB fechada');
    }
}

module.exports = MongoDBService;