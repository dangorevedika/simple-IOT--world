# Simple IoT World 🌐⚡
**Smart IoT + Web Application for ESP8266, DHT11, 16x2 LCD & Actuator Control**

> **Developed with ❤️ by vedika and Team**  
> **Department of ETC, SB Jain Institute of Technology, Management & Research, Nagpur**

---

## 📌 Project Overview
**Simple IoT World** is an end-to-end IoT platform featuring an interactive web dashboard and NodeMCU ESP8266 microcontroller integration. The system continuously monitors ambient Temperature and Humidity via a DHT11 sensor, displays real-time telemetry on colorful SVG gauges and interactive charts, stores historical records in a lightweight JSON database, controls a 16x2 LCD display remotely, and toggles hardware actuators (LED) with instant cloud synchronization.

---

## 🛠️ Hardware Setup & Pin Mapping

| Component | NodeMCU Pin | GPIO Pin | Details |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | NodeMCU CP2102 | ESP8266 | 3.3V Logic |
| **DHT11 Sensor** | **D5** | GPIO 14 | Data pin (with pull-up resistor if discrete) |
| **16x2 LCD (I2C SDA)** | **D2** | GPIO 4 | I2C Data (Address @0x27) |
| **16x2 LCD (I2C SCL)** | **D1** | GPIO 5 | I2C Clock (Address @0x27) |
| **LED Actuator** | **D3** | GPIO 0 | Anode to D3 via 220Ω resistor, Cathode to GND |
| **Power** | Vin / 3V3 & GND | - | MicroUSB / 5V External |

---

## 💻 Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Custom CSS animations, Font Awesome 6, Chart.js 4
- **Backend:** Node.js, Express.js
- **Database:** Simple JSON file storage (`data/db.json`)
- **Microcontroller Firmware:** Arduino C++ (`esp8266/SimpleIoTWorld.ino`)
- **Hosting / Cloud Deployment:** Render (Web Service)

---

## 🚀 Web Application Features

### 1. Authentication (Page 1)
- User Registration (Name, Email, Password)
- User Sign In with session management
- Pre-configured demo account: `vedika@sbjain.edu` / `password123`

### 2. Monitoring & Records (Tab 1)
- **Section 1 - Telemetry Gauges:**
  - Dynamic Circular SVG Radial Gauges for Temperature (°C) and Humidity (%)
  - Colorful Gradient Seekbars with real-time percentage markers
  - Minimum and Maximum observed limits tracker
  - Interactive Chart.js trend curves for both metrics with live auto-refresh
- **Section 2 - Saved Records Table:**
  - Standardized columns: `# | Temperature | Humidity | Time | Date | Action (Delete)`
  - Exact format: `1 | 34 'C | 50% | HH:MM AM | DD-MM-YYYY | Delete`
  - Explicit Timezone: **Asia/Kolkata (+5:30)**
  - Full pagination (5, 10, 20 rows per page, Previous/Next navigation, direct page jumping)
  - Individual record deletion with immediate UI and database update

### 3. Smart LCD 16x2 Display (Tab 2)
- Input Field 1: Max 16 characters with character counter
- Input Field 2: Max 16 characters with character counter
- **Live 16x2 Green LCD Dot Matrix Simulator** on web page previewing characters in real time
- One-click presets: *Default*, *Welcome*, *SB Jain ETC*, *Status OK*
- Transmits text to server for ESP8266 display

### 4. LED Actuator Controller (Tab 3)
- Innovative 3D tactile switch with glowing neon bulb animation
- Toggles hardware LED connected to NodeMCU Pin D3
- Real-time cloud synchronization between browser and ESP8266

### 5. Header, Theme & Hardware Status
- Header greeting: **Welcome vedika**
- **ESP8266 ONLINE / OFFLINE Status Badge**: Live heartbeat monitor
- **Light / Dark Mode Toggle** with smooth transitions
- Built-in **Simulate Sensor** button to manually test gauges, graphs, and pagination without physical hardware!

---

## 🏃 Running Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Express Server:**
   ```bash
   npm start
   ```

3. **Open in Browser:**
   ```
   http://localhost:3000
   ```

---

## ☁️ Deployment to Render (Step-by-Step)

1. Create a repository on GitHub (e.g., `simple-iot-world`) and push this codebase:
   ```bash
   git init
   git add .
   git commit -m "Simple IoT World initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/simple-iot-world.git
   git push -u origin main
   ```

2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure settings:
   - **Name:** `simple-iot-world`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **Create Web Service**.
6. Render will provide a public URL like:
   ```
   https://simple-iot-world.onrender.com
   ```
7. Copy this URL and paste it into `renderServerUrl` in `esp8266/SimpleIoTWorld.ino`.

---

## 📟 ESP8266 Firmware Setup (Arduino IDE)

1. Open Arduino IDE.
2. Install ESP8266 board support via Boards Manager: `http://arduino.esp8266.com/stable/package_esp8266com_index.json`
3. Install required libraries via Library Manager:
   - **DHT sensor library** by Adafruit
   - **LiquidCrystal_I2C** by Frank de Brabander / Marco Schwartz
   - **ArduinoJson** by Benoît Blanchon (version 6.x or 7.x)
4. Open [esp8266/SimpleIoTWorld.ino](file:///c:/Users/hp/Desktop/VAC%20wep%20application/esp8266/SimpleIoTWorld.ino).
5. If using a personal hotspot, configure WiFi credentials:
   - `ssid = "ESP8266"`
   - `password = "12345678"`
6. Enter your deployed Render URL into `renderServerUrl`:
   ```cpp
   const char* renderServerUrl = "https://simple-iot-world.onrender.com";
   ```
7. Connect NodeMCU via USB, select board **NodeMCU 1.0 (ESP-12E Module)**, choose COM port, and click **Upload**.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Sign in (`email`, `password`) |
| `GET` | `/api/iot/status` | Current device status, online badge, readings, LED & LCD state |
| `GET` | `/api/iot/device-state` | Lightweight endpoint for ESP8266 to fetch LCD & LED state |
| `POST` | `/api/iot/data` | Send telemetry (`temperature`, `humidity`) from ESP8266 |
| `POST` | `/api/iot/led` | Toggle LED actuator (`led: true/false`) |
| `POST` | `/api/iot/lcd` | Update LCD rows (`line1`, `line2`) |
| `GET` | `/api/readings` | Paginated records list (`?page=1&limit=10`) |
| `GET` | `/api/readings/history` | Chronological readings for Chart.js curves |
| `DELETE` | `/api/readings/:id` | Delete a single record |
| `POST` | `/api/readings/simulate`| Generate a realistic test reading |

---

## 🎓 Department & Team Credits
- **Project Lead:** vedika and Team
- **Department:** Department of Electronics & Telecommunication Engineering (ETC)
- **Institution:** S. B. Jain Institute of Technology, Management & Research, Nagpur
