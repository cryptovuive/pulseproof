# Kế hoạch hackathon chi tiết — PulseProof

## 1. Tóm tắt thể lệ bắt buộc

| Hạng mục | Quy định | PulseProof đáp ứng |
|---|---|---|
| Thời gian | Mở 24/06/2026 15:00 UTC; đóng 19/07/2026 23:59 UTC; công bố dự kiến 29/07/2026 15:00 UTC | Có checklist bàn giao trước deadline |
| Giải thưởng | 10,000 / 4,000 / 2,000 USDT | Không phụ thuộc logic sản phẩm |
| Đội | 1–3 người, đủ 18 tuổi, hợp pháp tại nơi cư trú, có team lead | Cần người dùng tự xác nhận |
| Sản phẩm | Live mainnet/devnet, hoạt động trong trận; không chấp nhận mockup | Web/API chạy thật, replay chỉ là fallback có nhãn |
| TxLINE | Phải dùng TxLINE như live input | Fixture, score snapshot, historical score, stat-validation |
| Solana | Đăng ký/subscription qua Solana | TxLINE subscription on-chain + wallet sign-in + PulseProof program |
| Video | Loom/YouTube tối đa 5 phút; bắt buộc để qua vòng đầu | Kịch bản trong `DEMO_SCRIPT.md` |
| Truy cập | Link website hoạt động hoặc API endpoint để judge test | `/`, `/api/health`, `/api/matches` |
| Repo | Public repo | Cần tạo repo public trước khi nộp |
| Tài liệu | Ý tưởng, business/technical highlights, danh sách endpoint TxLINE | `README`, `ARCHITECTURE`, `SUBMISSION` |
| Feedback | Điều thích và friction khi dùng TxLINE | Có mẫu thật trong `SUBMISSION.md`, phải chỉnh theo trải nghiệm thực |
| Judge không trả phí | Không được bắt judge mua token, ví, subscription hay dịch vụ | App xem được không cần ví; replay test miễn phí; wallet là luồng bonus |

## 2. Những điều dễ bị loại

1. **Chỉ có pitch/mockup:** PulseProof có backend route, SSE, chữ ký, transaction builder và contract source thật.
2. **Không có video ≤5 phút:** phải quay rõ problem → live/replay flow → TxLINE backend → Solana claim.
3. **Đưa API token vào frontend/repo:** tuyệt đối chỉ đặt `TXLINE_API_TOKEN` ở server environment.
4. **Bắt judge tạo ví hoặc trả gas để hiểu sản phẩm:** trải nghiệm chính phải xem được không cần ví; phần claim có thể dùng ví devnet do đội chuẩn bị trong video.
5. **Dùng logo/brand FIFA:** trải nghiệm trận đấu chỉ dùng tên quốc gia, initials và hình khối tự tạo. Riêng mục lưu trữ linh vật dùng ảnh báo chí chính thức cho bộ ba 2026 kèm nguồn trực tiếp, dòng © FIFA và tuyên bố không liên kết; không dùng linh vật tự chế hoặc ngụ ý tài trợ.
6. **Dữ liệu:** không dump, bán, chia sẻ hoặc tạo API cạnh tranh từ raw TxLINE data. Chỉ biến đổi dữ liệu thành UI sản phẩm; bằng chứng chỉ trả digest.
7. **Cá cược trái phép:** không stakes, odds-to-money, deposit, payout, token thưởng có giá trị, random prize hoặc lời hứa lợi nhuận.
8. **AI ownership:** brief có câu “AI agents” nhưng T&C pháp lý yêu cầu người thật và cấm bài bị materially controlled bởi bot. Người tham gia phải tự review, phát triển thêm, hiểu toàn bộ code, lưu dev log và tự nộp.
9. **Project không original trong thời gian hackathon:** giữ lịch sử commit, ghi nguồn thư viện, ngày bắt đầu và phần tự làm.
10. **Judge không test được:** deployment phải có health check; replay không cần token/ví; chuẩn bị video backup.

## 3. Vấn đề thực tế

Fan xem bóng đá thường vừa xem màn hình lớn vừa cầm điện thoại, nhưng second-screen hiện tại chủ yếu là bảng tỷ số khô, feed bình luận ồn hoặc betting UI. Ba khoảng trống thực tế:

- Fan phổ thông khó hiểu “trận đấu đang đổi chiều vì sao” từ raw stats.
- Watch party từ xa thiếu một nhịp chung theo đúng sự kiện trên sân.
- Kỷ niệm số của fan thường chỉ là screenshot/social post, không có receipt chống sửa hoặc claim trùng.

## 4. Ý tưởng sản phẩm

**PulseProof** biến mỗi trận thành một live pulse:

1. TxLINE cung cấp fixture, score/action và sequence.
2. Backend chuẩn hóa action thành một “moment” dễ đọc: goal, card, corner, VAR, half-time, final.
3. UI cập nhật score, momentum, timeline và watch-room prompt theo trận.
4. Fan kết nối ví, chọn những moment họ thực sự chứng kiến.
5. Server kiểm tra moment lại từ TxLINE; với goal/card/corner/final, gọi stat-validation và băm response proof.
6. Server băm validation response thành `evidenceHash`, ký attestation hết hạn sau 5 phút và ràng buộc wallet + fixture + moment + evidence + points + badge.
7. Solana program kiểm tra Ed25519 instruction, tạo receipt PDA chống replay, cộng điểm và badge vào Fan Pass.

“Điểm” là reputation không chuyển nhượng và không quy đổi tiền. Value nằm ở fan identity, loyalty, community segmentation và sponsor activation—không phải đầu cơ.

## 5. Persona và user journey

### Persona A — fan casual

