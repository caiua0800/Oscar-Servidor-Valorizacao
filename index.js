const express = require('express');
const MongoDBService = require('./mongoDBService');
const { Purchase, Client } = require('./Models');
const cron = require('node-cron');
const moment = require('moment-timezone');
const app = express();
const axios = require('axios');
const mongoDBService = new MongoDBService();
const { criarPix, verifyPayment, editPayment } = require('./MercadoPagoController');
app.use(express.json());

app.post('/pix', criarPix);

app.get('/', (req, res) => {
    return res.send("Servidor de Valorização e Pagamentos");
});

app.get('/obterStatusPagamento/:id', async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).send("Envie o ID do pagamento");
    }

    try {
        const result = await verifyPayment(id);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

const verificarPagamentos = async (db) => {
    const purchases = await db.collection('Purchases').find({ status: 1 }).toArray();

    for (const purchase of purchases) {
        if (purchase.status === 1 && purchase.ticketId !== null) {
            try {
                const paymentStatus = await verifyPayment(purchase.ticketId);
                const status = paymentStatus.status;

                let newStatus;
                if (status === "cancelled" || status === "rejected") {
                    newStatus = 4; // Status 4
                } else if (status === "authorized" || status === "approved") {
                    newStatus = 2; // Status 2
                }

                console.log(`Status do PIX do contrato ${purchase._id} é ${status}`);

                if (newStatus) {

                    await db.collection('Purchases').updateOne(
                        { _id: purchase._id },
                        { $set: { status: newStatus } }
                    );

                    const resToken = await axios.post(`http://15.228.159.61:5000/api/auth/token`,
                        {
                            "id": "123456789",
                            "password": "Caiua@2017"
                        }
                    );

                    console.log(res.data)
                    console.log(res.data.token)

                    await axios.post(`https://servidoroscar.modelodesoftwae.com/api/purchase/${purchase.purchaseId}/novoStatus`,
                        { status: newStatus }
                    , {
                        headers: {
                            'Authorization': `Bearer ${resToken.data.token}` 
                        }
                    });

                    console.log(`Status do contrato id #${purchase._id} atualizado para ${newStatus}.`);
                }
            } catch (error) {
                console.error(`Erro ao verificar pagamento para o contrato id #${purchase._id}:`, error);
            }
        }
    }
}


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

            console.log(`Atualizando contrato ${_id}`);

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

        cron.schedule('01 19 * * *', async () => {
            console.log('Executando verificação de pagamentos...');
            await verificarPagamentos(db);

            console.log('Executando valorização de contratos...');
            await valorizarContratos(db);
        });

        app.listen(3030, () => {
            console.log('Servidor rodando na porta 3030');
        });
    } catch (err) {
        console.error('Erro ao conectar ou iniciar o serviço:', err);
    }
};

run();

