import React, { useState, useRef, useEffect } from "react";
import { X, SquarePen, ChevronLeft, ChevronRight } from "lucide-react";
import EditClassroom from "./editClassroom";
import { useSchedule } from "../../../context/scheduleContext";
import { getRooms } from "../../../shared/services/roomService";

export default function EditSchedule({ open, onClose, roomId }) {
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false);
  const [relatedRooms, setRelatedRooms] = useState([]);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const { schedules, fetchSchedulesByRoom } = useSchedule();
  const dropdownRef = useRef(null);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const handlePreviousRoom = () => {
    if (relatedRooms.length === 0) return;
    const newIndex = currentRoomIndex === 0 ? relatedRooms.length - 1 : currentRoomIndex - 1;
    setCurrentRoomIndex(newIndex);
    fetchSchedulesByRoom(relatedRooms[newIndex]._id);
  };

  const handleNextRoom = () => {
    if (relatedRooms.length === 0) return;
    const newIndex = currentRoomIndex === relatedRooms.length - 1 ? 0 : currentRoomIndex + 1;
    setCurrentRoomIndex(newIndex);
    fetchSchedulesByRoom(relatedRooms[newIndex]._id);
  };

  useEffect(() => {
    if (!roomId || !open) return;

    const loadRoomData = async () => {
      try {
        // Fetch all rooms
        const allRooms = await getRooms();

        // Find current room details
        const currentRoom = allRooms.find(r => r._id === roomId);
        if (!currentRoom) return;

        // Filter rooms with the same specification
        const filtered = allRooms.filter(
          r => r.room_specification === currentRoom.room_specification
        );

        setRelatedRooms(filtered);

        // Find current room index in filtered list
        const index = filtered.findIndex(r => r._id === roomId);
        setCurrentRoomIndex(index >= 0 ? index : 0);

        // Fetch schedules for current room
        fetchSchedulesByRoom(roomId);
      } catch (error) {
        console.error("Error loading room data:", error);
      }
    };

    loadRoomData();
  }, [roomId, open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!open) return null;

  const filteredSchedules = schedules.filter((s) => s.day === selectedDay);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />
      <section className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-[#DFDEDA] shadow-black/70 shadow-lg w-[60%] h-[80%] min-h-0 rounded-lg">
          <div className="pointer-events-auto bg-[#DFDEDA] rounded-lg shadow-2xl overflow-hidden w-[85vw] h-[85vh] max-w-6xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-8 py-6 flex items-center justify-between">
              <h2 className="text-title font-bold text-[#4F4F4F]">Classroom Schedule</h2>
              <button
                onClick={onClose}
                className="cursor-pointer hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-black/10"
              >
                <X size={24} color="#4F4F4F" />
              </button>
            </div>

            <div className="flex w-full h-full flex-col gap-6 px-8 py-5 min-h-0">

              {/* Schedule Table */}
              <div className="shadow-inner-neumorphic flex flex-col w-full h-[75%] rounded-lg overflow-hidden">
                {/* Column Headers */}
                <div className="flex flex-row px-4 py-6 text-[#4F4F4F] font-semibold text-lg justify-around">
                  <span>Subject</span>
                  <span>Time Start</span>
                  <span>Time End</span>
                </div>

                {/* Rows */}
                <div className="flex flex-row justify-around w-full overflow-y-auto">
                  {filteredSchedules.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-[#A1A2A6] text-base">No schedules for {selectedDay}</p>
                    </div>
                  ) : (
                    filteredSchedules.map((schedule) => (
                      <div
                        key={schedule._id}
                        className="flex flex-row w-full h-12 px-4 py-3 border-b border-[#C4C3C0] text-[#4F4F4F] text-base hover:bg-[#d4d3d1] transition-colors duration-150"
                      >
                        <span className="absolute left-125 font-semibold">
                          {schedule.subject?.subject_code} - {schedule.subject?.subject_name}
                        </span>
                        <span className="absolute left-223 font-semibold">{schedule.time_start}</span>
                        <span className="absolute left-314 font-semibold">{schedule.time_end}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="h-full flex flex-row justify-between items-end">
                  <div className="relative w-48" ref={dropdownRef}>
                    <button
                      className="w-full p-3 bg-[#DFDEDA] border rounded-lg shadow-inner-neumorphic text-left"
                      onClick={() => setIsOpen(!isOpen)}
                    >
                      {selectedDay}
                    </button>
                    {isOpen && (
                      <ul className="absolute w-full bg-white border rounded-lg shadow-lg bottom-full mb-1">
                        {days.map((day) => (
                          <li
                            key={day}
                            onClick={() => { setSelectedDay(day); setIsOpen(false); }}
                            className="p-2 hover:bg-blue-100 cursor-pointer"
                          >
                            {day}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {/* Chevron Navigation */}
                  <div className="w-full flex items-center justify-center gap-4 py-3">
                    <button
                      onClick={handlePreviousRoom}
                      disabled={relatedRooms.length <= 1}
                      className="cursor-pointer hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={24} color="#4F4F4F" />
                    </button>
                    <span className="text-sm text-[#4F4F4F] font-semibold">
                      {relatedRooms.length > 0 ? `${currentRoomIndex + 1} / ${relatedRooms.length}` : "N/A"}
                    </span>
                    <button
                      onClick={handleNextRoom}
                      disabled={relatedRooms.length <= 1}
                      className="cursor-pointer hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={24} color="#4F4F4F" />
                    </button>
                  </div>

                  <button
                    onClick={() => setIsEditClassroomOpen(true)}
                    className="cursor-pointer flex items-center gap-2 hover:scale-102 transition-transform duration-150 p-2 rounded-full hover:bg-black/10"
                  >
                    <SquarePen size={24} color="#4F4F4F" /> Edit Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditClassroom
        open={isEditClassroomOpen}
        onClose={() => setIsEditClassroomOpen(false)}
        roomId={roomId}
      />
    </div>
  );
}