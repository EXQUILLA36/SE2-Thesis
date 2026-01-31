require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.SERVER_PORT;
const connectDB = require('./config/modelDB');

connectDB();

const HomeRouter = require('./Routes/home');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/Thesis/home', HomeRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})