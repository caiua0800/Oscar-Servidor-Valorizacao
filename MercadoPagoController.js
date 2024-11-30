require('dotenv').config();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const mp_webhook = require("mp-webhook-portable");
const accessToken = process.env.ACCESS_TOKEN;
const axios = require('axios');

const client = new MercadoPagoConfig({
    accessToken: accessToken,
    options: { timeout: 5000 }
});

const payment = new Payment(client);

const criarPix = async (req, res) => {
    try {
        // console.log("REQUEST");
        // console.log(req.body);

        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + 1);

        const body = {
            transaction_amount: req.body.transaction_amount,
            description: req.body.description,
            payment_method_id: req.body.paymentMethodId,
            payer: {
                email: req.body.email,
                identification: {
                    type: req.body.identificationType,
                    number: req.body.number
                }
            },
            date_of_expiration: expirationDate.toISOString(),
            notification_url: "https://56ea-187-109-98-195.ngrok-free.app"
        };

        console.log("body");
        console.log(body);

        const requestOptions = { idempotencyKey: uuidv4() };

        const result = await payment.create({ body, requestOptions });

        console.log("result");
        console.log(result);

        res.status(200).json(result);
    } catch (error) {
        console.log("ERROR");
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

const criarBoleto = async (req, res) => {
    try {
        console.log("REQUEST BOLETO");
        console.log(req.body);

        const body = {
            transaction_amount: req.body.transaction_amount,
            description: req.body.description,
            payment_method_id: 'bolbradesco',
            payer: {
                email: req.body.email,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                identification: {
                    type: req.body.identificationType,
                    number: req.body.number
                }
            },
        };

        const requestOptions = { idempotencyKey: uuidv4() };

        const result = await payment.create({ body, requestOptions });
        console.log("result BOLETO");
        console.log(result);

        res.status(200).json(result);
    } catch (error) {
        console.log("ERROR BOLETO");
        console.log(error);
        res.status(500).json({ error: error.message });
    }
};

const verifyPayment = async (id) => {
    const mp_url = `https://api.mercadopago.com/v1/payments/${id}`;

    try {
        const response = await axios.get(mp_url, {
            headers: {
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
            }
        });

        // Imprimindo o resultado no console
        console.log("Payment Verification Result:");
        console.log(response.data);

        return response.data; // Retorne os dados, se necessário
    } catch (error) {
        console.error("ERROR VERIFYING PAYMENT:");
        console.error(error.response ? error.response.data : error.message);
    }
}

const editPayment = async (id, newStatus) => {
    const mp_url = `https://api.mercadopago.com/v1/payments/${id}`;

    // Mapeamento de novos status
    let status;
    switch (newStatus) {
        case 1:
            status = "pending";
            break;
        case 2:
            status = "approved";
            break;
        case 3:
            status = "cancelled";
            break;
        default:
            throw new Error("Status inválido"); // Lança um erro se o status não for reconhecido
    }

    try {
        const response = await axios.put(mp_url, {
            status: status // Envia o novo status
        }, {
            headers: {
                Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
            }
        });

        // Imprimindo o resultado no console
        console.log("Payment Edit Result:");
        console.log(response.data);

        return response.data; // Retorna os dados, se necessário
    } catch (error) {
        console.error("ERROR EDITING PAYMENT:");
        console.error(error.response ? error.response.data : error.message);
    }
};

module.exports = {
    criarPix,
    criarBoleto,
    verifyPayment,
    editPayment
};