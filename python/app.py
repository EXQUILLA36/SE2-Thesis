from fastapi import FastAPI
from ultralytics import YOLO
import uvicorn
import cv2

app = FastAPI()
model = YOLO("./model/yolov8n.pt")

@app.get("/detect")
def detect_objects(image_path: str):
    results = model(image_path)
    annotated_frame = results[0].plot()
    output_path = "./results/annotated_image.jpg"
    cv2.imwrite(output_path, annotated_frame)
    return {"message": "Detection complete", "output_path": output_path}