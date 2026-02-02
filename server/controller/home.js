const axios = require("axios");
const path = require("path");

const imagePath = path.join(__dirname, "../images/sample2.jpg"); 

const home = (req, res) => {
  res.status(201).json({ message: "Welcome to the Home Page!" });
}

const getPeopleCount = async (req, res) => {
  try {
    const response = await axios.get("http://localhost:8000/detect", {
      params: {
        image_path: imagePath
      },
    });
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch people count data" });
  }
};

const getHealth = async (req, res) => {
  try {
    const response = await axios.get("http://localhost:8000/health");
    res.status(200).json({ status: response.data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch health status" });
  }
};

module.exports = {
  getPeopleCount,
  home,
  getHealth,
};