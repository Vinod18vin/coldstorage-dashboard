
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <DHT.h>

// ==================================================
// 1. WIFI CONFIGURATION
// ==================================================

const char* WIFI_SSID = "IOT";
const char* WIFI_PASSWORD = "IOT12345";

// ==================================================
// 2. FIREBASE CONFIGURATION
// ==================================================

const char* FIREBASE_URL =
  "https://coldstorage-4f5e4-default-rtdb.firebaseio.com";

const char* DATABASE_PATH = "/coldstorage";

// ==================================================
// 3. PIN CONFIGURATION
// ==================================================

#define DHT_PIN 4
#define DHT_TYPE DHT11

#define REED_PIN 27
#define BUZZER_PIN 2

#define OLED_SDA 21
#define OLED_SCL 22

// ==================================================
// 4. SYSTEM CONFIGURATION
// ==================================================

#define TEMP_THRESHOLD 18.0

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

const unsigned long SENSOR_INTERVAL = 2000;
const unsigned long LATEST_INTERVAL = 10000;
const unsigned long HISTORY_INTERVAL = 60000;
const unsigned long WIFI_RETRY_INTERVAL = 10000;

// Buzzer timing
const unsigned long BEEP_ON_TIME = 300;
const unsigned long BEEP_OFF_TIME = 700;

// ==================================================
// 5. OBJECTS
// ==================================================

DHT dht(DHT_PIN, DHT_TYPE);

Adafruit_SH1106G display(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  &Wire,
  -1
);

// ==================================================
// 6. SENSOR VARIABLES
// ==================================================

float temperature = NAN;
float humidity = NAN;

bool sensorOK = false;
bool doorOpen = false;
bool coldTemperature = false;

// ==================================================
// 7. TIMER VARIABLES
// ==================================================

unsigned long lastSensorRead = 0;
unsigned long lastLatestUpload = 0;
unsigned long lastHistoryUpload = 0;
unsigned long lastWiFiAttempt = 0;

unsigned long lastBuzzerUpdate = 0;

bool buzzerState = false;

// ==================================================
// 8. TIME SYNCHRONIZATION
// ==================================================

bool timeIsValid() {

  time_t now = time(nullptr);

  return now > 1700000000;
}

unsigned long getTimestamp() {

  if (!timeIsValid()) {
    return 0;
  }

  return (unsigned long)time(nullptr);
}

void initializeTime() {

  configTime(
    0,
    0,
    "pool.ntp.org",
    "time.google.com"
  );

  Serial.println("Synchronizing time...");

  unsigned long start = millis();

  while (!timeIsValid() &&
         millis() - start < 10000) {

    delay(250);
  }

  if (timeIsValid()) {
    Serial.println("Time synchronized!");
  } else {
    Serial.println("NTP synchronization pending.");
  }
}

// ==================================================
// 9. WIFI CONNECTION
// ==================================================

void connectWiFi() {

  WiFi.mode(WIFI_STA);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi");

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < 15000) {

    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("WiFi Connected!");

    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    initializeTime();

  } else {

    Serial.println("WiFi connection failed.");
    Serial.println("Will retry automatically.");
  }

  lastWiFiAttempt = millis();
}

void maintainWiFi() {

  if (WiFi.status() != WL_CONNECTED) {

    if (millis() - lastWiFiAttempt >=
        WIFI_RETRY_INTERVAL) {

      lastWiFiAttempt = millis();

      Serial.println("Reconnecting to WiFi...");

      WiFi.reconnect();
    }
  }
}

// ==================================================
// 10. DOOR OPEN BUZZER
// ==================================================

void updateBuzzer() {

  // Buzzer activates ONLY when door is OPEN

  if (doorOpen) {

    unsigned long currentMillis = millis();

    unsigned long interval =
      buzzerState ? BEEP_ON_TIME : BEEP_OFF_TIME;

    if (currentMillis - lastBuzzerUpdate >= interval) {

      lastBuzzerUpdate = currentMillis;

      buzzerState = !buzzerState;

      digitalWrite(
        BUZZER_PIN,
        buzzerState ? HIGH : LOW
      );
    }

  } else {

    // Door closed: immediately stop buzzer

    buzzerState = false;

    digitalWrite(BUZZER_PIN, LOW);

    lastBuzzerUpdate = millis();
  }
}

// ==================================================
// 11. OLED DISPLAY
// ==================================================

