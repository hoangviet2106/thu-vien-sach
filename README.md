Bắt đầu  → "build app thư viện"     (1 câu mơ hồ)
         ↓
Clarify  → 10 decisions cụ thể      (không còn assumption ẩn)
         ↓
Plan     → 6 files artifacts         (kiến trúc rõ ràng trước khi code)
         ↓
Implement→ Full TypeScript project   (AI thực thi, bạn duyệt)
         ↓
Validate → 48 tests, services 97-100% coverage
--------------------------------------------------------------
Mở Terminal và chạy từng lệnh, paste kết quả lại cho tôi:
Test 1 — Chạy toàn bộ test suite:
powershellnpm test
Test 2 — Xem coverage:
powershellnpm test -- --coverage --coverageReporters=text
Test 3 — Build production:
powershellnpm run build
