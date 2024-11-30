const express = require("express");
const { payment } = require("../controller/payment_controller");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ status: "online" });
});
router.post("/", payment);

module.exports = router;
