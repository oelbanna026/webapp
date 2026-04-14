const express = require("express");
const { login, signup } = require("../controllers/authController");

const authRouter = express.Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);

module.exports = { authRouter };
