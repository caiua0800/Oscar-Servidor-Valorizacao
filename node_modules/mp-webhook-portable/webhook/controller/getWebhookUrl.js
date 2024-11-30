const fs = require("fs")
const path = require("path")
const getWebhookUrl = () => {
    const dir = path.join(__dirname, "..","..", "webhook_url.json");
    if(fs.existsSync(dir)){
        const webhookUrlJson = fs.readFileSync(dir, 'utf8')
        const webhookUrlObj = JSON.parse(webhookUrlJson)
        return webhookUrlObj.url
    }
}

module.exports = getWebhookUrl
