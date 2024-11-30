require("dotenv").config();
var mercadopago = require("mercadopago");
mercadopago.configurations.setAccessToken(process.env.MP_TOKEN);

const isJson = (string) => {
  try {
    const json = JSON.parse(string);
    return !!json;
  } catch (error) {
    return false;
  }
};
function orderCreate(client) {
  return new Promise((resolve, reject) => {
    mercadopago.payment
      .create(client)
      .then((response) => response.body)
      .then((data) => {
        const { id } = data;
        const { qr_code } = data.point_of_interaction.transaction_data;
        resolve({ id, qr_code });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function orderStatus(order_id) {
  return new Promise((resolve, reject) => {
    mercadopago.payment
      .get(order_id)
      .then((response) => response.body)
      .then((data) => {
        const { transaction_amount, status } = data;
        const { description } = data;
        if (isJson(description)) {
          const { chat_id } = JSON.parse(description);
          resolve({ transaction_amount, phone: chat_id, status });
        }
        resolve({ transaction_amount, phone: null, status });
      })
      .catch((err) => reject(err));
  });
}

module.exports = {
  orderCreate,
  orderStatus,
};
