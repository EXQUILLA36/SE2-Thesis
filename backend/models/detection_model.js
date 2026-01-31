const mongoose = require("mongoose");

const cameraTable = mongoose.Schema({
  device_id: {
    type: String,
    required: true,
  },
  device_location: {
    type: String,
    required: true,
  },

  device_ip: {
    type: String,
    required: true,
  },
  device_description: {
    type: String,
    required: true,
  },
});

const detectionTable = mongoose.Schema(
  {
    result_id: {
      type: String,
      required: true,
    },
    device_id: {
      type: String,
      required: true,
    },
    detection_frame: {
      type: String,
      required: true,
    },
    detection_count: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const analyticsTable = mongoose.Schema(
  {
    analytics_id: {
      type: String,
      required: true,
    },
    result_id: {
      type: String,
      required: true,
    },
    avg_analytics_count: {
      type: Number,
      required: true,
    },
    max_analytics_count: {
      type: Number,
      required: true,
    },
    min_analytics_count: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const cameraModel = mongoose.model("cameraTable", cameraTable);
const detectionModel = mongoose.model("detectionTable", detectionTable);
const analyticsModel = mongoose.model("analyticsTable", analyticsTable);

module.exports = { cameraModel, detectionModel, analyticsModel };
