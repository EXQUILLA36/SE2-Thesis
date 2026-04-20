import axiosClient from "../api/axiosClient.api";

export const turnOnDevice = async (message) => {
  console.log("[ArduinoService] turnOnDevice called with message:", message);
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Unauthorized: Unknown user");
    }
    console.log("[ArduinoService] Sending POST request to /control/manual with command:", message.command);
    const response = await axiosClient.post("/control/manual", message, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("[ArduinoService] Device control succeeded:", response.data);
    return response.data;
  } catch (error) {
    console.error("[ArduinoService] Device control failed:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
};