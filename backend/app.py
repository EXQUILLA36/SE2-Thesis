from fastapi import FastAPI
from ultralytics import YOLO
import uvicorn
import cv2

app = FastAPI()
model = YOLO("./model/yolov8n.pt")

"""
The function `detect_objects` takes an image path as input, detects objects in the image using a
model, annotates the image with the detected objects, saves the annotated image, and returns a
message indicating detection completion along with the path to the annotated image.

:param image_path: The `image_path` parameter in the `detect_objects` function is a string that
represents the file path to the image that you want to perform object detection on. This function
takes the image located at the specified path, runs a model to detect objects in the image,
annotates the detected objects on
:type image_path: str
:return: The function `detect_objects` returns a dictionary with two keys: "message" and
"output_path". The value of "message" is "Detection complete", and the value of "output_path" is the
path where the annotated image is saved after object detection.
"""

@app.get("/detect")
def detect_objects(image_path: str):
    results = model(image_path)
    annotated_frame = results[0].plot()
    output_path = "./results/annotated_image.jpg"
    cv2.imwrite(output_path, annotated_frame)
    return {"message": "Detection complete", "output_path": output_path}

@app.get("/health")
def health_check():
    return {"status": "healthy"}