# Bể cá thông minh – Web + Arduino

## Cách chạy giao diện web (không cần cài gì nhiều)
Cách 1 – Python (khuyên dùng):
    cd aquarium
    python -m http.server 8000
Rồi mở Chrome/Edge: http://localhost:8000

Cách 2 – VS Code: cài extension "Live Server", chuột phải index.html -> Open with Live Server.

Lưu ý: mở bằng http://localhost (không mở file:// trực tiếp) để đăng nhập và kết nối Arduino hoạt động.

## Chế độ mô phỏng (chưa có mạch)
Đăng ký -> đăng nhập -> kéo các thanh trượt "Mô phỏng cảm biến" để thử cảnh báo, đổi màu nước, bơm, máy lọc.

## Nối Arduino thật
1. Mở arduino/aquarium/aquarium.ino bằng Arduino IDE, chọn board UNO, bấm Upload.
2. Đóng Serial Monitor (nếu đang mở) – chỉ 1 chương trình dùng cổng COM một lúc.
3. Trên web bấm "Kết nối Arduino" -> chọn cổng COM -> Connect.
4. Dữ liệu cảm biến sẽ hiện thật; nút đèn gửi lệnh L1/L0 xuống Arduino.

## Sơ đồ chân
A0 mực nước bể | A1 mực nước bình dự trữ | A2 đục bể chính (bình dự trữ KHÔNG đo đục) | A4 pH
D7 relay bơm | D8 relay đèn hồ
D9 LED nước | D10 LED đục | D11 LED pH (mỗi LED nối điện trở 220Ω)

## Ngưỡng cảnh báo (sửa ở đầu app.js và file .ino)
Nước thấp < 20% | Đục ≥ 40% | pH < 6.5 hoặc > 8.0

## Giao diện & âm thanh
- Giao diện hoạt hình dưới biển; cá bơi qua – bơi lại, bọt nước nổi lên, rong biển đung đưa.
- Bấm nút / bấm vào bể -> gợn sóng + bọt nước nổi lên + tiếng bọt.
- pH đổi -> màu nước đổi liên tục (vàng xanh -> xanh dương -> tím). Độ đục tăng -> nước ngả nâu, cá mờ dần.
- Nước bể xuống thấp -> mực nước tụt thật sự; dưới 8% là cạn, cá nằm thoi thóp, đáy nứt.
- Khi bơm chạy: có vòi nước đổ vào bể và âm thanh bơm. Nút "Âm thanh" ở góc trên để bật/tắt (nhớ lựa chọn).
- Trình duyệt chỉ cho phát tiếng sau khi bạn bấm vào trang ít nhất một lần.
