const startNgrok = require("../service/ngrok_service");
const start_server = require("../service/server_service");

class Webhook {
  constructor() {
    if (!Webhook.instance) {
      Webhook.instance = this;
    }
    return Webhook.instance;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      start_server()
        .then(() =>
          startNgrok()
            .then((url) => resolve(url))
            .catch((err) => reject(err))
        )
        .catch((err) => reject(err));
    });
  }
}

module.exports = Webhook;
