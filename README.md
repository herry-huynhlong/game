# Thanh Vân Ký — Thiên Đạo Giám Thế

Thanh Vân Ký là game web mô phỏng một thế giới tu tiên pixel art. Bạn quan sát thế giới với vai trò Thiên Đạo, giám định vạn vật, ban cơ duyên hoặc nhập thân một cư dân để trực tiếp khám phá, giao thương và chiến đấu. Cư dân tự sinh hoạt, hành nghề, tu luyện và phản ứng với các sự kiện trong thế giới.

**v0.1.17 · Cửu Cảnh Thiên Uy** · Phaser 4, Vite, TypeScript và JavaScript · Bản đồ Tiled · Lưu cục bộ trong trình duyệt.

## Mới trong v0.1.17

- **Cửu Cảnh Thiên Uy** chuẩn hóa 9 đại cảnh giới, mỗi cảnh giới 10 tầng. NPC và yêu thú dùng chung công thức công kích, giáp và uy áp. Võ kỹ nhiều đợt va chạm chia sát thương theo ngân sách của cả lần thi triển. Các đại thần thông kiểm tra cảnh giới, độ lĩnh ngộ và linh lực.
- **Vạn Nhân Sinh Tức** mở rộng thế giới mới lên 180 hồ sơ cư dân, bổ sung sinh hoạt, nghề nghiệp, xuất hành và kinh tế địa phương. **Vạn Bảo Lâu** có chính sảnh, tầng khách quý và bí khố, cùng phiên đấu giá, ký quỹ và ký gửi.
- Khi mở bản lưu cũ, game chuyển chỉ số một lần và giữ tỷ lệ HP, linh lực, tiến độ và tài sản. Tầng 9 được giữ nguyên, trừ NPC đã có thiên kiếp ở trần tầng 9 cũ. Ngự kiếm vẫn yêu cầu từ Trúc Cơ tầng 1.
- Trong kiểm thử Chrome, Luyện Khí tầng 9 dùng ba đòn Kiếm Khí hạ yêu thú Kim Đan trước khi cân bằng. Sau sửa, cùng mục tiêu vẫn còn khoảng 1.822/1.952 HP sau bốn đòn. [Báo cáo cân bằng và kiểm thử](docs/CUU-CANH-THIEN-UY.md)

## Chạy game trên máy

