import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import Dialog from "@mui/material/Dialog";
import Switch from "@mui/material/Switch";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";
import Draggable from "react-draggable";
import Small_Logo from "@/assets/images/small_logo.png";
import { deleteRoom } from "../../services/roomService";
import { handleServerDown } from "../../utils/serverDownHandler";
import { useServerStatus } from "../../../context/serverStatusContext";
import { useActivity } from "../../../context/activityContext";
import { useDeviceState } from "../../../context/deviceStateContext";
import { useNavigate } from "react-router-dom";
import { addCamera, getDevice } from "../../services/deviceService";
import { socket } from "../../services/socketService";
import { Toaster } from "../../components/ui/sonner";
import { useCamera } from "../../../context/cameraContext";
import { toast } from "sonner";
import { turnOnDevice } from "../../services/arduinoService";
import {
  addPoints,
  getROIPoints,
  deleteROIPoints,
} from "../../services/pointService";
import { recordActivity } from "../../services/activityService";

function PaperComponent(props) {
  const nodeRef = useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} ref={nodeRef} />
    </Draggable>
  );
}

function VideoModal({ room, roomName, stream, onClose }) {
  const modalVideoRef = useRef(null);
  const [isMarking, setIsMarking] = useState(false);
  const [points, setPoints] = useState([]);
  const [roiSets, setRoiSets] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSavedROIs, setShowSavedROIs] = useState(true);
  const now = new Date();

  useEffect(() => {
    if (modalVideoRef.current && stream) {
      modalVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const handleResize = () => {
      if (room) loadSavedROIs();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [room, stream]);

  useEffect(() => {
    const videoEl = modalVideoRef.current;
    if (!videoEl || !room) return;

    const handleLoadedMetadata = () => {
      loadSavedROIs();
    };

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);

    if (videoEl.readyState >= 1) {
      loadSavedROIs();
    }

    return () => {
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [room, stream]);

  const loadSavedROIs = async () => {
    try {
      const data = await getROIPoints(room);

      // data is expected as DB rows:
      // [{ room_id, point_x, point_y, point_index, point_order }, ...]

      const grouped = {};

      data.forEach((point) => {
        if (!grouped[point.point_index]) {
          grouped[point.point_index] = [];
        }

        const displayPoint = convertVideoPointToDisplayPoint(
          point.point_x,
          point.point_y,
        );

        if (!displayPoint) return;

        grouped[point.point_index].push({
          displayX: displayPoint.displayX,
          displayY: displayPoint.displayY,
          videoX: point.point_x,
          videoY: point.point_y,
          point_order: point.point_order,
        });
      });

      const formattedROIs = Object.keys(grouped)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => ({
          roi_index: Number(key),
          points: grouped[key].sort((a, b) => a.point_order - b.point_order),
        }));

      setRoiSets(formattedROIs);
    } catch (error) {
      console.error("Failed to load ROI for room:", room, error);
    }
  };

  const convertVideoPointToDisplayPoint = (videoX, videoY) => {
    const videoEl = modalVideoRef.current;
    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
      return null;
    }

    const rect = videoEl.getBoundingClientRect();

    const boxWidth = rect.width;
    const boxHeight = rect.height;

    const videoWidth = videoEl.videoWidth;
    const videoHeight = videoEl.videoHeight;

    const videoAspect = videoWidth / videoHeight;
    const boxAspect = boxWidth / boxHeight;

    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (videoAspect > boxAspect) {
      renderedWidth = boxWidth;
      renderedHeight = boxWidth / videoAspect;
      offsetX = 0;
      offsetY = (boxHeight - renderedHeight) / 2;
    } else {
      renderedHeight = boxHeight;
      renderedWidth = boxHeight * videoAspect;
      offsetX = (boxWidth - renderedWidth) / 2;
      offsetY = 0;
    }

    const displayX = offsetX + (videoX / videoWidth) * renderedWidth;
    const displayY = offsetY + (videoY / videoHeight) * renderedHeight;

    return { displayX, displayY };
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (points.length === 4) {
      console.log(
        "ROI VIDEO COORDS:",
        points.map((p) => ({
          x: p.videoX,
          y: p.videoY,
        })),
      );
    }
  }, [points]);

  const handleFinalSave = async (finalRoiSets = roiSets) => {
    try {
      setIsSaving(true);

      const payload = {
        roomId: room,
        rois: finalRoiSets.map((roi) => ({
          roi_index: roi.roi_index,
          points: roi.points.map((point, pointIndex) => ({
            point_x: point.videoX,
            point_y: point.videoY,
            point_order: pointIndex + 1,
          })),
        })),
      };

      console.log("FINAL PAYLOAD:", payload);

      const data = await addPoints(payload);
      console.log("SERVER RESPONSE:", data);

      await loadSavedROIs();

      setIsSaving(false);
      setIsSaved(true);

      setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save room ROI:", error);
      setIsSaving(false);
    }
  };

  const handleOverlayClick = (e) => {
    const overlayRect = e.currentTarget.getBoundingClientRect();
    const videoEl = modalVideoRef.current;

    if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
      return;
    }

    const clickX = e.clientX - overlayRect.left;
    const clickY = e.clientY - overlayRect.top;

    const boxWidth = overlayRect.width;
    const boxHeight = overlayRect.height;

    const videoWidth = videoEl.videoWidth;
    const videoHeight = videoEl.videoHeight;

    const videoAspect = videoWidth / videoHeight;
    const boxAspect = boxWidth / boxHeight;

    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (videoAspect > boxAspect) {
      renderedWidth = boxWidth;
      renderedHeight = boxWidth / videoAspect;
      offsetX = 0;
      offsetY = (boxHeight - renderedHeight) / 2;
    } else {
      renderedHeight = boxHeight;
      renderedWidth = boxHeight * videoAspect;
      offsetX = (boxWidth - renderedWidth) / 2;
      offsetY = 0;
    }

    const isInsideRenderedVideo =
      clickX >= offsetX &&
      clickX <= offsetX + renderedWidth &&
      clickY >= offsetY &&
      clickY <= offsetY + renderedHeight;

    if (!isInsideRenderedVideo) return;

    const normalizedX = (clickX - offsetX) / renderedWidth;
    const normalizedY = (clickY - offsetY) / renderedHeight;

    const newPoint = {
      displayX: clickX,
      displayY: clickY,
      videoX: Math.round(normalizedX * videoWidth),
      videoY: Math.round(normalizedY * videoHeight),
    };

    setPoints((prev) => {
      if (prev.length >= 4) return prev;

      const updated = [...prev, newPoint];
      console.log("POINT:", newPoint);
      return updated;
    });
  };

  const handleStartNewROI = () => {
    if (roiSets.length >= 2) return;
    setPoints([]);
    setIsMarking(true);
  };

  const handleCancelCurrentROI = () => {
    setPoints([]);
    setIsMarking(false);
  };

  const handleSaveCurrentROI = async () => {
    if (points.length !== 4) return;

    const nextIndex =
      roiSets.length === 0
        ? 1
        : roiSets.some((roi) => roi.roi_index === 1)
          ? 2
          : 1;

    const currentROI = {
      roi_index: nextIndex,
      points: [...points],
    };

    const updatedSets = [...roiSets, currentROI].sort(
      (a, b) => a.roi_index - b.roi_index,
    );

    setRoiSets(updatedSets);
    setPoints([]);
    setIsMarking(false);

    // If 2 ROI sets are now complete, trigger final save
    if (updatedSets.length === 2) {
      await handleFinalSave(updatedSets);
    }
  };

  const handleDeleteROI = async (roiIndexToDelete) => {
    try {
      await deleteROIPoints(room, roiIndexToDelete);
      await loadSavedROIs();

      console.log(`ROI ${roiIndexToDelete} deleted for room ${room}`);
    } catch (error) {
      console.error("Failed to delete ROI:", error);
    }
  };

  const handleToggleViewROIs = () => {
    setShowSavedROIs((prev) => !prev);
  };

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[90vw] h-[90%] min-h-0 bg-[#DFDEDA] flex flex-col rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative  w-[full] h-[90%] bg-[#DFDEDA] rounded-xl p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="absolute top-8 left-8 z-20 text-secondary text-title ">
            {now.toLocaleTimeString()} | {now.toLocaleDateString()}
          </p>

          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <video
              ref={modalVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />

            <svg
              className="absolute inset-0 z-10 pointer-events-none w-full h-full"
              width="100%"
              height="100%"
              viewBox={`0 0 ${modalVideoRef.current?.clientWidth || 0} ${modalVideoRef.current?.clientHeight || 0}`}
              preserveAspectRatio="none"
            >
              {showSavedROIs &&
                roiSets.map((roi) =>
                  roi.points.length === 4 ? (
                    <polygon
                      key={`saved-poly-${roi.roi_index}`}
                      points={roi.points
                        .map((p) => `${p.displayX},${p.displayY}`)
                        .join(" ")}
                      fill="none"
                      stroke={roi.roi_index === 1 ? "cyan" : "orange"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null,
                )}

              {points.length === 4 && (
                <polygon
                  points={points
                    .map((p) => `${p.displayX},${p.displayY}`)
                    .join(" ")}
                  fill="none"
                  stroke="lime"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>

            {showSavedROIs &&
              roiSets.map((roi) =>
                roi.points.map((point, index) => (
                  <div
                    key={`saved-${roi.roi_index}-${index}`}
                    className="absolute z-20 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${point.displayX}px`,
                      top: `${point.displayY}px`,
                      backgroundColor: roi.roi_index === 1 ? "cyan" : "orange",
                    }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>
                )),
              )}

            {points.map((point, index) => (
              <div
                key={`current-${index}`}
                className="absolute z-20 w-4 h-4 bg-red-500 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${point.displayX}px`,
                  top: `${point.displayY}px`,
                }}
              >
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold">
                  {index + 1}
                </span>
              </div>
            ))}

            {roiSets.length > 0 && (
              <div className="absolute top-8 right-8 z-30 flex flex-col gap-3">
                {roiSets.map((roi) => (
                  <button
                    key={`delete-roi-${roi.roi_index}`}
                    onClick={() => handleDeleteROI(roi.roi_index)}
                    className="px-5 py-3 rounded-lg bg-red-600 text-white shadow-black shadow-sm hover:scale-102 transition"
                  >
                    Delete ROI {roi.roi_index}
                  </button>
                ))}
              </div>
            )}

            {isMarking && points.length < 4 && !isSaving && !isSaved && (
              <div
                className="absolute inset-0 z-10 cursor-crosshair bg-transparent"
                onClick={handleOverlayClick}
              />
            )}
          </div>
        </div>
        <div className="w-[90vw] h-full flex flex-row justify-between items-center p-4 bg-[#DFDEDA] rounded-b-2xl">
          <p className="text-primary font-semibold text-subheader font-montserrat">
            {roomName}
          </p>
          <div className="flex flex-row justify-end gap-4 z-20">
            <button
              onClick={handleStartNewROI}
              disabled={isMarking || roiSets.length >= 2 || isSaving}
              className="px-[2vw] py-[1vw] rounded-lg bg-[#A1A2A6] shadow-black shadow-sm text-secondary text-title hover:scale-102 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add ROI
            </button>

            <button
              onClick={handleSaveCurrentROI}
              disabled={points.length !== 4 || isSaving}
              className="px-[2vw] py-[1vw] rounded-lg bg-green-600 shadow-black shadow-sm text-white text-title hover:scale-102 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save ROI"}
            </button>

            <button
              onClick={handleToggleViewROIs}
              disabled={roiSets.length === 0}
              className="px-[2vw] py-[1vw] rounded-lg bg-[#A1A2A6] shadow-black shadow-sm text-secondary text-title hover:scale-102 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showSavedROIs ? "Hide ROI" : "View ROI"}
            </button>

            <button
              onClick={handleCancelCurrentROI}
              disabled={!isMarking || isSaving}
              className="px-[2vw] py-[1vw] rounded-lg bg-red-500 shadow-black shadow-sm text-white text-title hover:scale-102 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ViewClassroom({
  open,
  onClose,
  roomId,
  roomName,
  relayPin,
  onRoomDeleted,
}) {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const navigate = useNavigate();
  const { isServerUp, setIsServerUp } = useServerStatus();
  const { addActivity } = useActivity();
  const { getDeviceState, setDeviceState } = useDeviceState();
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [lightsOn, setLightsOn] = useState(false);
  const [fansOn, setFansOn] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const videoRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [openDevices, setOpenDevices] = useState(false);
  const streamRef = useRef(null);
  const { getStream, startCamera, startFrameCapture } = useCamera();
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    async function loadConnectedDevice() {
      if (!openDevices || !roomId) return;

      try {
        const devices = await getDevice(roomId);

        if (devices.length > 0) {
          setConnectedDevice(devices[0]);
        } else {
          setConnectedDevice(null);
        }
      } catch (error) {
        console.error("Failed to load connected device:", error);
        setConnectedDevice(null);
      }
    }

    loadConnectedDevice();
  }, [openDevices, roomId]);

  useEffect(() => {
    if (
      connectedDevice &&
      selectedCamera &&
      selectedCamera.label === connectedDevice.device_label
    ) {
      setSelectedCamera(null);
    }
  }, [connectedDevice, selectedCamera]);

  const availableDeviceOptions = cameras.filter((cam) => {
    if (!connectedDevice) return true;
    return cam.label !== connectedDevice.device_label;
  });

  //! Load device states from context when modal opens
  //! Bali ito yung for electronic devices
  useEffect(() => {
    if (open && roomId) {
      const { lightsOn: savedLightsOn, fansOn: savedFansOn } =
        getDeviceState(roomId);
      setLightsOn(savedLightsOn);
      setFansOn(savedFansOn);
    }
  }, [open, roomId]);

  //! Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setLightsOn(false);
      setFansOn(false);
      setIsDeleting(false);
    }
  }, [open]);

  //! This gets all the available cameras from the browser
  //! and list them as options to connect to the classroom
  useEffect(() => {
    async function getCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoInputs = devices.filter(
          (device) => device.kind === "videoinput",
        );

        setCameras(videoInputs);
      } catch (err) {
        console.error("Error getting cameras:", err);
      }
    }

    getCameras();
  }, []);

  //! This updates the video feed whenever the selected camera changes or when the modal is opened
  //! Restore and attach room stream when modal opens or page refreshes
  useEffect(() => {
    async function ensureRoomStream() {
      if (!open || !roomId || !videoRef.current || !cameras.length) return;

      let stream = getStream(roomId);

      // After refresh, CameraContext memory is empty, so rebuild from saved device
      if (!stream) {
        try {
          const devices = await getDevice(roomId);

          if (!devices.length) {
            console.warn("No saved device found for room:", roomId);
            videoRef.current.srcObject = null;
            return;
          }

          const savedDevice = devices[0];

          const matchedCamera = cameras.find(
            (cam) => cam.label === savedDevice.device_label,
          );

          if (!matchedCamera) {
            console.warn(
              "No matching browser camera found for saved device:",
              savedDevice.device_label,
            );
            videoRef.current.srcObject = null;
            return;
          }

          await startCamera(roomId, matchedCamera.deviceId);
          await startFrameCapture(roomId);

          stream = getStream(roomId);
        } catch (error) {
          console.error("Failed to restore room stream:", error);
          videoRef.current.srcObject = null;
          return;
        }
      }

      videoRef.current.srcObject = stream || null;

      if (stream) {
        console.log("ATTACHED STREAM FOR ROOM:", roomId);
      } else {
        console.warn("No stream found for room:", roomId);
      }
    }

    ensureRoomStream();

    const handleDeviceAdded = async (data) => {
      if (data.device_location !== roomId) return;
      await ensureRoomStream();
    };

    socket.on("deviceAdded", handleDeviceAdded);

    return () => {
      socket.off("deviceAdded", handleDeviceAdded);
    };
  }, [open, roomId, cameras, getStream, startCamera, startFrameCapture]);

  //! This handles the camera stream whenever a new camera is selected
  useEffect(() => {
    async function startCamera() {
      if (!selectedCamera) return;

      try {
        // stop previous stream FIRST
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCamera.deviceId },
          },
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedCamera]);

  //! This handles adding the camera to the classroom in the database
  const handleAddCamera = async () => {
    try {
      if (!selectedCamera) {
        toast.error("Please select a camera first");
        return;
      }

      const res = await addCamera({
        device_location: roomId,
        device_type: "Camera",
        device_label: selectedCamera.label,
      });

      await startCamera(roomId, selectedCamera.deviceId);
      await startFrameCapture(roomId);

      const stream = getStream(roomId);
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }

      toast.success(res.message);
      setOpenDevices(false);
    } catch (error) {
      if (handleServerDown(error, setIsServerUp, navigate)) return;
      toast.error(error.response?.data?.message || "Something failed");
    }
  };

  const handleClickOpen = () => {
    setOpenDevices(true);
  };

  const handleClose = () => {
    setOpenDevices(false);
  };

  const handleRemoveClassroom = async () => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to remove "${roomName}"? This action cannot be undone.`,
    );

    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      await deleteRoom(roomId);

      if (onRoomDeleted) {
        onRoomDeleted(roomId);
      }

      addActivity(roomName, "removed");
      toast.success("Classroom removed successfully");
      onClose();
    } catch (error) {
      setIsDeleting(false);

      if (handleServerDown(error, setIsServerUp, navigate)) return;

      const message =
        error.response?.data?.message || "Failed to remove classroom";
      toast.error(message);
    }
  };

  const toggleLights = async () => {
    const newState = !lightsOn;
    console.log("[ViewClassroom] toggleLights called - newState:", newState, "roomId:", roomId, "roomName:", roomName);
    setLightsOn(newState);
    setDeviceState(roomId, newState, fansOn);
    const action = newState ? "turned_on" : "turned_off";
    if (relayPin == null) {
      toast.error("No relay pin assigned for this room");
      return;
    }
    console.log("[ViewClassroom] Device command for lights:", {
      command: newState ? `PIN_${relayPin}_ON` : `PIN_${relayPin}_OFF`,
    });

    try {
      await turnOnDevice({
        command: newState ? `PIN_${relayPin}_ON` : `PIN_${relayPin}_OFF`,
      });
      console.log("[ViewClassroom] Device command succeeded for lights");
    } catch (deviceErr) {
      console.error("[ViewClassroom] Device command failed for lights:", deviceErr);
      toast.error(`Failed to control device: ${deviceErr.message}`);
    }

    try {
      console.log("[ViewClassroom] Adding activity for lights:", roomName, action);
      addActivity(roomName, action, "lights");

      const res = await recordActivity({
        room_id: roomId,
        activity_message: `${roomName} lights ${newState ? "turned on" : "turned off"}`,
      });

      console.log("[ViewClassroom] recordActivity response for lights:", res);
      toast.success(newState ? "Lights turned on" : "Lights turned off");
    } catch (activityErr) {
      console.error("[ViewClassroom] Failed to record activity for lights:", activityErr);
      toast.error("Action completed but failed to log activity");
    }
  };

  const toggleFans = async () => {
    const newState = !fansOn;
    console.log("[ViewClassroom] toggleFans called - newState:", newState, "roomId:", roomId, "roomName:", roomName);
    setFansOn(newState);
    setDeviceState(roomId, lightsOn, newState);
    const action = newState ? "turned_on" : "turned_off";
    if (relayPin == null) {
      toast.error("No relay pin assigned for this room");
      return;
    }

    try {
      await turnOnDevice({
        command: newState ? `PIN_${relayPin}_ON` : `PIN_${relayPin}_OFF`,
      });
      console.log("[ViewClassroom] Device command succeeded for fans");
    } catch (deviceErr) {
      console.error("[ViewClassroom] Device command failed for fans:", deviceErr);
      toast.error(`Failed to control device: ${deviceErr.message}`);
    }

    try {
      console.log("[ViewClassroom] Device command for fans:", {
        command: newState ? `PIN_${relayPin}_ON` : `PIN_${relayPin}_OFF`,
      });
      console.log("[ViewClassroom] Adding activity for fans:", roomName, action);
      addActivity(roomName, action, "fans");

      const res = await recordActivity({
        room_id: roomId,
        activity_message: `${roomName} fans ${newState ? "turned on" : "turned off"}`,
      });

      console.log("[ViewClassroom] recordActivity response for fans:", res);

      toast.success(newState ? "Fans turned on" : "Fans turned off");
    } catch (activityErr) {
      console.error("[ViewClassroom] Failed to record activity for fans:", activityErr);
      toast.error("Action completed but failed to log activity");
    }
  };

  if (!open) return null;

  const ToggleSwitch = styled((props) => (
    <Switch
      focusVisibleClassName=".Mui-focusVisible"
      disableRipple
      {...props}
    />
  ))(({ theme }) => ({
    width: 50,
    height: 26,
    padding: 0,
    "& .MuiSwitch-switchBase": {
      padding: 0,
      margin: 2,
      transitionDuration: "300ms",
      "&.Mui-checked": {
        transform: "translateX(24px)",
        color: "#fff",
        "& + .MuiSwitch-track": {
          backgroundColor: "#A7A7A4",
          opacity: 1,
          border: 0,
          ...theme.applyStyles("dark", {
            backgroundColor: "#A7A7A4",
          }),
        },
        "&.Mui-disabled + .MuiSwitch-track": {
          backgroundColor: "#A7A7A4",
        },
      },
      "&.Mui-focusVisible .MuiSwitch-thumb": {
        color: "#33cf4d",
        border: "6px solid #fff",
      },
      "&.Mui-disabled .MuiSwitch-thumb": {
        color: theme.palette.grey[100],
        ...theme.applyStyles("dark", {
          color: theme.palette.grey[600],
        }),
      },
      "&.Mui-disabled + .MuiSwitch-track": {
        opacity: 0.7,
        ...theme.applyStyles("dark", {
          opacity: 0.3,
        }),
      },
    },
    "& .MuiSwitch-thumb": {
      boxSizing: "border-box",
      width: 22,
      height: 22,
    },
    "& .MuiSwitch-track": {
      borderRadius: 26 / 2,
      backgroundColor: "#A7A7A4",
      boxShadow:
        "inset 1px 2px 2px rgba(0, 0, 0, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.2)",
      opacity: 1,
      transition: theme.transitions.create(["background-color"], {
        duration: 500,
      }),
      ...theme.applyStyles("dark", {
        backgroundColor: "#39393D",
      }),
    },
  }));

  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal container */}
      <section className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-[#DFDEDA] shadow-black/70 shadow-lg w-[60%] h-[80%] min-h-0 rounded-lg">
          <div className="pointer-events-auto rounded-lg overflow-hidden w-full h-full flex flex-col">
            {/* Header */}
            <div className=" px-8 py-6 flex items-center justify-between">
              <h2 className="text-title font-bold text-[#4F4F4F]">
                {roomName} Live Feed
              </h2>
              <button
                onClick={onClose}
                className="cursor-pointer hover:scale-110 transition-transform duration-150 p-2 rounded-full hover:bg-black/10"
              >
                <X size={24} color="#4F4F4F" />
              </button>
            </div>

            {/* Content area - blank for now */}
            <div className="flex w-full h-full flex-col gap-6 px-8 py-5 min-h-0">
              {/* Content will be added here */}
              <div className="shadow-inner-neumorphic p-5 flex justify-center items-center w-full h-[65%] rounded-lg">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                  onClick={() => {
                    console.log("CLICKED VIDEO");
                    setSelectedRoom(roomId);
                  }}
                />
              </div>
              <div className="shadow-inner-neumorphic flex flex-row p-5 gap-5 items-center justify-between w-full h-[15%] rounded-lg">
                <button
                  onClick={handleRemoveClassroom}
                  disabled={isDeleting}
                  className="w-full text-subtitle primary-text shadow-black/40 shadow-md px-10 py-6 rounded-2xl cursor-pointer hover:bg-[#b1b1b1] hover:scale-101 transition-transform duration-300 flex items-center justify-center gap-3 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={20} />
                  {isDeleting ? "Removing..." : "Remove Classroom"}
                </button>
                <button
                  onClick={toggleLights}
                  className={`w-full text-subtitle shadow-black/40 shadow-md px-10 py-6 rounded-2xl cursor-pointer hover:scale-101 transition-all duration-300 flex items-center justify-center gap-3 whitespace-nowrap ${
                    lightsOn
                      ? "bg-[#A1A2A6] text-black"
                      : "primary-text hover:bg-[#b1b1b1]"
                  }`}
                >
                  {lightsOn ? (
                    <ToggleRight size={25} />
                  ) : (
                    <ToggleLeft size={25} />
                  )}
                  Manual Lights
                </button>
                <button
                  onClick={toggleFans}
                  className={`w-full text-subtitle shadow-black/40 shadow-md px-10 py-6 rounded-2xl cursor-pointer hover:scale-101 transition-all duration-300 flex items-center justify-center gap-3 whitespace-nowrap ${
                    fansOn
                      ? "bg-[#A1A2A6] text-black"
                      : "primary-text hover:bg-[#b1b1b1]"
                  }`}
                >
                  {fansOn ? (
                    <ToggleRight size={25} />
                  ) : (
                    <ToggleLeft size={25} />
                  )}
                  Manual Fans
                </button>
              </div>

              <div className="flex flex-row justify-end gap-5 w-full h-[10%]">
                <button className="w-fit bg-[#A1A2A6] text-subtitle secondary-text shadow-outside-dropshadow px-10 py-6 rounded-2xl cursor-pointer hover:bg-[#b1b1b1] hover:scale-101 transition-transform duration-300">
                  View Devices
                </button>
                <button
                  onClick={handleClickOpen}
                  className="w-fit bg-[#A1A2A6] text-subtitle secondary-text shadow-outside-dropshadow px-10 py-6 rounded-2xl cursor-pointer hover:bg-[#b1b1b1] hover:scale-101 transition-transform duration-300"
                >
                  Add Sensor
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={openDevices}
        onClose={handleClose}
        PaperComponent={PaperComponent}
        aria-labelledby="draggable-dialog-title"
        PaperProps={{
          className: "w-[60vw] h-[60vh]",
          sx: {
            borderRadius: "16px",
            background: "#DFDEDA",
          },
        }}
      >
        <section className="w-full h-full flex flex-col">
          <div
            className="w-full shadow-lg shadow-gray h-fit p-3 flex flex-row items-center justify-between cursor-grab active:cursor-grabbing"
            id="draggable-dialog-title"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={handleClose}
                className="cursor-pointer hover:-translate-x-1 transition-all duration-150 "
              >
                <ChevronLeft size={30} color="#4F4F4F" />
              </button>
              <h1 className="text-title">Sensors</h1>
            </div>
          </div>
          <div className="w-full border-b border-[#C8C8C8] h-fit px-5 py-3 flex flex-col gap-3">
            <h2 className="text-title font-medium">Connected Device</h2>

            {connectedDevice ? (
              <div className="flex items-center gap-3 rounded-xl bg-[#d7d6d2] px-4 py-3 border border-[#C8C8C8]">
                <img
                  src={Small_Logo}
                  alt="connected cam"
                  className="w-10 aspect-auto"
                />
                <div className="flex flex-col">
                  <p className="text-subtitle font-medium">
                    {connectedDevice.device_label || "Unknown Camera"}
                  </p>
                  <p className="text-sm text-[#666]">
                    Connected to this classroom
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[#777] text-subtitle">
                No connected device yet
              </p>
            )}
          </div>
          <div className="w-full h-fit px-5 py-3 flex flex-col">
            <h2 className="text-title font-medium">Available Devices</h2>
          </div>
          <div className="w-full h-full flex flex-col  overflow-y-scroll px-10 py-5">
            <ul className="flex flex-col gap-5">
              {availableDeviceOptions.length > 0 ? (
                availableDeviceOptions.map((cam) => (
                  <div
                    key={cam.deviceId}
                    className={`flex items-center gap-2 text-subtitle cursor-pointer rounded-xl px-4 py-3 transition-all duration-200 border ${
                      selectedCamera?.deviceId === cam.deviceId
                        ? "bg-[#bfc0c3] border-[#4F4F4F] shadow-md scale-[1.01]"
                        : "hover:bg-[#d7d6d2] border-transparent"
                    }`}
                    onClick={() => {
                      setSelectedCamera(cam);
                    }}
                  >
                    <img
                      src={Small_Logo}
                      alt="cam"
                      className="w-10 aspect-auto"
                    />
                    <li>{cam.label || "Unknown Camera"}</li>
                  </div>
                ))
              ) : (
                <p className="text-[#777] text-subtitle">
                  No available devices
                </p>
              )}
            </ul>
          </div>
          <button
            onClick={handleAddCamera}
            className="w-fit mx-2 my-3 bg-[#A1A2A6] text-subtitle secondary-text shadow-outside-dropshadow px-8 py-4 rounded-2xl cursor-pointer hover:bg-[#b1b1b1] hover:scale-101 transition-transform duration-300"
          >
            Connect
          </button>
        </section>
      </Dialog>
      {selectedRoom && (
        <VideoModal
          room={selectedRoom}
          roomName={roomName}
          stream={getStream(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
        />
      )}
      {/* <Toaster richColors expand position="bottom-right" /> */}
    </div>
  );
}
