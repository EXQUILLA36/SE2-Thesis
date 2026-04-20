// !Libraries
import { useState, useEffect, useRef } from "react";
// !Components
import { checkFirstTime } from "../../shared/services/authService";
import { socket } from "../../shared/services/socketService.js";
import { useRooms } from "../../context/roomContext.jsx";
import { useCamera } from "../../context/cameraContext.jsx";
import { useActivity } from "../../context/activityContext.jsx";
import { useAuth } from "../../context/authContext.jsx";
import { getDevice } from "../../shared/services/deviceService.js";
import { useSchedule } from "../../context/scheduleContext";

export default function dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGuide, setShowGuide] = useState(false);
  const { rooms, setRooms } = useRooms();
  const { activities, fetchAllActivities } = useActivity();
  const { user } = useAuth();
  const [emptyRooms, setEmptyRooms] = useState(0);
  const [vacantRoom, setVacantRoom] = useState(0);
  const { startCamera, startFrameCapture, initializeRoomCamera } = useCamera();
  const [availableCameras, setAvailableCameras] = useState([]);
  const [roomSchedulesMap, setRoomSchedulesMap] = useState({});
  const lastFetchTimeRef = useRef(0);
  const FETCH_INTERVAL = 60000; // 1 minute in milliseconds

  const { fetchSchedulesByRoom } = useSchedule();

  const canViewActivities = user?.is_authorized || user?.is_admin;

  // Fetch activities for all rooms when they change
  useEffect(() => {
    if (!rooms.length) return;
    fetchAllActivities(rooms).catch((err) => {
      console.error("[Dashboard] Error fetching activities:", err);
    });
  }, [rooms, fetchAllActivities]);



  // Fetch schedules for all rooms at once on mount / when rooms change
  // Throttled to once per minute to avoid flooding
  useEffect(() => {
    if (!rooms.length) return;

    async function fetchAllSchedules() {
      const now = Date.now();
      
      // Only fetch if 60+ seconds have passed since last fetch
      if (now - lastFetchTimeRef.current < FETCH_INTERVAL) {
        return;
      }

      lastFetchTimeRef.current = now;
      const map = {};
      
      await Promise.all(
        rooms.map(async (room) => {
          try {
            const schedules = await fetchSchedulesByRoom(room._id);
            map[room._id] = schedules || [];
          } catch (err) {
            console.error(`[Dashboard] Error fetching schedules for room ${room._id}:`, err);
            map[room._id] = [];
          }
        })
      );

      setRoomSchedulesMap(map);
    }

    fetchAllSchedules();
  }, [rooms, fetchSchedulesByRoom]);

  // Returns display string for the Schedule column
  const getNextOrOngoingClass = (roomId) => {
    const schedules = roomSchedulesMap[roomId];
    
    if (!schedules || schedules.length === 0) {
      return "No more classes";
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = dayNames[currentTime.getDay()];
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    const todaySchedules = schedules.filter((s) => s.day === todayName);
    
    if (todaySchedules.length === 0) {
      return "No more classes";
    }

    // Parse "HH:MM" to total minutes since midnight
    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    // Format "HH:MM" (24hr) to "h:MM AM/PM"
    const formatTime = (timeStr) => {
      const [h, m] = timeStr.split(":").map(Number);
      const period = h >= 12 ? "PM" : "AM";
      const hour = h % 12 === 0 ? 12 : h % 12;
      const minute = String(m).padStart(2, "0");
      return `${hour}:${minute} ${period}`;
    };

    // Check for an ongoing class first
    const ongoing = todaySchedules.find((s) => {
      const start = toMinutes(s.time_start);
      const end = toMinutes(s.time_end);
      return currentMinutes >= start && currentMinutes < end;
    });

    if (ongoing) {
      return "Class Ongoing";
    }

    // Find the next upcoming class
    const upcoming = todaySchedules
      .filter((s) => toMinutes(s.time_start) > currentMinutes)
      .sort((a, b) => toMinutes(a.time_start) - toMinutes(b.time_start));
    
    if (upcoming.length === 0) {
      return "No more classes";
    }

    return formatTime(upcoming[0].time_start);
  };

  const filteredActivities = canViewActivities ? activities : [];

  const recentActivities = filteredActivities.slice(0, 5);

  useEffect(() => {
    setEmptyRooms(rooms.filter((room) => (room.people_count ?? 0) > 0).length);
    setVacantRoom(rooms.filter((room) => (room.people_count ?? 0) === 0).length);
  }, [rooms]);

  const renderActivityMessage = (activity) => {
    const message = activity.activity_message || activity.message;
    
    if (message) {
      const deviceMatch = message.match(/(Fans|Lights)/i);
      const roomMatch = message.match(/["']([^"']+)["']/);
      const actionMatch = message.match(
        /(turned on|turned off|have been turned on|have been turned off)/i,
      );

      if (deviceMatch && roomMatch && actionMatch) {
        const device = deviceMatch[1].toLowerCase();
        const room = roomMatch[1];
        const action = actionMatch[1].replace("have been ", "").toLowerCase();
        return (
          <span>
            <span className="font-bold">{room}</span>
            {` ${device} ${action}`}
          </span>
        );
      }

      const cleanedMessage = message
        .replace(/Classroom\s+["']([^"']+)["']\s*/i, "")
        .trim();
      const roomName = roomMatch ? roomMatch[1] : "";
      return (
        <span>
          <span className="font-bold">{roomName}</span>
          {cleanedMessage && ` ${cleanedMessage}`}
        </span>
      );
    }

    const { roomName, action, target } = activity;
    let actionText = "";
    if (action === "created") {
      actionText = " has been created";
    } else if (action === "removed") {
      actionText = " has been removed";
    } else if (action === "turned_on" || action === "turned_off") {
      const targetName = target ? target.toLowerCase() : "device";
      const onOff = action === "turned_on" ? "turned on" : "turned off";
      actionText = ` ${targetName} ${onOff}`;
    }

    return (
      <span>
        <span className="font-bold">{roomName}</span>
        {actionText}
      </span>
    );
  };

  useEffect(() => {
    const handleError = (error) => console.error("Socket error:", error);

    socket.on("connect_error", handleError);

    return () => {
      socket.off("connect_error", handleError);
    };
  }, []);

  useEffect(() => {
    const handleDeviceAdded = async ({ device_location }) => {
      await initializeRoomCamera(device_location, rooms, availableCameras);
    };
    socket.on("deviceAdded", handleDeviceAdded);
    return () => socket.off("deviceAdded", handleDeviceAdded);
  }, [rooms, availableCameras, initializeRoomCamera]);

  useEffect(() => {
    if (!rooms.length || !availableCameras.length) return;

    async function initializeAllRoomCameras() {
      try {
        for (const room of rooms) {
          const devices = await getDevice(room._id);
          if (!devices.length) continue;
          const savedDevice = devices[0];
          const matchedCamera = availableCameras.find(
            (cam) => cam.label === savedDevice.device_label,
          );
          if (!matchedCamera) continue;
          await startCamera(room._id, matchedCamera.deviceId);
          startFrameCapture(room._id);
        }
      } catch (err) {
        console.error("Error initializing room cameras:", err);
      }
    }

    socket.on("deviceAdded", initializeAllRoomCameras);
    initializeAllRoomCameras();
    return () => socket.off("deviceAdded", initializeAllRoomCameras);
  }, [rooms, availableCameras, startCamera, startFrameCapture]);

  useEffect(() => {
    async function loadAvailableCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((device) => device.kind === "videoinput");
        setAvailableCameras(videoInputs);
      } catch (err) {
        console.error("Error loading available cameras:", err);
      }
    }
    loadAvailableCameras();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleNewRoom = (room) => setRooms((prev) => [...prev, room]);
    socket.on("roomAdded", handleNewRoom);

    return () => {
      socket.off("roomAdded", handleNewRoom);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#E4E3E1]">
      <style>{`
        .activity-scroll::-webkit-scrollbar { width: 30px; }
        .activity-scroll::-webkit-scrollbar-track { background: transparent; }
        .activity-scroll::-webkit-scrollbar-thumb {
          background: #A7A7A4;
          border-radius: 15px;
          border: 10px solid transparent;
          background-clip: padding-box;
        }
        .activity-scroll::-webkit-scrollbar-thumb:hover {
          background: #999;
          background-clip: padding-box;
        }
      `}</style>
      <section className="relative w-full h-full flex flex-col gap-6">
        <div className="w-full flex flex-row items-end justify-between text-[#1E1E1E] opacity-75">
          <h1 className="text-subheader font-bold">Dashboard</h1>
          <h2 className="text-subtitle">
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
            |{" "}
            {currentTime.toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })}
          </h2>
        </div>

        <div className="relative w-full h-[30vh] flex flex-row items-center justify-start gap-6 font-bold">
          <div className="flex flex-col items-start gap-4 primary-text">
            <h2 className="text-title">Occupied Rooms</h2>
            <div className="w-[20vw] aspect-video rounded-2xl shadow-outside-dropshadow flex justify-center items-center text-header">
              {emptyRooms}
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 primary-text">
            <h2 className="text-title">Vacant Rooms</h2>
            <div className="w-[20vw] aspect-video rounded-2xl shadow-outside-dropshadow flex justify-center items-center text-header">
              {vacantRoom}
            </div>
          </div>
          <div className="flex flex-col w-full h-67 items-start gap-4 pad-4 primary-text">
            <h2 className="text-title">Activity History</h2>
            <div className="w-full h-61 rounded-2xl shadow-outside-dropshadow overflow-y-auto p-4 flex flex-col gap-3 pr-6 activity-scroll">
              {!canViewActivities ? (
                <p className="w-full h-full flex items-center justify-center text-subtitle text-[#999] font-light">
                  You don't have permission to view activities
                </p>
              ) : recentActivities.length === 0 ? (
                <p className="w-full h-full flex items-center justify-center text-subtitle text-[#999] font-light">
                  No activities yet
                </p>
              ) : (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-row items-center gap-3 pb-3 border-b border-gray-300 last:border-b-0"
                  >
                    <p className="bg-[#A7A7A4] w-7 aspect-square rounded-full text-center text-[#E4E3E1] font-bold text-lg">
                      !
                    </p>
                    <p>{renderActivityMessage(activity)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="relative w-full flex-1 min-h-0 flex flex-col gap-4">
          <h1 className="text-title primary-text font-bold">Classroom Status</h1>
          <div className="w-full flex-1 min-h-0 p-4 rounded-2xl shadow-outside-dropshadow">
            <div className="relative w-full h-full rounded-xl shadow-inside-dropshadow-small px-4 py-1 flex flex-col gap-4 overflow-y-auto">
              {/* HEADER */}
              <div className="grid grid-cols-4 border-b border-gray-500/60 bg-[#E4E3E1] py-4 gap-0 primary-text font-medium text-title pb-2 text-center sticky top-0">
                <h2>Classroom</h2>
                <h2>Status</h2>
                <h2>Device</h2>
                <h2>Schedule</h2>
              </div>

              {/* CONTENT */}
              {rooms.length === 0 ? (
                <p className="w-full flex items-center justify-center text-subtitle text-[#999] font-light">
                  No classrooms yet
                </p>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room._id}
                    className="grid grid-cols-4 border-b border-gray-500/60 primary-text text-subtitle py-2 text-center"
                  >
                    <h2>{room.room_name}</h2>
                    <h2>{room.room_occupants >= 1 ? "Occupied" : "Vacant"}</h2>
                    <h2>{room.room_occupants >= 1 ? "Turned On" : "Turned Off"}</h2>
                    <h2>{getNextOrOngoingClass(room._id)}</h2>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}