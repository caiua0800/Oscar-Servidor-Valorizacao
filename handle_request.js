const mp_webhook = require("mp-webhook-portable");

mp_webhook.initialize();

module.exports = async (response) => {
    console.log("response");
    console.log(response);
    const status = mp_webhook.orderStatus("94889750898");
    console.log(status);
}

