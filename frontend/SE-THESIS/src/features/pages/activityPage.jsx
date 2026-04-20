import React, { useState, useEffect, useRef } from "react";
import { useActivity } from "../../context/activityContext";
import UnderConstruction from "@/assets/images/under_construction.png";
import sortDown from "@/assets/icons/sortDown.png";
import sortUp from "@/assets/icons/sortUp.png";
import { useRooms } from "../../context/roomContext";

export default function ActivityPage() {
  const [selectedButton, setSelectedButton] = useState(0);
  const [displayedCounts, setDisplayedCounts] = useState({
    0: 10,
    1: 10,
    2: 10,
  });
  const scrollContainerRef = useRef(null);
  const { fetchAllActivities, activities, loading } = useActivity();
  const buttons = ["Today", "This Week", "This Month"];
  const [sortAsc, setSortAsc] = useState(false);
  const { rooms } = useRooms();

  const filterMap = {
    0: "today",
    1: "week",
    2: "month",
  };

  // Fetch activities for all rooms when they load
  useEffect(() => {
    console.log("[ActivityPage] useEffect - rooms changed:", rooms);
    if (!rooms || rooms.length === 0) {
      console.log("[ActivityPage] No rooms available");
      return;
    }

    console.log("[ActivityPage] Fetching activities for", rooms.length, "rooms");
    fetchAllActivities(rooms).catch((error) => {
      console.error("[ActivityPage] Failed to fetch activities:", error);
    });
  }, [rooms, fetchAllActivities]);

  useEffect(() => {
    console.log("[ActivityPage] activities state updated - total count:", activities.length);
    console.log("[ActivityPage] loading state:", loading);
    console.log("[ActivityPage] activities:", activities);
  }, [activities, loading]);

  const filteredActivities = activities
    .filter((activity) => {
      // Handle both activity_timestamp and timestamp field names
      const timestampStr = activity.activity_timestamp || activity.timestamp;
      if (!timestampStr) {
        console.warn("[ActivityPage] Activity missing timestamp:", activity);
        return false;
      }
      
      const activityDate = new Date(timestampStr);
      const now = new Date();
      
      // Check if date is invalid
      if (isNaN(activityDate.getTime())) {
        console.warn("[ActivityPage] Invalid date for activity:", timestampStr, activity);
        return false;
      }

      if (selectedButton === 0) {
        const match = activityDate.toDateString() === now.toDateString();
        console.log(`[ActivityPage] Filter 'Today': activity ${activity._id || activity.id} timestamp=${timestampStr} date=${activityDate.toDateString()} now=${now.toDateString()} => ${match}`);
        return match;
      }

      if (selectedButton === 1) {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        const match = activityDate >= weekAgo;
        console.log(`[ActivityPage] Filter 'Week': activity ${activity._id || activity.id} timestamp=${timestampStr} => ${match}`);
        return match;
      }

      if (selectedButton === 2) {
        const match =
          activityDate.getMonth() === now.getMonth() &&
          activityDate.getFullYear() === now.getFullYear();
        console.log(`[ActivityPage] Filter 'Month': activity ${activity._id || activity.id} timestamp=${timestampStr} => ${match}`);
        return match;
      }

      return true;
    })
    .slice()
    .sort((a, b) =>
      sortAsc
        ? new Date(a.activity_timestamp) - new Date(b.activity_timestamp)
        : new Date(b.activity_timestamp) - new Date(a.activity_timestamp),
    );

  console.log("[ActivityPage] selectedButton:", selectedButton, "filteredActivities count:", filteredActivities.length, "out of", activities.length, "total");

  const currentDisplayCount = displayedCounts[selectedButton];
  const displayedActivities = filteredActivities.slice(0, currentDisplayCount);
  const hasMoreActivities = filteredActivities.length > currentDisplayCount;
  console.log("[ActivityPage] Displaying", displayedActivities.length, "of", filteredActivities.length, "filtered activities");

  const handleLoadMore = () => {
    setDisplayedCounts((prev) => ({
      ...prev,
      [selectedButton]: prev[selectedButton] + 10,
    }));
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const renderActivityMessage = (activity) => {
    console.log("[ActivityPage] renderActivityMessage called with:", activity);
    // Handle old message format for backward compatibility
    if (activity.activity_message) {
      const message = activity.activity_message;
      console.log("[ActivityPage] Using activity_message:", message);

      // Match patterns like: Lights in "classroom 3" have been turned on
      const deviceMatch = message.match(/(Lights|Fans)/i);
      const roomMatch = message.match(/["']([^"']+)["']/);

      if (deviceMatch && roomMatch) {
        const device = deviceMatch[1].toLowerCase();
        const room = roomMatch[1];

        if (message.toLowerCase().includes("turned on")) {
          return (
            <span>
              <span className="font-bold">{room}</span>
              {` ${device} turned on`}
            </span>
          );
        } else if (message.toLowerCase().includes("turned off")) {
          return (
            <span>
              <span className="font-bold">{room}</span>
              {` ${device} turned off`}
            </span>
          );
        }
      }

      const roomCreationMatch = message.match(
        /classroom\s+["']([^"']+)["']\s+(has been created|has been removed)/i,
      );
      if (roomCreationMatch) {
        const room = roomCreationMatch[1];
        const action = roomCreationMatch[2].toLowerCase();

        return (
          <span>
            <span className="font-bold">{room}</span>
            {` ${action}`}
          </span>
        );
      }

      // Improved fallback: Try to extract room name from quoted strings or after "in"
      let extractedRoom = "";
      if (roomMatch) {
        extractedRoom = roomMatch[1];
      } else {
        // Try to extract room after "in" keyword
        const inMatch = message.match(/in\s+(.+?)(?:\s+(?:lights|fans|have|turned|has|been))/i);
        if (inMatch) {
          extractedRoom = inMatch[1].replace(/^["']|["']$/g, "").trim();
        }
      }

      if (extractedRoom) {
        const cleanedMessage = message.replace(new RegExp(extractedRoom, "i"), "").trim();
        return (
          <span>
            <span className="font-bold">{extractedRoom}</span>
            {cleanedMessage && ` ${cleanedMessage}`}
          </span>
        );
      }

      return <span>{message}</span>;
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
  
  return (
    <div className="w-full h-full bg-[#E4E3E1] min-h-0">
      <section className="relative w-full h-full flex flex-col gap-6 min-h-0">
        <div className="w-full flex flex-row items-end justify-between text-[#1E1E1E] opacity-75">
          <h1 className="text-subheader font-bold">Activity Log</h1>
          {/* <button 
            onClick={() => setSortAsc(prev => !prev)}
            className="flex items-center gap-2 w-auto h-10 bg-transparent text-[#1E1E1E] px-12 rounded-lg text-2xl font-semibold hover:bg-[#d4d3d1] transition-colors duration-300"
          >
            <img src={sortAsc ? sortUp : sortDown} alt="Sort" className="w-10 h-6" />
            Sort
          </button> */}
        </div>
        <div className="w-full h-full min-h-0 rounded-2xl shadow-outside-dropshadow flex flex-col bg-[#shadow-black/40 hover:shadow-md]">
          <div className="w-full h-[15%] shadow-lg shadow-gray px-5 py-3">
            <div className="w-full h-full p-4 flex flex-row justify-between gap-5 rounded-xl shadow-inside-dropshadow-small">
              {buttons.map((btn, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedButton(index)}
                  className={`w-full text-subtitle px-5 primary-text rounded-lg cursor-pointer hover:scale-101 transition-transform duration-300
            ${selectedButton === index ? "shadow-black/40 shadow-md" : ""}
          `}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full h-full p-5 flex flex-col min-h-0">
            {/* Activity Log */}
            <div
              ref={scrollContainerRef}
              className="w-full h-full overflow-y-scroll rounded-xl shadow-inside-dropshadow-small flex flex-col"
            >
              {filteredActivities.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-subtitle text-[#999] font-light">
                    No activities for {buttons[selectedButton].toLowerCase()}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    {displayedActivities.map((activity) => {
                      const timestampStr = activity.activity_timestamp || activity.timestamp;
                      const activityId = activity._id || activity.id;
                      return (
                        <div
                          key={activityId}
                          className="w-full border-b border-gray-300 p-5 primary-text flex flex-row items-center justify-between hover:bg-gray-100 transition-colors duration-200"
                        >
                          <div className="flex flex-col gap-1">
                            <p className="text-subtitle text-[#4F4F4F]">
                              {renderActivityMessage(activity)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {timestampStr ? formatTime(timestampStr) : "Unknown time"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {hasMoreActivities && (
                    <div className="w-full p-4 flex justify-center border-t border-gray-300">
                      <button
                        onClick={handleLoadMore}
                        className="px-6 py-2 bg-transparent text-[#A7A7A4] rounded-lg font-medium hover:bg-gray-100 transition-colors duration-200"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
