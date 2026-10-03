/*
 * =====================================================================
 * Project Name: Simple IoT World
 * Microcontroller: ESP8266 (NodeMCU CP2102)
 * Hardware Components:
 *   - DHT11 Sensor: Pin D5 (GPIO 14)
 *   - 16x2 LCD I2C @0x27: Pin D1 (SCL / GPIO 5) & Pin D2 (SDA / GPIO 4)
 *   - LED Actuator: Pin D3 (GPIO 0)
 *
 * Developed for: Department of ETC, SB Jain, Nagpur
 * Team: vedika and Team
 * =====================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --------------------------------------------------
// PIN DEFINITIONS
// --------------------------------------------------
#define DHTPIN D5          // NodeMCU D5 (GPIO 14)
#define DHTTYPE DHT11      // DHT 11
#define LED_PIN D3         // NodeMCU D3 (GPIO 0)

// --------------------------------------------------
// WIFI CREDENTIALS (As per specification)
// --------------------------------------------------
const char* ssid = "ESP8266";
const char* password = "12345678";

// --------------------------------------------------
// RENDER SERVER URL
// Keep it blank as requested. Replace with your deployed Render URL:
// Example: "https://simple-iot-world.onrender.com"
// --------------------------------------------------
const char* renderServerUrl = ""; 

// --------------------------------------------------
// OBJECT INITIALIZATIONS
// --------------------------------------------------
// LCD address 0x27 with 16 columns and 2 rows
// NodeMCU I2C pins: D1 = SCL (GPIO 5), D2 = SDA (GPIO 4)
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Device State variables fetched from Server
bool ledState = false;
String lcdLine1 = "SMART DISPLAY";
String lcdLine2 = "MyData";

// Helper function to print centered or clean 16-char row
void updateLcdRow(uint8_t row, String text) {
  lcd.setCursor(0, row);
  // Pad with spaces to clear any lingering characters
  while (text.length() < 16) {
    text += " ";
  }
  lcd.print(text.substring(0, 16));
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // Initialize LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize DHT Sensor
  dht.begin();

  // Initialize I2C and LCD
  Wire.begin(D2, D1); // SDA = D2 (GPIO 4), SCL = D1 (GPIO 5)
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // --------------------------------------------------
  // In Setup LCD sequence (as per specification)
  // R1: MyProject
  // R2: WELCOME
  // delay(3s)
  // --------------------------------------------------
  updateLcdRow(0, "MyProject");
  updateLcdRow(1, "WELCOME");
  delay(3000);

  // --------------------------------------------------
  // R1: CONNECTING TO
  // R2: WiFi.........
  // --------------------------------------------------
  lcd.clear();
  updateLcdRow(0, "CONNECTING TO");
  updateLcdRow(1, "WiFi.........");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  // --------------------------------------------------
  // R1: CONNECTED TO
  // R2: WiFi...SUCCESS
  // --------------------------------------------------
  lcd.clear();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
    updateLcdRow(0, "CONNECTED TO");
    updateLcdRow(1, "WiFi...SUCCESS");
  } else {
    Serial.println("\nWiFi Connection Failed/Timed out!");
    updateLcdRow(0, "WiFi STATUS");
    updateLcdRow(1, "STANDALONE MODE");
  }
  delay(2000);
}

// Function to send sensor telemetry to Server and retrieve LED/LCD state
void syncWithServer(float temperature, float humidity) {
  // If server URL is not yet configured, skip network calls
  if (strlen(renderServerUrl) == 0 || WiFi.status() != WL_CONNECTED) {
    Serial.println("Server URL not configured or WiFi offline. Operating locally.");
    return;
  }

  WiFiClientSecure client;
  // Render uses HTTPS; set insecure to allow communication without hardcoding SSL certs
  client.setInsecure();
  client.setTimeout(4000);

  HTTPClient https;
  String endpoint = String(renderServerUrl) + "/api/iot/data";

  if (https.begin(client, endpoint)) {
    https.addHeader("Content-Type", "application/json");

    // Prepare JSON payload
    StaticJsonDocument<256> doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;

    String requestBody;
    serializeJson(doc, requestBody);

    int httpCode = https.POST(requestBody);

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = https.getString();
      Serial.println("Server Response: " + response);

      // Parse JSON response containing LED & LCD updates
      StaticJsonDocument<384> resDoc;
      DeserializationError error = deserializeJson(resDoc, response);

      if (!error) {
        if (resDoc.containsKey("led")) {
          ledState = (resDoc["led"] == 1 || resDoc["led"] == true);
        }
        if (resDoc.containsKey("line1")) {
          lcdLine1 = resDoc["line1"].as<String>();
        }
        if (resDoc.containsKey("line2")) {
          lcdLine2 = resDoc["line2"].as<String>();
        }
      }
    } else {
      Serial.printf("HTTPS POST failed, error: %s (code %d)\n", https.errorToString(httpCode).c_str(), httpCode);
    }
    https.end();
  }
}

void loop() {
  // 1. Read Sensor Data from DHT11
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Fallback in case of sensor read error
  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read from DHT sensor! Using fallback values.");
    temp = 34.0;
    hum = 50.0;
  }

  Serial.printf("Sensor Data -> Temp: %.1f °C, Hum: %.1f %%\n", temp, hum);

  // 2. Fetch details & send temperature & humidity to server every cycle (~10s)
  syncWithServer(temp, hum);

  // Update hardware LED on Pin D3 based on state
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);

  // --------------------------------------------------
  // In Loop LCD Cycle (as per specification)
  // --------------------------------------------------

  // Cycle 1:
  // R1: TEMPERATURE
  // R2: 38 'C (Current Temperature)
  // delay(2s)
  lcd.clear();
  updateLcdRow(0, "TEMPERATURE");
  updateLcdRow(1, String(temp, 1) + " 'C");
  delay(2000);

  // Cycle 2:
  // R1: HUMIDITY
  // R2: 59 % (Current Humidity)
  // delay(2s)
  lcd.clear();
  updateLcdRow(0, "HUMIDITY");
  updateLcdRow(1, String((int)hum) + " %");
  delay(2000);

  // Cycle 3:
  // Get below details from Server
  // R1: SMART DISPLAY (or Field 1)
  // R2: MyData (or Field 2)
  // delay(2s)
  lcd.clear();
  updateLcdRow(0, lcdLine1);
  updateLcdRow(1, lcdLine2);
  delay(2000);

  // Cycle 4:
  // Get this from Server
  // R1: LED STATUS
  // R2: ON/OFF
  // delay(2s)
  lcd.clear();
  updateLcdRow(0, "LED STATUS");
  updateLcdRow(1, ledState ? "ON" : "OFF");
  delay(2000);
}
