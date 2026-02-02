import { useEffect, useState } from "react";
import { getHomeMessage, getPeopleCount } from "../api/home.api.js";

export default function HomePage() {
  const [message, setMessage] = useState("Offline");
  const image = "/sample.jpg";
  const [data, setData] = useState(null);

  const [serverStatus, setServerStatus] = useState("offline");
  const [backendStatus, setBackendStatus] = useState("offline");

  useEffect(() => {
    getHomeMessage().then(setMessage);
    console.log(message);
  }, []);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch("http://localhost:4000/health");
        setServerStatus(response.ok ? "Online" : "Offline");
      } catch (error) {
        setServerStatus("Offline");
      }
    };

    const checkBackendStatus = async () => {
      try {
        const response = await fetch(
          "http://localhost:4000/Thesis/home/health",
        );
        setBackendStatus(response.ok ? "Online" : "Offline");
      } catch (error) {
        setBackendStatus("Offline");
      }
    };

    checkServerStatus();
    checkBackendStatus();
    const intervalId = setInterval(checkServerStatus, 1000);
    const backendIntervalId = setInterval(checkBackendStatus, 1000);
    return () => {
      clearInterval(intervalId);
      clearInterval(backendIntervalId);
    };
  }, [serverStatus, backendStatus]);

  const detectImage = () => {
    getPeopleCount().then((data) => {
      setData(data);
      console.log("IMAGE DETECTED:", data);
    });
  };

  return (
    <div className="flex items-center justify-center w-screen h-screen bg-slate-800">
      <div className="bg-white w-[90%] h-[90%] py-[3%] px-[4%] text-gray-800 flex flex-col items-center rounded-sm shadow-md shadow-black/90">
        <h1 className="text-3xl font-semibold mb-6">
          Crowd Detection Development Page
        </h1>
        {/* Main Window */}
        <div className="w-full h-full flex flex-row p-3">
          {/* SERVER STATUS */}
          <div className="h-full w-[20%] rounded-md flex flex-col gap-2 items-center">
            <div className="bg-gray-300 w-[80%] aspect-square gap-2 flex flex-col items-center justify-center p-3 rounded-sm">
              <div className="w-full h-10 bg-gray-400 items-center p-2 flex flex-row gap-2">
                <div className="h-full aspect-square rounded-full bg-green-500"></div>
                <p className="text-[0.7vw]">Frontend Status</p>
              </div>
              <div className="w-full h-10 bg-gray-400 items-center p-2 flex flex-row gap-2">
                <div
                  className={`h-full aspect-square rounded-full ${serverStatus === "Online" ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <p className="text-[0.7vw]">Server Status</p>
              </div>
              <div className="w-full h-10 bg-gray-400 items-center p-2 flex flex-row gap-2">
                <div
                  className={`h-full aspect-square rounded-full ${backendStatus === "Online" ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <p className="text-[0.7vw]">Backend Status</p>
              </div>
            </div>
            {/* UHMM IDK BUT THIS LOOKS COOL */}
            <div className="w-[80%] h-full bg-gray-300 p-4 flex flex-col items-center rounded-sm">
              <p className="text-sm italic mt-2">Server Bullshit Bullshit</p>
            </div>
          </div>
          {/* IMAGE DISPLAY */}
          <div className="h-full w-full bg-gray-200 rounded-sm flex flex-col items-center p-3">
            <p>Okay so nothing in here yet but this is where the image input will be. The image for now will use BLOB Data type that will be sent to the server then to he backend or the Python micro service. The problem right now issss...... how does the server receives the blob data then sends it to the python service, then how the python service reads that image blob for detection. For the actual development, the frontend side will handle the video feed then takes video frames every x seconds then sends it as BLOB type to the server to backend thru web sockets for realtime update. Thats why need ko ma test pano yung commuunication ng dalawang server when it comes to that data type.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
