const express = require("express");
const app = require("../config/app");
const router = require("../routes/router");

app.use(express.json());
app.use("/", router);

const start_server = () => {
  return new Promise((resolve, reject) => {
    try {
      app.listen(process.env.PORT || 3000, () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = start_server;
