import { X } from "lucide-react";
import { useState, useEffect } from "react";
import Check from "@/assets/icons/Check.png";
import Checkw from "@/assets/icons/Check_w.png";
import Add from "@/assets/icons/Add.png";
import Popover from "@mui/material/Popover";
import { toast } from "sonner";
import { useSubjects } from "../../../context/subjectContext";
import { useSchedule } from "../../../context/scheduleContext";
import { addSubject } from "../../services/subjectService";
import { getRoomSpecifications, updateRoomSpecification } from "../../services/roomService";

export default function EditClassroom({ open, onClose, roomId }) {
  const [isScheduleEnabled, setIsScheduleEnabled] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [classroomSpec, setClassroomSpec] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [specs, setSpecs] = useState([]);

  const { subjects, addSubjectToList } = useSubjects();
  const { createSchedule } = useSchedule();

  useEffect(() => {
    if (!roomId) return;
    const fetchSpecs = async () => {
      try {
        const data = await getRoomSpecifications(roomId);
        setSpecs(data);
      } catch (error) {
        console.error("Error fetching specs:", error);
      }
    };
    fetchSpecs();
  }, [roomId]);

  if (!open) return null;

  const handleAddSubjectClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
    setSubjectName("");
    setSubjectCode("");
  };

  const handleSubmitSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await addSubject({
        subject_code: subjectCode,
        subject_name: subjectName,
      });
      addSubjectToList(res.subject);
      toast.success(res.message);
      handleClosePopover();
    } catch (error) {
      const message = error.response?.data?.message;
      toast.error(message || "Failed to add subject");
    }
  };

  const handleSave = async () => {
    if (!classroomSpec || classroomSpec === "") {
      toast.error("Please select a classroom specification");
      return;
    }

    if (isScheduleEnabled) {
      if (!scheduleDate) { toast.error("Please select a date for the schedule"); return; }
      if (!timeStart) { toast.error("Please set a start time"); return; }
      if (!timeEnd) { toast.error("Please set an end time"); return; }
      if (!selectedSubject || selectedSubject === "") { toast.error("Please select a subject code"); return; }
      
      // Validate that end time is after start time
      const [startHour, startMinute] = timeStart.split(":").map(Number);
      const [endHour, endMinute] = timeEnd.split(":").map(Number);
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;
      
      if (endTimeInMinutes <= startTimeInMinutes) {
        toast.error("End time must be after start time");
        return;
      }
    }

    try {
      if (isScheduleEnabled) {
        await createSchedule({
          roomId,
          subjectId: selectedSubject,
          room_specification: classroomSpec,
          day: scheduleDate,
          time_start: timeStart,
          time_end: timeEnd,
        });
      } else {
        await updateRoomSpecification(roomId, classroomSpec);
      }
      toast.success("Saved successfully!");
      onClose();
    } catch (error) {
      console.log(error);
      toast.error("Failed to save schedule");
    }
  };

  const open_popover = Boolean(anchorEl);
  const id = open_popover ? "simple-popover" : undefined;

  return (
    <>
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator { color: #4F4F4F; }
        input[type="date"] { color-scheme: light; }
        input[type="time"]::-webkit-calendar-picker-indicator { color: #4F4F4F; }
        input[type="time"] { color-scheme: light; }
      `}</style>
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
          onClick={onClose}
        />
        <section className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[#DFDEDA] shadow-black/70 shadow-lg w-[60%] h-[80%] min-h-0 rounded-lg">
            <div className="pointer-events-auto bg-[#DFDEDA] rounded-lg shadow-2xl overflow-hidden w-[85vw] h-[85vh] max-w-6xl max-h-[90vh] flex flex-col">
              <div className="flex w-full h-full flex-col gap-6 px-8 py-5 min-h-0">
                <div className="shadow-inner-neumorphic px-4 pt-4 flex flex-col content-start items-center w-full h-full rounded-lg">

                  {/* Header */}
                  <div className="px-4 py-2 flex flex-row items-center justify-between w-full">
                    <label className="text-lg font-semibold text-[#4F4F4F] pl-1">
                      Classroom Specification
                    </label>
                    <button
                      onClick={onClose}
                      className="cursor-pointer hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-black/10"
                    >
                      <X size={24} color="#4F4F4F" />
                    </button>
                  </div>

                  {/* Classroom Specification */}
                  <div className="w-full px-4 py-1 flex flex-col gap-4">
                    <select
                      value={classroomSpec}
                      onChange={(e) => setClassroomSpec(e.target.value)}
                      className="w-1/2 bg-[#E4E3E1] text-[#4F4F4F] rounded-full px-4 py-3 shadow-inner border border-[#C4C3C0] focus:outline-none focus:ring-2 focus:ring-[#A1A2A6]"
                    >
                      <option value="">Select an option</option>
                      {specs.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  {/* Schedule */}
                  <div className="w-full px-4 py-1 flex flex-col gap-4">
                    <div className="flex flex-row items-center justify-start gap-6 w-1/2">
                      <label className="text-lg font-semibold text-[#4F4F4F] pl-1 pt-2">
                        Set Schedule
                      </label>
                      <button
                        onClick={() => setIsScheduleEnabled(!isScheduleEnabled)}
                        className="w-7 h-7 cursor-pointer flex items-center justify-center rounded-lg transition-all"
                        style={{
                          backgroundColor: isScheduleEnabled ? "#4F4F4F" : "#DFDEDA",
                          border: "2px solid #C4C3C0"
                        }}
                      >
                        <img
                          src={isScheduleEnabled ? Checkw : Check}
                          alt="checkbox"
                          className="w-4 h-4"
                        />
                      </button>
                    </div>

                    {/* Day picker */}
                    <select
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      disabled={!isScheduleEnabled}
                      className={`w-1/2 bg-[#E4E3E1] text-[#4F4F4F] rounded-full px-4 py-3 shadow-inner border border-[#C4C3C0] focus:outline-none focus:ring-2 focus:ring-[#A1A2A6] transition-opacity ${!isScheduleEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <option value="">Select a day</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>

                    {/* Time pickers */}
                    <div className="flex flex-row gap-4">
                      <div className="flex flex-col">
                        <label className="text-lg font-semibold text-[#4F4F4F] pl-1 pb-1">Time Start</label>
                        <input
                          type="time"
                          value={timeStart}
                          onChange={(e) => setTimeStart(e.target.value)}
                          disabled={!isScheduleEnabled}
                          className={`w-62 bg-[#E4E3E1] text-[#4F4F4F] rounded-full px-4 py-3 shadow-inner border border-[#C4C3C0] focus:outline-none focus:ring-2 focus:ring-[#A1A2A6] transition-opacity ${!isScheduleEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-lg font-semibold text-[#4F4F4F] pl-1 pb-1">Time End</label>
                        <input
                          type="time"
                          value={timeEnd}
                          onChange={(e) => setTimeEnd(e.target.value)}
                          disabled={!isScheduleEnabled}
                          className={`w-62 bg-[#E4E3E1] text-[#4F4F4F] rounded-full px-4 py-3 shadow-inner border border-[#C4C3C0] focus:outline-none focus:ring-2 focus:ring-[#A1A2A6] transition-opacity ${!isScheduleEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        />
                      </div>
                    </div>

                    {/* Subject code */}
                    <div className="flex flex-row gap-4">
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        disabled={!isScheduleEnabled}
                        className={`w-115 bg-[#E4E3E1] text-[#4F4F4F] rounded-full px-4 py-3 shadow-inner border border-[#C4C3C0] focus:outline-none focus:ring-2 focus:ring-[#A1A2A6] transition-opacity ${!isScheduleEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="">Subject Code</option>
                        {subjects.map((subject) => (
                          <option key={subject._id} value={subject._id}>
                            {subject.subject_code} - {subject.subject_name}
                          </option>
                        ))}
                      </select>
                      <button disabled={!isScheduleEnabled} onClick={handleAddSubjectClick}>
                        <img
                          src={Add}
                          alt="Add"
                          className={`w-6 h-6 bg-[#E4E3E1] rounded-full transition-all ${isScheduleEnabled ? 'cursor-pointer hover:bg-[#d4d3d1]' : 'opacity-50 cursor-not-allowed'}`}
                        />
                      </button>
                    </div>

                    {/* Popover for adding subject */}
                    <Popover
                      id={id}
                      open={open_popover}
                      anchorEl={anchorEl}
                      onClose={handleClosePopover}
                      slotProps={{
                        paper: {
                          sx: {
                            backgroundColor: "#DFDEDA",
                            borderRadius: "15px",
                            marginY: -2,
                          },
                        },
                      }}
                      anchorOrigin={{ vertical: "top", horizontal: "center" }}
                      transformOrigin={{ vertical: "bottom", horizontal: "center" }}
                    >
                      <div className="w-84 rounded-lg flex flex-col gap-2 p-5 bg-[#DFDEDA]">
                        <h2 className="text-lg text-[#4F4F4F]">Add Subject</h2>
                        <form onSubmit={handleSubmitSubject} className="flex flex-col gap-3">
                          <input
                            type="text"
                            value={subjectCode}
                            onChange={(e) => setSubjectCode(e.target.value)}
                            placeholder="Enter Subject Code"
                            required
                            className="w-full min-w-0 bg-[#E4E3E1] rounded-full px-4 py-2 text-base focus:outline-none"
                          />
                          <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            placeholder="Enter Subject Name"
                            required
                            className="w-full min-w-0 bg-[#E4E3E1] rounded-full px-4 py-2 text-base focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="bg-[#A1A2A6] text-white py-2 rounded-lg text-base hover:bg-[#7E808C] transition-colors duration-300"
                          >
                            Add Subject
                          </button>
                        </form>
                      </div>
                    </Popover>
                  </div>
                </div>

                {/* Save button */}
                <div className="w-full h-[10%] gap-6 flex flex-row justify-end">
                  <button
                    onClick={handleSave}
                    className="w-38 h-12 bg-[#E4E3E1] text-subtitle text-[#4F4F4F] shadow-outside-dropshadow rounded-lg hover:scale-105 transition-all duration-150"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}