import axios from "axios";

const BASE_URL = "http://localhost:4000/Thesis/home";
const DET_URL = "http://localhost:4000/Thesis/home/people-count";

export const getHomeMessage = async () => {
  const res = await axios.get(BASE_URL);
  return res.data.message;
};

export const getPeopleCount = async () => {
  const res = await axios.get(DET_URL, {
    params: {
      image_path: "/sample2.jpg",
    },
  });
  return res.data;
};

