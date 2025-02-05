const express = require('express');
const MongoDBService = require('./mongoDBService');
const { Purchase, Client } = require('./Models');
const cron = require('node-cron');
const moment = require('moment-timezone');
const app = express();
const axios = require('axios');
const mongoDBService = new MongoDBService();
const { criarPix, verifyPayment } = require('./MercadoPagoController');
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
    const buySolicitations = await db.collection('BuySolicitations').find({ status: 1 }).toArray();

    if (purchases.length === 0 && buySolicitations.length === 0) {
        console.log("saindo da verificação de pagamento pois não há pendencias.")
        return;
    }

    const resToken = await axios.post(`${process.env.BASE_ROUTE}auth/token`,
        {
            "id": process.env.USER_LOGIN,
            "password": process.env.SENHA_LOGIN
        }
    );

    const systemConfig_automatic_payment_verification = await axios.get(`${process.env.BASE_ROUTE}systemconfig/automatic_payment_verification`, {
        headers: {
            'Authorization': `Bearer ${resToken.data.token}`
        }
    });

    if (systemConfig_automatic_payment_verification.data
        && systemConfig_automatic_payment_verification.data.value
        && systemConfig_automatic_payment_verification.data.value === "false") {
        console.log("Cancelado Verificação automática de pagamentos");
        return;
    } else {
        console.log("Verificação automática de pagamentos ativada, iniciando verificação...");
    }

    for (const purchase of purchases) {
        if (purchase.status === 1 && purchase.ticketId !== null) {
            try {
                const paymentStatus = await verifyPayment(purchase.ticketId);
                const status = paymentStatus.status;

                let newStatus;
                if (status === "cancelled" || status === "rejected") {
                    newStatus = 4;
                } else if (status === "authorized" || status === "approved") {
                    newStatus = 2; // Status 2
                }

                // console.log(`Status do PIX do contrato ${purchase._id} é ${status}`);

                if (newStatus) {

                    await db.collection('Purchases').updateOne(
                        { _id: purchase._id },
                        { $set: { status: newStatus } }
                    );

                    await axios.post(`${process.env.BASE_ROUTE}purchase/${purchase.purchaseId}/novoStatus`,
                        { status: newStatus }
                        , {
                            headers: {
                                'Authorization': `Bearer ${resToken.data.token}`
                            }
                        });

                    // console.log(`Status do contrato id #${purchase._id} atualizado para ${newStatus}.`);
                }
            } catch (error) {
                console.error(`Erro ao verificar pagamento para o contrato id #${purchase._id}:`, error);
            }
        }
    }

    if (buySolicitations.length > 0) {
        // console.log("valorizando")
        for (const buySolicitation of buySolicitations) {
            if (buySolicitation.status === 1 && buySolicitation.ticketId !== null) {
                try {
                    const paymentStatus = await verifyPayment(buySolicitation.ticketId);
                    const status = paymentStatus.status;

                    let newStatus;
                    if (status === "cancelled" || status === "rejected") {
                        newStatus = 4;
                    } else if (status === "authorized" || status === "approved") {
                        newStatus = 2; 
                    }

                    // console.log(`Status do PIX da solicitação de compra #${buySolicitation.id}`);

                    if (newStatus) {
                        await axios.put(`${process.env.BASE_ROUTE}buysolicitation/confirm/${buySolicitation._id}`,
                            { status: newStatus }
                            , {
                                headers: {
                                    'Authorization': `Bearer ${resToken.data.token}`
                                }
                            });

                        // console.log(`Status da solicitação de compra id #${buySolicitation.id} atualizado para ${newStatus}.`);
                    }
                } catch (error) {
                    console.error(`Erro ao verificar pagamento para a solicitação de compra id #${buySolicitation._id}:`, error);
                }
            }
        }
    }else{
        console.log("sem")
    }
}

function areDatesInSameMonthAndYear(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}


const valorizarContratos = async (db) => {
    const purchases = await db.collection('Purchases').find({ status: 2 }).toArray();
    const balanceHistories = await db.collection('BalanceHistories').find({}).toArray();

    for (const purchase of purchases) {
        const {
            _id,
            currentIncome,
            finalIncome,
            endContractDate,
            firstIncreasement,
            clientId,
            daysToFirstWithdraw,
        } = purchase;


        const currentIncomeVal = parseFloat(currentIncome);
        const finalIncomeVal = parseFloat(finalIncome);
        const daysToFirstWithdrawVal = daysToFirstWithdraw ? parseFloat(daysToFirstWithdraw) : 90;

        const First_Increment_Date = (currentIncome === 0 || !firstIncreasement)
            ? moment().tz("America/Sao_Paulo").toDate()
            : firstIncreasement;

        const now = new Date();

        const totalDays = Math.ceil((endContractDate - First_Increment_Date) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((now - First_Increment_Date) / (1000 * 60 * 60 * 24));

        if (elapsedDays >= daysToFirstWithdrawVal) {
            await db.collection('Clients').updateOne(
                { _id: clientId },
                {
                    $set: {
                        withdrawDate: moment().tz("America/Sao_Paulo").toDate()
                    }
                }
            );

            // console.log(`Atualizando WithdrawDate do cliente ${clientId} para ${new Date()}`);
        }

        if (elapsedDays < totalDays) {
            const dailyIncome = (finalIncomeVal - currentIncomeVal) / totalDays;
            const newCurrentIncome = currentIncomeVal + dailyIncome;

            // console.log(`Atualizando contrato ${_id}`);

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

            var clientBalanceHistory = balanceHistories.find(c => c.clientId = clientId);
            var currentCurrent = clientBalanceHistory.current;


            var valorDoMesAtual = null;

            if (clientBalanceHistory.Items) {
                clientBalanceHistory.Items.forEach(item => {
                    if (item && item.dateCreated && areDatesInSameMonthAndYear(new Date(), item.dateCreated)) {
                        valorDoMesAtual = item;
                    }
                });
                if (valorDoMesAtual) {
                    clientBalanceHistory.Items.forEach(e => {
                        if (e && e.dateCreated && areDatesInSameMonthAndYear(new Date(), e.dateCreated)) {
                            e.value = parseFloat(valorDoMesAtual.value) + parseFloat(dailyIncome);
                        }
                    })
                }
            }

            if (!valorDoMesAtual) {
                clientBalanceHistory.Items = []
                clientBalanceHistory.Items.push({
                    dateCreated: new Date(),
                    value: parseFloat(dailyIncome)
                });
            }

            await db.collection('BalanceHistories').updateOne(
                { _id: clientId },
                { $set: { current: parseFloat(currentCurrent) + parseFloat(dailyIncome), Items: clientBalanceHistory.Items } }
            );

            if (newCurrentIncome >= finalIncomeVal) {
                await db.collection('Purchases').updateOne(
                    { _id: purchase._id },
                    { $set: { status: 3 } }
                );
                // console.log(`Contrato id #${_id} status atualizado para 3.`);
            }
        }
    }
};

const run = async () => {
    try {
        await mongoDBService.connect();
        const db = mongoDBService.getDatabase('OscarPlataforma');

        cron.schedule('27 16 * * *', async () => {
            console.log('Executando verificação de pagamentos...');
            await verificarPagamentos(db);

            console.log('Executando valorização de contratos...');
            await valorizarContratos(db);
        });

        app.listen(4040, () => {
            console.log('Servidor rodando na porta 4040');
        });
    } catch (err) {
        console.error('Erro ao conectar ou iniciar o serviço:', err);
    }
};

run();