- Mở link, không cần ví.
- Thấy tỷ số, phút, momentum và giải thích ngắn.
- Bấm phản ứng watch room.
- Quay lại khi notification/social link báo có moment lớn.

### Persona B — fan core

- Kết nối Phantom.
- Claim goal/VAR/final mình đã xem.
- Tích Fan Pass theo fixture.
- Dùng pass làm loyalty signal cho community hoặc partner.

### Persona C — community host/brand

- Tạo watch room theo club/country.
- Xem cohort: match attendance, moments claimed, retention.
- Tặng quyền lợi off-chain (discount, access, priority), không gắn vào giá token.

## 6. Từng phần sản phẩm

### A. Match scoreboard

- Fixture ID và stage lấy từ TxLINE fixture snapshot.
- Score/minute/phase từ score snapshot hoặc historical record.
- Trạng thái nguồn hiển thị rõ: `TxLINE live`, `TxLINE historical` hoặc `Demo replay`.
- Không giả vờ “LIVE” khi đang replay.

### B. Match pulse

- Momentum là presentation metric, không phải TxODDS odds và không dùng để đặt cược.
- Chỉ dùng 8 moment gần nhất; goal weight 4, shot 2, corner 1, card -1.
- Clamp 12–88 để tránh UI khẳng định xác suất tuyệt đối.

### C. Latest signal

- Copy được tạo deterministic từ loại action, không cần AI API.
- Không bịa dữ liệu cầu thủ khi schema chưa cung cấp.
- Có nguồn/sequence trên timeline để debug.

### D. Watch room

- Câu hỏi fan sentiment, không có tiền cược hoặc giải thưởng.
- MVP đang là local interaction UI; production thêm WebSocket/database.
- Không dùng kết quả poll để claim on-chain.

### E. Proof of Watch

- `FanPass PDA = ["fan_pass", wallet, fixture_id_le]`.
- `Receipt PDA = ["receipt", wallet, moment_hash]`.
- Moment hash gồm fixture, TxLINE seq, action, timestamp.
- Attestation ràng buộc wallet + fixture + moment hash + evidence hash + points + badge + expiry.
- Receipt PDA khiến cùng moment không thể claim hai lần bởi cùng wallet.

### F. Replay

- Dùng cho demo/video khi không có trận live.
- Payload mô phỏng schema nhưng luôn `verified=false` và hiển thị `Demo-schema event`.
- Production phải ưu tiên token TxLINE nếu có.
- Không quay replay rồi nói đó là dữ liệu TxLINE thật.

## 7. API TxLINE được tích hợp

| Endpoint | Dùng ở đâu | Mục đích |
|---|---|---|
| `POST /auth/guest/start` | `lib/txline.ts` | Guest JWT, cache server 45 phút |
| `GET /api/fixtures/snapshot` | match list | Fixture ID, teams, start time, GameState |
| `GET /api/scores/snapshot/{fixtureId}` | live pulse | Snapshot score/action hiện tại |
| `GET /api/scores/historical/{fixtureId}` | replay thật/attest trận đã xong | Chuỗi update có `seq` thật |
| `GET /api/scores/stat-validation?...&statKeys=` | live claim | Kiểm tra proof payload cho stat keys 1–8 và băm response |

Stat keys soccer dùng đúng docs: goals 1/2, yellow cards 3/4, red cards 5/6, corners 7/8. Sequence luôn lấy từ response thật; không dùng `seq=0` hoặc sequence tự chế.

## 8. Business model

### B2C

- Free live second screen để tăng DAU trong giải đấu.
- Premium club rooms: themes, archive, multi-match passport, notification controls.

### B2B

- SaaS cho fan club/media/brand: branded watch room, campaign dashboard, cohort export đã aggregate.
- Sponsor activation theo moment: ví dụ discount 30 phút sau trận cho người có final badge, hoàn toàn off-chain và không cash-equivalent.
- Enterprise fee theo monthly active fans + event volume.

### Không làm

- Không bán TxLINE raw data.
- Không token hóa điểm.
- Không quảng cáo “earn”, APR, prize hoặc winnings.
- Không dùng odds để khuyến khích betting.

## 9. KPI thử nghiệm

- Activation: % visitor xem ≥3 moment.
- Live retention: thời gian mở trang trong trận.
- Wallet conversion: % fan tự nguyện kết nối ví sau khi đã thấy value.
- Claim quality: claims/match và tỷ lệ signature/transaction thành công.
- Room engagement: phản ứng mỗi 10 phút.
- Commercial: số partner tạo lại room ở trận kế tiếp.

## 10. Kế hoạch 7 ngày còn lại

### Ngày 1–2

- Lấy devnet SOL, subscribe TxLINE level 1 hoặc mainnet level 12.
- Đưa API token thật vào local server; test fixture/snapshot/historical/stat-validation.
- Chụp payload shape thật và chỉnh mapper nếu field khác.

### Ngày 3

- Cài Rust/Solana/Anchor trong WSL hoặc môi trường Linux.
- `anchor keys sync`, build, deploy devnet, initialize config bằng attestor key.
- Update program ID trong env và frontend.

### Ngày 4

- Test Phantom end-to-end: create pass + Ed25519 verify + receipt + points.
- Test duplicate claim, expired attestation, wrong wallet, wrong attestor.

### Ngày 5

- Deploy web; kiểm tra mobile, slow network, API token refresh, CORS/serverless SSE.
- Chuẩn bị judge path không ví và devnet wallet trong video.

### Ngày 6

- Quay video 4:30–4:50.
- Public repo, README, screenshots, architecture.
- Ghi feedback TxLINE thật; không copy câu mẫu nếu chưa trải nghiệm.

### Ngày 7

- Freeze feature; chỉ fix blocker.
- Test link từ incognito/mobile.
- Nộp trước deadline ít nhất 3 giờ, lưu confirmation.
