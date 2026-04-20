import { createContext, useState, useContext, useEffect, useCallback } from "react";
import { listActivity } from "../shared/services/activityService";

const ActivityContext = createContext();

export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addActivity = (roomName, action, target = null) => {
    const newActivity = {
      id: Date.now(),
      roomName,
      action,
      target, // 'created', 'removed', 'turned_on', 'turned_off'
      timestamp: new Date(),
    };
    setActivities((prev) => [newActivity, ...prev]);
    return newActivity;
  };

  const clearActivities = () => {
    setActivities([]);
  };

  const getActivitiesByDate = (filterType) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return activities.filter((activity) => {
      const actTime = new Date(activity.timestamp);

      if (filterType === "today") {
        return actTime >= todayStart;
      } else if (filterType === "week") {
        return actTime >= weekStart;
      } else if (filterType === "month") {
        return actTime >= monthStart;
      }
      return true;
    });
  };

  const fetchActivities = useCallback(async (roomId) => {
    if (!roomId) {
      console.log("[ActivityContext] fetchActivities called with no roomId");
      return [];
    }
    console.log("[ActivityContext] fetchActivities starting for roomId:", roomId);
    setLoading(true);
    setError(null);
    try {
      const response = await listActivity(roomId);
      console.log("[ActivityContext] fetchActivities response:", response);
      setActivities((prev) => {
        const updated = [...prev, ...response];
        console.log("[ActivityContext] Updated activities state:", updated);
        return updated;
      });
      return response;
    } catch (err) {
      setError(err.message);
      console.error("[ActivityContext] Error fetching activities:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllActivities = useCallback(async (rooms) => {
    if (!rooms?.length) {
      console.log("[ActivityContext] fetchAllActivities called with no rooms");
      return;
    }
    console.log("[ActivityContext] fetchAllActivities starting with", rooms.length, "rooms:", rooms.map(r => ({ id: r._id, name: r.room_name })));
    setLoading(true);
    setError(null);
    setActivities([]); // reset before fetching
    try {
      const allActivities = [];
      for (const room of rooms) {
        try {
          console.log(`[ActivityContext] Fetching activities for room ${room._id} (${room.room_name})`);
          const response = await listActivity(room._id);
          console.log(`[ActivityContext] Received ${response?.length || 0} activities for room ${room._id}:`, response);
          if (response && Array.isArray(response)) {
            allActivities.push(...response);
          }
        } catch (err) {
          console.error(`[ActivityContext] Error fetching activities for room ${room._id}:`, err);
        }
      }
      console.log("[ActivityContext] Total activities collected:", allActivities.length, allActivities);
      // Sort by timestamp descending
      const sorted = allActivities.sort((a, b) => {
        const dateA = new Date(a.activity_timestamp || a.timestamp);
        const dateB = new Date(b.activity_timestamp || b.timestamp);
        return dateB - dateA;
      });
      console.log("[ActivityContext] Sorted activities:", sorted);
      setActivities(sorted);
      return sorted;
    } catch (err) {
      setError(err.message);
      console.error("[ActivityContext] Error fetching all activities:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ActivityContext.Provider
      value={{
        activities,
        loading,
        error,
        addActivity,
        clearActivities,
        getActivitiesByDate,
        fetchActivities,
        fetchAllActivities,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within ActivityProvider");
  }
  return context;
}
