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
A0 mực nước bể | A1 mực nước bình dự trữ | A2 đục bể | A3 đục bình dự trữ | A4 pH
D7 relay bơm | D8 relay đèn hồ | D12 relay máy lọc
D9 LED nước | D10 LED đục | D11 LED pH (mỗi LED nối điện trở 220Ω)

## Ngưỡng cảnh báo (sửa ở đầu app.js và file .ino)
Nước thấp < 20% | Đục > 60% | pH < 6.5 hoặc > 8.0
