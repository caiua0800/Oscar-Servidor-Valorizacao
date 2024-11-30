const express = require('express');
const MongoDBService = require('./mongoDBService');
const { Purchase, Client } = require('./Models');
const cron = require('node-cron');
const moment = require('moment-timezone');
const app = express();
const mongoDBService = new MongoDBService();
const { criarPix } = require('./MercadoPagoController');
const crypto = require('crypto');
app.use(express.json()); 

app.post('/pix', criarPix);

app.post('/webhook', async (req, res) => {
    try {
        const evento = req.body;
        const signature = req.headers['x-merchant-signature'];

        console.log('Verificando assinatura...');
        const expectedSignature = crypto.createHmac('sha256', process.env.MERCADO_PAGO_SECRET)
                                         .update(JSON.stringify(evento))
                                         .digest('hex');

        if (signature !== expectedSignature) {
            console.log('Assinatura inválida');
            return res.status(403).send('Assinatura inválida');
        } else {
            console.log('Assinatura válida');
        }

        console.log("Recebido evento do Mercado Pago:", evento);

        if (evento.type === 'payment') {
            const paymentId = evento.data.id;

            const payment = await Payment.findById(paymentId);
            if (payment) {
                payment.status = evento.data.status;
                await payment.save();
                console.log(`Pagamento ${paymentId} atualizado para o status: ${evento.data.status}`);
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error("Erro ao processar o webhook:", error);
        res.status(500).send('Erro ao processar o webhook');
    }
});

const valorizarContratos = async (db) => {
    const purchases = await db.collection('Purchases').find({ status: 2 }).toArray();

    for (const purchase of purchases) {
        const {
            _id,
            currentIncome,
            finalIncome,
            endContractDate,
            firstIncreasement,
            clientId,
        } = purchase;

        const currentIncomeVal = parseFloat(currentIncome);
        const finalIncomeVal = parseFloat(finalIncome);

        const First_Increment_Date = (currentIncome === 0 || !firstIncreasement) 
            ? moment().tz("America/Sao_Paulo").toDate() 
            : firstIncreasement;

        const now = new Date();
        
        const totalDays = Math.ceil((endContractDate - First_Increment_Date) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((now - First_Increment_Date) / (1000 * 60 * 60 * 24));

        if (elapsedDays >= 90) { 
            await db.collection('Clients').updateOne(
                { _id: clientId },
                {
                    $set: {
                        withdrawDate: moment().tz("America/Sao_Paulo").toDate() 
                    }
                }
            );

            console.log(`Atualizando WithdrawDate do cliente ${clientId} para ${new Date()}`);
        }

        if (elapsedDays < totalDays) {
            const dailyIncome = (finalIncomeVal - currentIncomeVal) / totalDays;
            const newCurrentIncome = currentIncomeVal + dailyIncome;

            await db.collection('Purchases').updateOne(
                { _id: purchase._id },
                {
                    $set: {
                        currentIncome: newCurrentIncome.toString(),
                        firstIncreasement: First_Increment_Date, // Apenas define se for a primeira chamada
                        lastIncreasement: moment().tz("America/Sao_Paulo").toDate() 
                    }
                }
            );

            const client = await db.collection('Clients').findOne({ _id: clientId });
            const newBalance = (parseFloat(client.balance) + dailyIncome).toString();

            await db.collection('Clients').updateOne(
                { _id: clientId },
                { $set: { balance: newBalance } }
            );

            console.log(`Atualizando contrato id #${_id} somando R$${dailyIncome.toFixed(2)}`);

            if (newCurrentIncome >= finalIncomeVal) {
                await db.collection('Purchases').updateOne(
                    { _id: purchase._id },
                    { $set: { status: 3 } } 
                );
                console.log(`Contrato id #${_id} status atualizado para 3.`);
            }
        }
    }
};

const run = async () => {
    try {
        await mongoDBService.connect();
        const db = mongoDBService.getDatabase('OscarPlataforma');

        cron.schedule('30 00 * * *', async () => {
            console.log('Executando valorização de contratos...');
            await valorizarContratos(db);
        });

        app.listen(3030, () => {
            console.log('Servidor rodando na porta 3001');
        });
    } catch (err) {
        console.error('Erro ao conectar ou iniciar o serviço:', err);
    }
};

run();