Cài Node.js 22 và npm để dùng cùng phiên bản Node với GitHub Actions. Tại thư mục dự án, chạy:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mở [game tại cổng 5173](http://127.0.0.1:5173/). Trên Windows, có thể dùng `./run-game.ps1` sau khi cài dependencies nếu cần ưu tiên Node hệ thống trong `C:\Program Files\nodejs`.

Để xem bản production và chạy các bài kiểm thử trình duyệt, dùng một terminal riêng:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 5183 --strictPort
```

Mở [bản production tại cổng 5183](http://127.0.0.1:5183/).

## Bắt đầu chơi

1. Mở **Bản đồ** hoặc bấm minimap để đến Thanh Vân Thành, Thanh Vân Tông hoặc một vùng hoang dã. Kéo bản đồ để di chuyển camera và lăn chuột để đổi mức zoom.
2. Mở **Cư dân**, hoặc chọn một NPC ngay trên bản đồ, để xem hồ sơ, cảnh giới, hành trang và hoạt động. Chọn vật thể hoặc yêu thú để xem thông tin giám định tương ứng.
3. Chọn **Nhập thân** khi đủ Thần lực để điều khiển cư dân. Đứng gần quầy, cửa hang, công trình hoặc vật phẩm rơi rồi nhấn **E** để tương tác.
4. Mở **Nhật ký** để theo dõi sự kiện và **Thần lực** để xem biến động số dư. Dùng tốc độ **×1**, **×2**, **×4** hoặc **Dừng** để điều chỉnh thời gian mô phỏng.

### Điều khiển

| Thao tác | Phím hoặc chuột |
| --- | --- |
| Di chuyển camera khi quan sát | Kéo bản đồ, WASD hoặc phím mũi tên |
| Phóng bản đồ và đổi vị trí quan sát | Lăn chuột, bấm minimap |
| Đến thành, vùng Bắc, Đông, Nam hoặc rừng khi quan sát | **1** đến **5** theo thứ tự |
| Di chuyển khi nhập thân | WASD hoặc phím mũi tên |
| Chạy khi nhập thân | Giữ **Shift** |
| Đánh thường / dùng võ kỹ đã chọn | **J** / **K** |
| Tương tác, giao dịch, vào hang hoặc nhặt chiến lợi phẩm gần đó | **E** |
| Câu cá khi có cần câu và đứng ở vị trí phù hợp | **F** |
| Bật hoặc hạ ngự kiếm | **V**, cần kiếm và ít nhất Trúc Cơ tầng 1 |
| Ngắm hướng đạp gió lướt mây khi đủ điều kiện | **T** |
| Giảm tốc khi phi hành | Giữ **Ctrl** |
| Hủy ngắm hoặc thoát nhập thân | **Esc** |

## Thế giới và các hệ thống chính

| Hệ thống | Nội dung trong WorldScene |
| --- | --- |
| Bản đồ mặt đất | Thanh Vân Thành có bốn cổng, khu dân cư, phố chợ và công trình hoạt động. Phía Bắc có đường đèo. Phía Nam nối ngoại thành, Thanh Vân Cổ Đạo và Thanh Vân Tông. Phía Đông qua sông đến thảo nguyên và xa hơn là Đông Hoang. Phía Tây là các tầng rừng và Tây Hoang. [Bố cục thành](docs/CITY-REDESIGN.md) · [Thanh Vân Cổ Đạo](docs/THANH-VAN-CO-DAO.md) |
| Địa mạch và hệ sinh thái | Bản đồ mặt đất nối với hang và các tầng ngầm. Yêu thú có vùng sinh sống, lãnh địa và hành vi riêng. Linh mạch, tài nguyên, chu kỳ ngày đêm và cơ duyên tác động đến lựa chọn của cư dân. [Bản đồ ngầm](docs/DIA-MACH-THE-GIOI.md) · [Hệ sinh thái yêu thú](docs/FAUNA-ECOLOGY.md) · [Thiên tài địa bảo](docs/WEST-TREASURE-DISTRIBUTION.md) |
| Dân số và đời sống | Thế giới mới khởi tạo 180 hồ sơ, gồm 108 cư dân ban đầu và 72 người phân bố tại tám khu dân cư và điểm làm việc. Số người đang sống thay đổi theo bản lưu. Cư dân có nghề, lịch sinh hoạt, quan hệ, tuổi thọ, gia đình và tài sản. [Vạn Nhân Sinh Tức](docs/VAN-NHAN-SINH-TUC.md) · [Sinh hoạt và giao tiếp](docs/NHAN-GIAN-YEN-HOA.md) · [Xuất hành](docs/BACH-TU-XUAT-HANH.md) |
| Lao động, quyền sở hữu và luật pháp | Cư dân tìm việc, khai thác, chế tác, vận chuyển và mua bán theo nhu cầu cùng tồn kho. Quyền khai thác, hợp đồng, tiền công và vi phạm đi qua các hệ thống xã hội hiện có. [Đời sống NPC](docs/DOI-SONG-NPC.md) · [Thiện Ác Nhân Quả](docs/THIEN-AC-NHAN-QUA.md) |
| Tu luyện và thiên kiếp | NPC tích lũy tu vi, học công pháp và đột phá qua 90 tầng từ Luyện Khí đến Độ Kiếp. Đột phá đại cảnh giới lên Trúc Cơ và các cảnh giới kế tiếp đi kèm thiên kiếp. Cảnh giới và trang bị quyết định khả năng ngự kiếm. [Cửu Cảnh Thiên Uy](docs/CUU-CANH-THIEN-UY.md) · [Tu luyện](docs/WORLD-CULTIVATION.md) · [Thiên kiếp](docs/TRIBULATION-VFX.md) · [Ngự kiếm](docs/FLYING-SWORD.md) · [Đạp gió lướt mây](docs/SKY-STEP-NAVIGATION.md) |
| Chiến đấu và trang bị | Danh mục gồm 15 công pháp, 45 võ kỹ và 15 mẫu vũ khí. Vũ khí có định danh, chủ sở hữu và độ bền. Võ kỹ dùng chung hệ thống tính hiệu lực và hiển thị hiệu ứng. [Công pháp và linh bảo](docs/BACH-DAO-TRANH-MINH.md) · [Đấu pháp](docs/THIEN-DIA-DAU-PHAP.md) · [Vạn Pháp Hiển Thế](docs/VAN-PHAP-HIEN-THE.md) |
| Quyền năng Thiên Đạo | Giám định NPC, yêu thú và vật thể, ban thưởng, nhập thân, quản lý Kho Thiên Đạo và đặt cơ duyên. Nhật ký Thần lực ghi các nguồn phát sinh như đột phá và sinh diệt. [Giám định](docs/WORLD-ENTITY-INSPECTOR.md) · [Tương tác Thiên Đạo](docs/HEAVEN.INTERACTION.2.md) |

Từ ngày thứ hai, khi còn chỗ ở và thiếu ít nhất ba người so với quy mô mục tiêu, thế giới có thể đón tối đa hai người mới mỗi ngày. Nhật ký ghi nhập cư, xuất cư, lập gia đình, sinh con và thừa kế. Trẻ chọn nghề khi đủ 18 tuổi theo lịch game. Luyện đan sư và luyện khí sư mua nguyên liệu để chế tác, thương nhân chở hàng đến kho vùng và khoáng công nhận tiền từ hợp đồng.

### Vạn Bảo Các và Cửa hàng Thiên Đạo

- **Linh thạch** thuộc ví NPC và dùng cho giao thương, ký gửi, đấu giá. **Thần lực** thuộc sổ Thiên Đạo và dùng cho quyền năng hoặc mua hàng Thiên Đạo. Hai số dư vận hành độc lập.
- Chọn **Vạn Bảo Các** trong **Bản đồ**, rồi nhấp vào công trình để mở **Thiên Đạo Giám Định** và chọn **Vào bên trong**. Khi nhập thân, đến cửa và nhấn **E**. Lầu có 24 ghế chính sảnh, 6 ghế khách quý và một tầng bí khố. Khách ở hai tầng dùng chung phiên đấu giá. Các lô đủ điều kiện được ký gửi ngày 1–5, xem trước ngày 6. Ngày 7 sảnh đón khách lúc 08:00, kiểm tra khách lúc 09:00 và xử lý các lô từ 10:00. Khách cần ít nhất 100 linh thạch khả dụng.
- Giá trả được đưa vào ký quỹ. Giá cao hơn hoàn lại khoản ký quỹ của người trả trước. Lô bán thành công chịu hoa hồng 5% làm tròn xuống. Lô chưa bán quay về đúng chủ.
- Mở **Thiên Đạo** để mua vật phẩm, công pháp hoặc trang bị bằng Thần lực. Dùng **Kho Thiên Đạo** để xem món đã mua, **Ban thưởng** để chuyển cho NPC, hoặc **Tạo cơ duyên** để đặt tại một vị trí hợp lệ. NPC phải tiếp cận mới có cơ hội phát hiện.

[Kiến trúc và sơ đồ ba tầng](docs/VAN-BAO-LAU.md) · [Luồng giao dịch, điều kiện nhận vật phẩm và mô phỏng tám ngày](docs/VAN-BAO-THONG-THIEN.md)

## Lưu tiến trình

- WorldScene lưu thời gian, cư dân, tài sản, quan hệ, sự kiện và trạng thái thế giới trong `localStorage` với khóa `world-rebuild-1c-v1`. Khi nâng cấp từ v0.1.16, bản lưu hiện có được bổ sung cư dân và giữ hồ sơ đã mất, tài sản cùng số dư Thần lực.
- Dữ liệu lưu gắn với hồ sơ trình duyệt và origin gồm giao thức, tên miền và cổng. Dev cổng 5173, preview cổng 5183, HTTP và HTTPS có thể mở các bản lưu riêng. Cập nhật release trên cùng origin tiếp tục dùng dữ liệu ở trình duyệt đó. Sao lưu trước khi xóa dữ liệu trang, đổi origin hoặc chuyển máy.
- Thế giới chạy khi game đang mở và thời gian đang tiếp tục. Game không tính tiến trình ngoại tuyến khi đóng tab.
- Bản RPG ban đầu và các bản lưu Thiên Đạo cũ có luồng lưu riêng. `src/main.ts` là mã RPG cũ, còn `index.html` khởi động WorldScene hiện tại qua [src/world-rebuild.js](src/world-rebuild.js).

## Màn hình thử nghiệm và kiểm thử

Mở các trang sau khi Vite preview đang chạy:

| Màn hình | Đường dẫn |
| --- | --- |
| Võ Kỹ Các | [Xem hiệu ứng chiến đấu](http://127.0.0.1:5183/?combatGallery=1) |
| Cửu Cảnh Thiên Uy | [Combat Balance Lab](http://127.0.0.1:5183/combat-balance.html) · [Cảnh giới, sát thương và migration](docs/CUU-CANH-THIEN-UY.md) |
| Character Editor và Gallery | [Chỉnh nhân vật](http://127.0.0.1:5183/npc-xianxia-editor.html) · [Xem mẫu](http://127.0.0.1:5183/npc-xianxia-gallery.html) |
| Bộ preset Paper Doll | [Xem preset](http://127.0.0.1:5183/npc-paperdoll-presets.html) |
| Yêu thú | [Xem tạo hình](http://127.0.0.1:5183/monster-gallery.html) · [Xem di chuyển](http://127.0.0.1:5183/monster-movement.html) |
| Cảnh quan | [Vạn Lý Sơn Hà](http://127.0.0.1:5183/shanhe-preview.html) · [Đông Hoang](http://127.0.0.1:5183/east-art-gallery.html) |

[Xem Paper Doll trong WorldScene](http://127.0.0.1:5183/?paperDoll=1) dùng 24 preset và giữ cách phân bổ theo ID, gồm P09 cho tông chủ và P24 cho thành chủ. Chế độ này chỉ đọc bản lưu. Phím **C** bật lớp va chạm và **F3** mở bảng sinh thái khi cần kiểm tra bản đồ chính.

```sh
npm run test:systems
npm run validate:release
npm run build
npm run validate:release -- --dist
```

Với preview đang chạy và Chrome khả dụng, có thể kiểm tra thêm các luồng trình duyệt. Các bài dưới đây mặc định mở cổng 5183. Đặt biến môi trường `GAME_TEST_ORIGIN` nếu chạy trên origin khác.

```sh
node tests/population-life-browser.mjs --natural --target=180
node tests/martial-browser.mjs --combat-only
node tests/martial-browser.mjs --commerce
node tests/martial-browser.mjs --commerce --natural
```

Bài đo dân số hỗ trợ các mốc 108, 144, 180 và 240. Bài giao thương có một ca kiểm soát giao dịch, tải lại, ký quỹ và trao vật phẩm, cùng một ca quan sát mô phỏng tự nhiên. Trong mẫu tự nhiên tám ngày đã ghi nhận, phiên đầu hoàn trả một lô vì chưa có khách vượt kiểm tra. Tần suất NPC tự phát hiện cơ duyên qua nhiều tuần chưa có số đo. [Báo cáo dân số](docs/VAN-NHAN-SINH-TUC.md) · [Báo cáo giao thương](docs/VAN-BAO-THONG-THIEN.md)

## Mã nguồn, bản đồ và đồ họa

| Đường dẫn | Vai trò |
| --- | --- |
| [src/world-rebuild-scene.js](src/world-rebuild-scene.js) và [src/world/](src/world/) | WorldScene và các module mô phỏng, điều hướng, giao dịch, lưu dữ liệu |
| [maps/world-rebuild-1b.tmj](maps/world-rebuild-1b.tmj) | Bản đồ Tiled được WorldScene tải. [Cấu hình Vite](vite.config.js) chép bản đồ vào `dist/maps/` khi build |
| [public/assets/](public/assets/) | Sprite, atlas, tileset, hiệu ứng và tài nguyên UI dùng trực tiếp |
| [art/source/](art/source/) | File nguồn mỹ thuật, gồm các dự án Aseprite có thể chỉnh sửa và script tạo asset |
| [Pixel Bridge cho Aseprite](tools/codex-pixel-bridge/README-VI.md) · [Pixel Art Bridge](tools/pixel-art-bridge/README.md) | Quy trình tạo tài liệu nguồn, layer và frame, xuất PNG hoặc spritesheet |
| [tests/](tests/) · [docs/](docs/) | Kiểm thử hệ thống, kiểm thử trình duyệt và tài liệu từng đợt phát triển |

Khi sửa bản đồ, chỉnh layer, tileset và vùng chức năng trong Tiled rồi kiểm tra đường dẫn và collision trên bản build. Với asset có nguồn Aseprite, giữ file nguồn trong `art/source/` rồi xuất tài nguyên runtime vào `public/assets/`. Một số asset đời đầu được tạo bằng Python/Pillow qua [generate_assets.py](art/source/generate_assets.py). Pixelorama có thể dùng để chỉnh PNG.

## GitHub Actions và triển khai VPS

[Workflow build-release](.github/workflows/build-release.yml) dùng Node.js 22 và lockfile để cài dependencies, chạy system tests, kiểm tra asset và build production. Sau khi kiểm tra `dist/`, workflow đóng gói `thanh-van-ky-<tag>.tar.gz` cùng `SHA256SUMS`. Bản build có artifact trong Actions. Khi đẩy tag `v*`, workflow đính kèm gói triển khai vào GitHub Release. [GitHub Actions](https://github.com/herry-huynhlong/game/actions) · [GitHub Releases](https://github.com/herry-huynhlong/game/releases)

VPS Ubuntu chỉ tải gói đã build. Nginx phục vụ các file tĩnh và hỗ trợ SPA fallback. Cài phụ thuộc máy chủ một lần:

```bash
sudo apt-get update
sudo apt-get install -y nginx curl python3
```

Để cài hoặc cập nhật, dùng tag **đã xuất hiện trên GitHub Releases và có đủ hai tệp phát hành**. Lệnh dưới đây triển khai v0.1.17 đến `game.longh.org`. Cần trỏ DNS về VPS và mở cổng HTTP cho Nginx.

```bash
TAG=v0.1.17
curl -fsSL "https://raw.githubusercontent.com/herry-huynhlong/game/$TAG/deploy/vps/deploy.sh" -o deploy.sh &&
  sudo env GITHUB_REPOSITORY=herry-huynhlong/game SITE_DOMAIN=game.longh.org bash deploy.sh "$TAG"
```

Script xác minh SHA-256, cập nhật liên kết `/var/www/thanh-van-ky/current` và dùng Nginx kiểm tra bản mới. Địa chỉ `127.0.0.1` trong kết quả healthcheck là kiểm tra nội bộ trên VPS với header Host tương ứng. Có thể kiểm tra domain và file bản đồ từ bên ngoài:

```bash
curl -fsSI http://game.longh.org/
curl -fsSI http://game.longh.org/maps/world-rebuild-1b.tmj
```

Nếu cần quay lại release trước và liên kết `previous` còn tồn tại, tải script rollback từ tag đang dùng rồi chạy:

```bash
read -r -p 'Tag đang chạy: ' TAG
curl -fsSL "https://raw.githubusercontent.com/herry-huynhlong/game/$TAG/deploy/vps/rollback.sh" -o rollback.sh &&
  sudo env SITE_DOMAIN=game.longh.org bash rollback.sh
```

Với repository private, xem cách dùng token chỉ đọc hoặc chuyển artifact qua `LOCAL_RELEASE_DIR` trong [hướng dẫn VPS](deploy/vps/README.md). Cả hai luồng đều xác minh checksum và chạy từ bản đã build.
