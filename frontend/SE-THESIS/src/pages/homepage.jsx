import { useEffect, useState } from "react";
import { getHomeMessage, getPeopleCount } from "../api/home.api.js";

export default function HomePage() {
  const [message, setMessage] = useState("");
  const image = "/sample.jpg";

  useEffect(() => {
    getHomeMessage().then(setMessage);
    console.log(message);
  }, []);

  const detectImage = () => {
    getPeopleCount().then((data) => {
      console.log("IMAGE DETECTED:", data);
    });
  }

  return (
    <div>
      <h1>SADADA</h1>
      <h1>{message}</h1>
      <button onClick={detectImage}>DETECT</button>
      <img src={image} alt="image" />
    </div>
  );
}