void updateOLED() {

  display.clearDisplay();

  display.setTextColor(SH110X_WHITE);

  // HEADER
  display.setTextSize(1);
  display.setCursor(10, 0);
  display.println("COLD STORAGE MONITOR");

  display.drawLine(0, 10, 127, 10, SH110X_WHITE);

  // TEMPERATURE
  display.setCursor(2, 14);
  display.print("TEMP:");

  display.setTextSize(2);
  display.setCursor(55, 12);

  if (sensorOK) {

    display.print(temperature, 1);
    display.print("C");

  } else {

    display.print("--");
  }

  display.setTextSize(1);

  // HUMIDITY
  display.setCursor(2, 33);
  display.print("HUMIDITY: ");

  if (sensorOK) {

    display.print(humidity, 0);
    display.print("%");

  } else {

    display.print("--");
  }

  display.drawLine(0, 43, 127, 43, SH110X_WHITE);

  // TEMPERATURE STATUS
  display.setCursor(2, 46);

  if (!sensorOK) {

    display.print("STATUS: SENSOR ERROR");

  } else if (coldTemperature) {

    display.print("STATUS: COLD TEMP");

  } else {

    display.print("STATUS: TEMP HIGH");
  }

  // DOOR STATUS
  display.setCursor(2, 56);
  display.print("DOOR: ");
  display.print(doorOpen ? "OPEN" : "CLOSED");

  display.display();
}

// ==================================================
// 12. SENSOR READING
// ==================================================

void readSensors() {

  float newTemperature = dht.readTemperature();
  float newHumidity = dht.readHumidity();

  if (isnan(newTemperature) ||
      isnan(newHumidity) ||
      newTemperature < 0 ||
      newTemperature > 50 ||
      newHumidity < 0 ||
      newHumidity > 100) {

    sensorOK = false;

    Serial.println("DHT11 SENSOR ERROR");

  } else {

    temperature = newTemperature;
    humidity = newHumidity;

    sensorOK = true;

    coldTemperature =
      (temperature <= TEMP_THRESHOLD);
  }

  // NO reed switch with INPUT_PULLUP
  // LOW  = Door CLOSED
  // HIGH = Door OPEN

  doorOpen = (digitalRead(REED_PIN) == HIGH);

  updateOLED();
}

// ==================================================
// 13. SERIAL MONITOR
// ==================================================

void printSerialData() {

  Serial.println();
  Serial.println("================================");
  Serial.println("       COLD STORAGE MONITOR");
  Serial.println("================================");

  if (sensorOK) {

    Serial.print("Temperature : ");
    Serial.print(temperature, 1);
    Serial.println(" C");

    Serial.print("Humidity    : ");
    Serial.print(humidity, 0);
    Serial.println(" %");

    Serial.print("Threshold   : ");
    Serial.print(TEMP_THRESHOLD, 1);
    Serial.println(" C");

    Serial.print("Temp Status : ");

    Serial.println(
      coldTemperature ? "COLD TEMP" : "TEMP HIGH"
    );

  } else {

    Serial.println("Temperature : SENSOR ERROR");
    Serial.println("Humidity    : SENSOR ERROR");
    Serial.println("Temp Status : UNAVAILABLE");
  }

  Serial.print("Door Status : ");
  Serial.println(doorOpen ? "OPEN" : "CLOSED");

  Serial.print("Buzzer      : ");
  Serial.println(doorOpen ? "ACTIVE" : "OFF");

  Serial.print("WiFi Status : ");

  Serial.println(
    WiFi.status() == WL_CONNECTED ?
    "CONNECTED" : "DISCONNECTED"
  );

  Serial.println("================================");
}

// ==================================================
// 14. GENERATE FIREBASE JSON
// ==================================================

String createJSON() {

  unsigned long timestamp = getTimestamp();

  String alarm;

  if (!sensorOK) {

    alarm = "SENSOR_FAULT";

  } else if (temperature > TEMP_THRESHOLD) {

    alarm = "TEMP_HIGH";

  } else if (doorOpen) {

    alarm = "DOOR_OPEN";

  } else {

    alarm = "OK";
  }

  String json = "{";

  json += "\"ts\":" + String(timestamp) + ",";

  json += "\"temp\":";

  if (sensorOK) {
    json += String(temperature, 1);
  } else {
    json += "null";
  }

  json += ",\"hum\":";

  if (sensorOK) {
    json += String(humidity, 0);
  } else {
    json += "null";
  }

  json += ",\"door\":";
  json += String(doorOpen ? 1 : 0);

  // Placeholder: power monitoring not installed.

  json += ",\"mains\":1";

  // Battery monitoring not installed.

  json += ",\"batt\":null";

  json += ",\"alarm\":\"";
  json += alarm;
  json += "\"";

  json += "}";

  return json;
}

