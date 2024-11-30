require('dotenv').config();
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const accessToken = process.env.ACCESS_TOKEN;

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
            date_of_expiration: expirationDate.toISOString()
        };

        const requestOptions = { idempotencyKey: uuidv4() };

        const result = await payment.create({ body, requestOptions });
        // console.log("result");
        // console.log(result);

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

module.exports = {
    criarPix,
    criarBoleto
};