const Webhook = require("./domain/WebhookModel");
const fs = require("fs");
const path = require("path");
const logger = require("./config/logger");
const bootstrap = async () => {
  const root = path.dirname(__dirname);

  const webhook = new Webhook();
  const { url } = await webhook.initialize();
  const dir = path.join(root, "..","..", "webhook_url.json");
  logger.info({ url });
  if (fs.existsSync(dir)) fs.unlinkSync(dir);
  fs.writeFileSync(dir, JSON.stringify({url: url}));
};

module.exports = bootstrap

