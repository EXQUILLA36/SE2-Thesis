# SE2-Thesis
## Development Plan Using YOLOv8

### Tech Stack
The tech stack that will be used is **MERN** for faster, more scalable, and reliable development.

| Tech       | Usage        | Description           |
|------------|--------------|----------------------|
| React      | Frontend     | Faster frontend development |
| Express + NodeJS | Backend | Backend API development |
| Python     | Micro Service| AI micro service for YOLOv8 detection |
| MongoDB    | Database     | Non-relational database for storing camera and detection data |

---

## Database Design

### Camera Table
Used for storing multiple camera objects for each room.

| Column       | Type    | Description           |
|--------------|---------|----------------------|
| Device_ID    | Primary | Unique camera ID     |
| Location     | String  | Camera location      |
| IP_address   | Number  | Camera IP address    |
| Device_desc  | String  | Camera description   |

---

### Detection Result Table
Stores logs of each detection.

| Column       | Type    | Description                  |
|--------------|---------|------------------------------|
| Result_ID    | Primary | Unique result ID             |
| Device_ID    | Foreign | Camera ID from Camera Table  |
| Timestamp    | DateTime| Time and date of detection   |
| Frame_Number | Number  | Frame number from video feed |
| Count        | Number  | Number of people detected    |
| Boxes        | JSON    | Bounding box coordinates     |
| Saved_Image  | Image   | Captured image of detection  |

---

### Analytics Table
Stores analytics based on detection results.

| Column                 | Type    | Description                  |
|------------------------|---------|------------------------------|
| Analytics_ID           | Primary | Unique analytics ID          |
| Result_ID              | Foreign | Detection Result ID          |
| AVG_Count_Last_Minute  | Number  | Average count in last minute |
| MAX_Count_Last_Minute  | Number  | Maximum count in last minute |
| MIN_Count_Last_Minute  | Number  | Minimum count in last minute |

---

### How to run
> Python Backend
In python, install the dependencies using <ins>pip install</ins>. Once done, you can run it thru uvicorn by doing *uvicorn app:app --reload --host 0.0.0.0 --port 8000*

> Express Backend
Similar to python, install the dependencies by typing <ins>npm install</ins>. After that, run with *npm run dev*
