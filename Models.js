const { Schema } = require('mongoose');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Conexão com o MongoDB Atlas estabelecida');
}).catch(err => {
    console.error('Erro ao conectar ao MongoDB Atlas', err);
});

const purchaseSchema = new Schema({
    clientId: String,
    productName: String,
    quantity: Number,
    unityPrice: String,
    discount: String,
    purchaseDate: Date,
    totalPrice: String,
    amountPaid: String,
    currentIncome: String,
    percentageProfit: Number,
    firstIncreasement: Date,
    lastIncreasement: Date,
    finalIncome: String,
    coin: String,
    status: Number,
    type: Number,
    endContractDate: Date,
    description: String,
});

const clientSchema = new Schema({
    name: String,
    email: String,
    phone: String,
    balance: String,
    blockedBalance: String,
    dateCreated: Date,
    clientProfit: Number,
    walletExtract: {
        purchases: [String],
        withdrawals: [String],
    },
});

const Purchase = mongoose.model('Purchases', purchaseSchema);
const Client = mongoose.model('Clients', clientSchema);

module.exports = { Purchase, Client };