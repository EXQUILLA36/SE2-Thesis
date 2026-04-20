import axiosClient from "../api/axiosClient.api";

export const recordActivity = async (activityData) => {
  console.log("[ActivityService] recordActivity called with data:", activityData);
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Unauthorized: Unknown user");
    const response = await axiosClient.post("/activity/add", activityData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("[ActivityService] recordActivity response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[ActivityService] recordActivity error:", error);
    throw error;
  }
};

export const listActivity = async (roomId) => {
  console.log("[ActivityService] listActivity called for roomId:", roomId);
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Unauthorized: Unknown user");
    const response = await axiosClient.get(`/activity/list/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("[ActivityService] listActivity response for roomId", roomId, ":", response.data);
    return response.data;
  } catch (error) {
    console.error("[ActivityService] listActivity error for roomId", roomId, ":", error);
    throw error;
  }
};