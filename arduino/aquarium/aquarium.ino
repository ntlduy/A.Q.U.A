/*
  BỂ CÁ THÔNG MINH – Arduino UNO
  Cảm biến:  A0 mực nước bể cá | A1 mực nước bình dự trữ | A2 độ đục bể cá (CHỈ đo bể chính)
             A4 pH (module PH-4502C)   (A3 không dùng – bình dự trữ không đo độ đục)
  Ngõ ra:    D7 relay bơm | D8 relay đèn hồ
             D9 LED cảnh báo nước | D10 LED cảnh báo đục | D11 LED cảnh báo pH
  Relay thường kích mức LOW -> nếu relay của bạn kích mức HIGH, đổi RELAY_ON/RELAY_OFF.
*/
const int PIN_W1 = A0, PIN_W2 = A1, PIN_T1 = A2, PIN_PH = A4;
const int PUMP = 7, LIGHT = 8, LED_W = 9, LED_T = 10, LED_PH = 11;
const int RELAY_ON = LOW, RELAY_OFF = HIGH;

// ---- HIỆU CHỈNH (đo thực tế rồi sửa) ----
const int WATER_EMPTY = 0, WATER_FULL = 600;   // giá trị analog khi cảm biến khô / ngập
const int TURB_CLEAR = 800, TURB_DIRTY = 300;  // analog khi nước trong / rất đục
const float PH_OFFSET = 0.0;                   // chỉnh bằng dung dịch pH 7
const float PH_SLOPE = 0.18;                   // V trên 1 đơn vị pH (tuỳ module)

const int LOW_WATER = 20, TURB_MAX = 40;   // đục >= 40% là cảnh báo
const float PH_MIN = 6.5, PH_MAX = 8.0;
bool pump = false, light = true;

int pct(int pin, int a, int b) { return constrain(map(analogRead(pin), a, b, 0, 100), 0, 100); }

float readPH() {
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(PIN_PH); delay(5); }
  float v = (sum / 10.0) * 5.0 / 1023.0;
  return constrain(7.0 + (2.5 - v) / PH_SLOPE + PH_OFFSET, 0, 14);
}

void setup() {
  Serial.begin(9600);
  int outs[] = {PUMP, LIGHT, LED_W, LED_T, LED_PH};
  for (int p : outs) pinMode(p, OUTPUT);
  digitalWrite(PUMP, RELAY_OFF);
  digitalWrite(LIGHT, RELAY_ON);
}

void loop() {
  // nhận lệnh từ web: L1 = bật đèn, L0 = tắt đèn
  while (Serial.available()) {
    String s = Serial.readStringUntil('\n'); s.trim();
    if (s == "L1") light = true;
    if (s == "L0") light = false;
  }
  digitalWrite(LIGHT, light ? RELAY_ON : RELAY_OFF);

  int w1 = pct(PIN_W1, WATER_EMPTY, WATER_FULL);
  int w2 = pct(PIN_W2, WATER_EMPTY, WATER_FULL);
  int t1 = pct(PIN_T1, TURB_CLEAR, TURB_DIRTY);
  float ph = readPH();

  // bơm: bể cá thấp mà bình dự trữ còn nước -> bơm; cạn cả hai -> dừng
  if (w1 < LOW_WATER && w2 >= LOW_WATER) pump = true;
  if (w1 >= 60 || w2 < LOW_WATER) pump = false;
  digitalWrite(PUMP, pump ? RELAY_ON : RELAY_OFF);

  // nước BỂ CÁ CHÍNH đục: đạt ngưỡng trở lên thì cảnh báo (không còn máy lọc)
  bool dirty = (t1 >= TURB_MAX);

  // đèn cảnh báo
  digitalWrite(LED_W, (w1 < LOW_WATER || w2 < LOW_WATER));
  digitalWrite(LED_T, dirty);
  digitalWrite(LED_PH, (ph < PH_MIN || ph > PH_MAX));

  Serial.print("{\"w1\":"); Serial.print(w1);
  Serial.print(",\"w2\":"); Serial.print(w2);
  Serial.print(",\"t1\":"); Serial.print(t1);
  Serial.print(",\"ph\":"); Serial.print(ph, 1);
  Serial.print(",\"pump\":"); Serial.print(pump);
  Serial.print(",\"light\":"); Serial.print(light);
  Serial.println("}");
  delay(1000);
}
