import { useState, useEffect, useRef } from "react";
import {
  CirclePlus,
  ListVideo,
  Ellipsis,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Popover from "@mui/material/Popover";
import { useForm } from "react-hook-form";
import { handleServerDown } from "../../shared/utils/serverDownHandler.js";
import { useServerStatus } from "../../context/serverStatusContext.jsx";
import { useActivity } from "../../context/activityContext.jsx";
import { useAuth } from "../../context/authContext.jsx";
import { toast } from "sonner";
import { addRoom } from "../../shared/services/roomService.js";
import { createClassroomRequest } from "../../shared/services/classroomRequestService.js";
import { useNavigate } from "react-router-dom";
import { useRooms } from "../../context/roomContext.jsx";
import KebabPullout from "../../shared/components/ui/kebabPullout.jsx";
import EditClassroom from "../../shared/components/ui/editClassroom.jsx";
import EditSchedule from "../../shared/components/ui/editSchedule.jsx";
import ViewClassroom from "../../shared/components/ui/viewClassroom.jsx";

// Horizontal scrollable row per specification
function SpecRow({ label, rooms, onCardClick, onKebabClick }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  console.log("ROOMS IN SPEC ROW:", rooms);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [rooms]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-subtitle font-semibold text-[#4F4F4F]">{label}</h2>
      <div className="relative flex items-center">
        {/* Left button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 z-10 w-8 h-8 bg-[#C4C3C0] rounded-full flex items-center justify-center shadow-md hover:bg-[#A1A2A6] transition-colors duration-150"
          >
            <ChevronLeft size={18} color="#4F4F4F" />
          </button>
        )}

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex flex-row gap-6 overflow-x-auto scroll-smooth px-2 py-2"
          style={{ scrollbarWidth: "none" }}
        >
          {rooms.map((room) => (
            <div
              key={room._id}
              onClick={() => onCardClick(room)}
              className="relative overflow-clip bg-[#DFDEDA] shadow-outside-dropshadow rounded-lg hover:scale-101 duration-100 transition-all flex flex-col cursor-pointer flex-shrink-0"
              style={{ width: "320px", aspectRatio: "3/2" }}
            >
              <div className="bg-[#DFDEDA] w-full h-[70%] shadow-inner shadow-black/10 flex items-center justify-center">
                <ListVideo size={60} color="#A1A2A6" />
              </div>
              <div className="w-full flex-1 bg-[#C4C3C0] shadow-inner shadow-black/30 flex items-center justify-between py-4 px-4">
                <p className="text-subtitle text-[#4F4F4F]">{room.room_name}</p>
                <button
                  onClick={(e) => onKebabClick(e, room._id, room.room_name)}
                  className="cursor-pointer hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-black/10"
                >
                  <Ellipsis size={35} color="#A1A2A6" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right button */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 z-10 w-8 h-8 bg-[#C4C3C0] rounded-full flex items-center justify-center shadow-md hover:bg-[#A1A2A6] transition-colors duration-150"
          >
            <ChevronRight size={18} color="#4F4F4F" />
          </button>
        )}
      </div>
    </div>
  );
}

// Layered specification categories
function CategoriesScroller({
  specKeys,
  groupedRooms,
  onCardClick,
  onKebabClick,
}) {
  if (specKeys.length === 0) {
    return (
      <section className="relative flex-1 min-h-0 flex items-center justify-center">
        <p className="text-subtitle text-[#A1A2A6] font-light">
          No classrooms yet
        </p>
      </section>
    );
  }

  return (
    <section className="relative flex-1 overflow-y-auto min-h-0 flex flex-col gap-8 p-4">
      {specKeys.map((spec) => (
        <SpecRow
          key={spec}
          label={spec}
          rooms={groupedRooms[spec]}
          onCardClick={onCardClick}
          onKebabClick={onKebabClick}
        />
      ))}
    </section>
  );
}

export default function ClassroomPage() {
  const navigate = useNavigate();
  const { rooms, setRooms } = useRooms();
  const { addActivity } = useActivity();
  const { user } = useAuth();
  const [kebabAnchorEl, setKebabAnchorEl] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedRoomName, setSelectedRoomName] = useState(null);
  const [selectedRelayPin, setSelectedRelayPin] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editScheduleModalOpen, setEditScheduleModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const { isServerUp, setIsServerUp } = useServerStatus();

  // Group rooms by room_specification
  const groupedRooms = rooms.reduce((acc, room) => {
    const key = room.room_specification || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {});

  // Put Unassigned at the end
  const specKeys = Object.keys(groupedRooms).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });

  const onError = (errors) => {
    if (errors.cr_name) toast.error(errors.cr_name.message);
  };

  const handleCardClick = (room) => {
    setSelectedRoomId(room._id);
    setSelectedRoomName(room.room_name);
    setSelectedRelayPin(room.relay_pin ?? null);
    setViewModalOpen(true);
  };
  const handleRoomDeleted = (deletedRoomId) => {
    setRooms((prevRooms) =>
      prevRooms.filter((room) => room._id !== deletedRoomId),
    );
  };

  const handleKebabClick = (event, roomId, roomName) => {
    event.stopPropagation();
    setKebabAnchorEl(event.currentTarget);
    setSelectedRoomId(roomId);
    setSelectedRoomName(roomName);
  };

  const handleKebabClose = () => {
    setKebabAnchorEl(null);
  };

  const onSubmit = async (data) => {
    try {
      // Check if room name already exists
      const roomExists = rooms.some(
        (room) => room.room_name.toLowerCase() === data.cr_name.toLowerCase()
      );

      if (roomExists) {
        toast.error("A classroom with this name already exists");
        return;
      }

      // If user is not admin, create a request instead
      if (!user?.is_admin) {
        await createClassroomRequest(data.cr_name);
        toast.info(
          "Your classroom request has been sent to administrators for approval",
          {},
        );
        setAnchorEl(null);
        return;
      }

      // Admin can add directly
      const res = await addRoom({ room_name: data.cr_name });
      addActivity(data.cr_name, "created");
      toast.success(res.message);
      setAnchorEl(null);
    } catch (error) {
      if (handleServerDown(error, setIsServerUp, navigate)) return;
      toast.error(
        error.response?.data?.message || "Failed to create classroom",
      );
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <div className="w-full h-full flex flex-col p-2 gap-4 bg-[#E4E3E1] min-h-0">
      {/* Header */}
      <section className="relative w-full h-fit flex">
        <div className="w-full flex flex-row items-end justify-between text-[#4F4F4F]">
          <h1 className="text-subheader font-bold">Monitor Classroom</h1>
          <button
            onClick={(e) => setAnchorEl(e.currentTarget)}
            className="flex items-center gap-2 px-3 py-2 text-subtitle text-[#4F4F4F] hover:transition-all hover:scale-102 duration-300 cursor-pointer"
          >
            <CirclePlus size={50} color="#A1A2A6" />
            Add classroom
          </button>
        </div>
      </section>

      {/* Categorized Rows - Horizontal Scrolling */}
      <CategoriesScroller
        specKeys={specKeys}
        groupedRooms={groupedRooms}
        onCardClick={handleCardClick}
        onKebabClick={handleKebabClick}
      />

      {/* Add Classroom Popover */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "#DFDEDA",
              color: "#A1A2A6",
              borderRadius: "15px",
            },
          },
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <div className="bg-[#DFDEDA] shadow-inner shadow-black/10 flex flex-col gap-2 items-center justify-center">
          <div className="w-[25vw] bg-[#C4C3C0] shadow shadow-black/20 flex-1 flex flex-row items-center justify-between p-5">
            <h2 className="text-subtitle text-[#4F4F4F]">
              {user?.user_organization
                ? "Add Classroom"
                : "Organization Required"}
            </h2>
            <button
              onClick={() => setAnchorEl(null)}
              className="cursor-pointer hover:scale-105 transition-all duration-150"
            >
              <X />
            </button>
          </div>
          <div className="w-full px-5">
            {user?.user_organization ? (
              <form
                onSubmit={handleSubmit(onSubmit, onError)}
                className="w-full flex flex-col gap-5 py-5 items-center justify-center"
              >
                <input
                  {...register("cr_name", { required: "Please fill the form" })}
                  className="w-full bg-[#E4E3E1] primary-text rounded-3xl px-6 py-4 shadow-inside-dropshadow-small font-light text-subtitle"
                  placeholder="Enter Classroom Name"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#A1A2A6] text-subtitle text-[#E4E3E1] shadow-outside-dropshadow py-4 rounded-3xl"
                >
                  {isSubmitting ? "Adding..." : "Add Room"}
                </button>
              </form>
            ) : (
              <div className="w-full flex flex-col gap-5 py-10 items-center justify-center">
                <p className="text-center text-subtitle text-[#4F4F4F] font-medium">
                  Apply to an organization first
                </p>
                <button
                  onClick={() => {
                    setAnchorEl(null);
                    navigate("/iris/profile");
                  }}
                  className="w-full bg-[#A1A2A6] text-subtitle text-[#E4E3E1] shadow-outside-dropshadow py-4 rounded-3xl hover:scale-105 transition-all duration-150"
                >
                  Go to Apply Organization
                </button>
              </div>
            )}
          </div>
        </div>
      </Popover>

      <KebabPullout
        open={Boolean(kebabAnchorEl)}
        anchorEl={kebabAnchorEl}
        onClose={handleKebabClose}
        onEditClassroom={() => setEditModalOpen(true)}
        onEditSchedule={() => setEditScheduleModalOpen(true)}
      />

      <EditClassroom
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedRoomId(null);
        }}
        roomId={selectedRoomId}
      />

      <EditSchedule
        open={editScheduleModalOpen}
        onClose={() => setEditScheduleModalOpen(false)}
        roomId={selectedRoomId}
      />

      <ViewClassroom
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        roomId={selectedRoomId}
        roomName={selectedRoomName}
        relayPin={selectedRelayPin}
        onRoomDeleted={handleRoomDeleted}
      />
    </div>
  );
}
