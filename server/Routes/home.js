const express = require("express");
const HomeRouter = express.Router();

const { getPeopleCount, home, getHealth } = require("../controller/home");

HomeRouter.get("/", home);
HomeRouter.get("/people-count", getPeopleCount);
HomeRouter.get("/health", getHealth);

module.exports = HomeRouter;
