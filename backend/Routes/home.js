const express = require("express");
const HomeRouter = express.Router();

const { getPeopleCount, home } = require("../controller/home");

HomeRouter.get("/", home);
HomeRouter.get("/people-count", getPeopleCount);

module.exports = HomeRouter;
