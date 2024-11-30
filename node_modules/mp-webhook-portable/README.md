
# mp-webhook-portable

A biblioteca `mp-webhook-portable` permite a criação e gerenciamento de webhooks do Mercado Pago em projetos Node.js de forma fácil e portável.

## Instalação

Para instalar a biblioteca, execute o seguinte comando no seu terminal:


`npm install mp-webhook-portable` 

## Utilização

Para utilizar a biblioteca, importe-a em seu código JavaScript:

javascriptCopy code

```javascript
const mp_webhook = require("mp-webhook-portable");
const { Client } = require("./client_model");

mp_webhook.initialize();

Client.date_of_expiration = mp_webhook.setExpiraton({ minutes: 10 });
Client.notification_url = mp_webhook.getWebhookUrl();
Client.transaction_amount = 1.00;
``` 

O exemplo acima cria um webhook do Mercado Pago com duração de 10 minutos, configura uma URL de notificação e define o valor da transação para 1.00

## Documentação

A documentação completa da biblioteca pode ser encontrada em [https://github.com/seu-usuario/mp-webhook-portable](https://github.com/seu-usuario/mp-webhook-portable).

## Contribuição

Se você quiser contribuir para este projeto, fique à vontade para enviar pull requests ou abrir issues no GitHub. Serão muito bem-vindos!