// ==================================================
// 15. FIREBASE HTTPS UPLOAD
// ==================================================

bool firebaseRequest(
  const String& url,
  const String& payload,
  bool isHistory
) {

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("Firebase skipped: WiFi offline");

    return false;
  }

  WiFiClientSecure client;

  // Prototype only: certificate verification disabled.
  // Replace with certificate validation before production.

  client.setInsecure();

  HTTPClient https;

  https.setTimeout(10000);

  if (!https.begin(client, url)) {

    Serial.println("HTTPS initialization failed!");

    return false;
  }

  https.addHeader(
    "Content-Type",
    "application/json"
  );

  int httpCode;

  if (isHistory) {

    httpCode = https.POST(payload);

  } else {

    httpCode = https.PUT(payload);
  }

  String response = https.getString();

  if (httpCode >= 200 && httpCode < 300) {

    Serial.print("Firebase upload successful: ");
    Serial.println(httpCode);

    if (isHistory) {

      Serial.print("History ID: ");
      Serial.println(response);
    }

    https.end();

    return true;

  } else {

    Serial.print("Firebase upload failed: ");
    Serial.println(httpCode);

    Serial.println(response);

    https.end();

    return false;
  }
}

// ==================================================
// 16. UPLOAD LATEST READING
// ==================================================

void uploadLatest() {

  if (!timeIsValid()) {

    Serial.println("Waiting for valid timestamp.");

    return;
  }

  String url =
    String(FIREBASE_URL) +
    DATABASE_PATH +
    "/latest.json";

  String payload = createJSON();

  Serial.println("Uploading latest reading...");

  firebaseRequest(
    url,
    payload,
    false
  );
}

// ==================================================
// 17. UPLOAD HISTORY
// ==================================================

void uploadHistory() {

  if (!timeIsValid()) {

    Serial.println("History skipped: time unavailable.");

    return;
  }

  String url =
    String(FIREBASE_URL) +
    DATABASE_PATH +
    "/history.json";

  String payload = createJSON();

  Serial.println("Uploading history reading...");

  firebaseRequest(
    url,
    payload,
    true
  );
}

// ==================================================
// 18. SETUP
// ==================================================

void setup() {

  Serial.begin(115200);

  // REED SWITCH
  pinMode(REED_PIN, INPUT_PULLUP);

  // BUZZER
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // DHT11
  dht.begin();

  // OLED I2C
  Wire.begin(OLED_SDA, OLED_SCL);

  if (!display.begin(0x3C, true)) {

    Serial.println("SH1106 OLED initialization failed!");

    while (true) {
      delay(1000);
    }
  }

  // STARTUP DISPLAY
  display.clearDisplay();

  display.setTextColor(SH110X_WHITE);
  display.setTextSize(1);

  display.setCursor(15, 15);
  display.println("COLD STORAGE");

  display.setCursor(20, 30);
  display.println("MONITORING");

  display.setCursor(20, 48);
  display.println("SYSTEM STARTING");

  display.display();

  delay(1500);

  Serial.println();
  Serial.println("COLD STORAGE MONITOR");
  Serial.println("System Initialized");

  Serial.println("Firebase REST API Enabled");
  Serial.println("Door Open Buzzer Enabled");

  Serial.print("Temperature Threshold: ");
  Serial.print(TEMP_THRESHOLD);
  Serial.println(" C");

  // CONNECT WIFI
  connectWiFi();

  // INITIAL SENSOR READING
  readSensors();

  // INITIAL BUZZER CHECK
  updateBuzzer();

  printSerialData();

  // INITIAL FIREBASE UPLOAD
  if (WiFi.status() == WL_CONNECTED &&
      timeIsValid()) {

    uploadLatest();
    uploadHistory();
  }

  lastSensorRead = millis();
  lastLatestUpload = millis();
  lastHistoryUpload = millis();
}

// ==================================================
// 19. MAIN LOOP
// ==================================================

void loop() {

  // WIFI RECONNECTION
  maintainWiFi();

  // BUZZER CONTROL
  // Runs independently of sensor reading interval.

  updateBuzzer();

  // SENSOR READING EVERY 2 SECONDS

  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {

    lastSensorRead = millis();

    readSensors();

    printSerialData();
  }

  // LATEST DATA EVERY 10 SECONDS

  if (millis() - lastLatestUpload >= LATEST_INTERVAL) {

    lastLatestUpload = millis();

    uploadLatest();
  }

  // HISTORY EVERY 60 SECONDS

  if (millis() - lastHistoryUpload >= HISTORY_INTERVAL) {

    lastHistoryUpload = millis();

    uploadHistory();
  }

}
