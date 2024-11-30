const ngrok = require("ngrok");

const startNgrok = () => {
  return new Promise((resolve, reject) => {
    ngrok
      .connect({
        addr: process.env.PORT || 3000, // port or network address, defaults to 80
      })
      .then((url) => {
        resolve({ url });
      })
      .catch((err) => reject(err));
  });
};

module.exports = startNgrok;
