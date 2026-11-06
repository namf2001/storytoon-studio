#!/usr/bin/env python3
"""
Unified 6-Worker Queue Pool Orchestrator for 3 Distinct Pinewoods 360° Grain Dispenser TVCs:
1. Video 1 (product-pinewoods-style1-action): Viral Action-Comedy & Blockbuster VFX (Voice: Ngọc Linh)
2. Video 2 (product-pinewoods-style2-luxury): Luxury Minimalist Japandi & Cinematic ASMR (Voice: Mai Anh)
3. Video 3 (product-pinewoods-style3-healthy): Healthy Eat-Clean & Nut Milk Morning Routine (Voice: Duyên Hà My)

Strictly reuses the single Google Flow Project ID: 7a4d33d7-04af-4202-87ce-31494e81a90d
Features sample-accurate per-scene TTS + Faster-Whisper synthesis and immediate per-video MP4 rendering.
"""
import concurrent.futures
import json
import os
import queue
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

FLOW_PROJECT_ID = "8ecfdb80-bc8a-4149-b445-70d9dd907eca"
RAC_VL_ROOT = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/rac-vl")
AI_WORKER_DIR = RAC_VL_ROOT / "apps" / "ai-worker"
STORAGE_DIR = RAC_VL_ROOT / "storage"
ADS_ASSET_DIR = Path("/Users/flnam2001/Workplace/PersonalProjects/Earn money/ads-product/public/assets/rice_dispenser")
SHOPEE_IMG = Path("/tmp/shopee_19586720608/images/product_img_01.jpg")

PROFILES = ["quangtu99772005", "worker_1", "worker_2", "worker_3", "worker_4"]
profile_pool: queue.Queue[str] = queue.Queue()
for _p in PROFILES:
    profile_pool.put(_p)
started_profiles: set[str] = set()
started_lock = threading.Lock()

print_lock = threading.Lock()
tts_lock = threading.Lock()
START_TIME = time.time()


def log(msg: str) -> None:
    elapsed = time.time() - START_TIME
    with print_lock:
        print(f"[{elapsed:6.1f}s] {msg}", flush=True)


CAMPAIGNS = [
    {
        "slug": "product-pinewoods-style1-action",
        "title": "⚡ [Style 1: Hài Hành Động VFX] TVC Thùng Đựng Hạt Xoay 360° Pinewoods (27s)",
        "voice": "Ngọc Linh",
        "atempo": 1.40,
        "scenes": [
            {
                "index": 1,
                "tag": "PW_S1_C1:",
                "text": "Á cứu với mẹ ơi! Mới nhấc bịch đậu xanh lên mà túi nilon bục đáy, gạo với đỗ văng tung tóe khắp sàn bếp! Đừng hoảng, triệu hồi ngay pháo đài đựng hạt xoay ba trăm sáu mươi độ Pinewoods này!",
                "setting": "[1. THẢM HỌA BỤC TÚI NILON] • Túi nilon bục đáy hạt văng tung tóe -> Đập bàn triệu hồi Thùng xoay Pinewoods phát sáng",
                "calloutTag": "BỤC TÚI NILON!",
                "calloutText": "Triệu Hồi Pháo Đài Xoay 360°",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["product_front_clean.png"],
                "image_prompt": (
                    "Over-the-top viral action-comedy TVC shot in a bright sunlit kitchen, 9:16 vertical: "
                    "On a marble countertop, torn plastic bags burst open with rice, green mung beans, and red beans flying dramatically in mid-air with golden comic sparks! "
                    "Right beside the chaos, a chef's hands (framed from chest down in an apron) heroically slam down this exact pearl-white and gold cylindrical 6-compartment rotating grain dispenser with golden shockwave rings."
                ),
                "video_prompt": (
                    "PW_S1_C1: High-energy action-comedy TVC shot, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Torn plastic bags spill rice and colorful beans across the counter as hands sweep the messy bags away. "
                    "Seconds 2.5 to 5.0: Hands heroically slam down this sleek pearl-white 6-compartment rotating grain dispenser onto the marble counter with a golden energy shockwave. "
                    "Seconds 5.0 to 6.0: Fast dramatic camera zoom-in onto the gleaming grain dispenser."
                ),
            },
            {
                "index": 2,
                "tag": "PW_S1_C2:",
                "text": "Thiết kế sáu ngăn phân tách cực đỉnh, xoay một vòng ba trăm sáu mươi độ mượt như lốc xoáy, gom gọn cả thế giới ngũ cốc vào một chiếc thùng sang chảnh!",
                "setting": "[2. LỐC XOÁY NĂNG LƯỢNG 360°] • Xoay 360 độ tốc độ cao với vệt sáng vàng quanh 6 ngăn ngũ cốc",
                "calloutTag": "XOAY 360° CỰC ĐỈNH",
                "calloutText": "6 Ngăn Riêng Biệt · Siêu Gọn",
                "cameraEffect": "zoom_in",
                "transition": "slide",
                "refs": ["product_front_clean.png", "product_top_clean.png"],
                "image_prompt": (
                    "Epic blockbuster VFX product commercial shot in a modern kitchen, 9:16 vertical: "
                    "This exact pearl-white cylindrical 6-compartment rotating grain dispenser with champagne-gold accents spins dynamically with swirling golden light trails around its transparent body filled with white rice, red beans, green mung beans, yellow soybeans, and black beans."
                ),
                "video_prompt": (
                    "PW_S1_C2: Blockbuster VFX product commercial shot, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: A hand gives the pearl-white 6-compartment grain dispenser a dynamic spin as golden light trails swirl 360 degrees around the transparent compartments of colorful grains. "
                    "Seconds 2.5 to 5.0: The dispenser locks smoothly onto the desired grain compartment with a crisp golden flash. "
                    "Seconds 5.0 to 6.0: Hero close-up showcasing the 6 separated grain chambers."
                ),
            },
            {
                "index": 3,
                "tag": "PW_S1_C3:",
                "text": "Không cần mở nắp múc từng thìa! Chỉ một cú chạm nút bấm thần tốc, gạo và hạt khô tuôn trào chuẩn xác xuống khay đong kiêm rổ vo gạo tiện lợi!",
                "setting": "[3. TUYỆT KỸ 1 CHẠM ĐONG HẠT] • Bấm nút mạ vàng phóng tia sáng, hạt gạo tuôn xuống khay đong siêu tốc",
                "calloutTag": "1 CHẠM THẦN TỐC",
                "calloutText": "Tự Đong Hạt · Khay Rút Vo Gạo",
                "cameraEffect": "static",
                "transition": "fade",
                "refs": ["front_drawer.png", "product_front_clean.png"],
                "image_prompt": (
                    "High-impact commercial macro close-up shot, 9:16 vertical: "
                    "A finger (neck-down framing) presses the round gold-trimmed push button on this exact pearl-white rotating grain dispenser with a golden spark pulse, sending a waterfall of glossy white rice and golden beans pouring into the transparent pull-out measuring drawer below."
                ),
                "video_prompt": (
                    "PW_S1_C3: High-speed action commercial close-up, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: A finger presses the front push button with a golden energy pulse, and white rice cascades rapidly into the clear bottom measuring drawer. "
                    "Seconds 2.5 to 5.0: Hands pull out the transparent drawer with drainage holes and rinse the rice under a powerful stream of water. "
                    "Seconds 5.0 to 6.0: Crisp close-up of the clean washed grains."
                ),
            },
            {
                "index": 4,
                "tag": "PW_S1_C4:",
                "text": "Đỉnh nắp tích hợp hộp chống mọt thần thánh đựng tỏi và hoa hồi, kết hợp gioăng kín khít đánh bay ẩm mốc và mối mọt suốt bốn mùa!",
                "setting": "[4. KHIÊN CHỐNG MỌT BẤT BẠI] • Đặt hoa hồi & tỏi vào hộp trung tâm trên đỉnh nắp phát khiên bảo vệ",
                "calloutTag": "KHIÊN CHỐNG MỌT",
                "calloutText": "Ngăn Tỏi Hoa Hồi · Kín Khít 100%",
                "cameraEffect": "zoom_in",
                "transition": "slide",
                "refs": ["product_top_clean.png", "top_view.png"],
                "image_prompt": (
                    "Top-down 45-degree commercial VFX shot, 9:16 vertical: "
                    "Hands (framed from chest down) place star anise, garlic cloves, and dried chili into the central round insect-proof box at the top of this exact 6-compartment rotating grain dispenser, surrounded by a glowing golden protective shield dome over the 6 grain compartments."
                ),
                "video_prompt": (
                    "PW_S1_C4: Dynamic top-down 45-degree commercial shot, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands place star anise and garlic cloves into the central round insect-proof compartment on top of the 6-compartment grain dispenser. "
                    "Seconds 2.5 to 5.0: Hands press the airtight top lid firmly closed, triggering a golden protective shimmer across the sealed compartments. "
                    "Seconds 5.0 to 6.0: Steady close-up of the airtight food-grade PP+ABS body."
                ),
            },
            {
                "index": 5,
                "tag": "PW_S1_C5:",
                "text": "Nhựa PP cộng ABS dày dặn bền bỉ, đủ hai size sáu ký và chín ký, bấm giỏ hàng góc trái chốt đơn liền tay nha!",
                "setting": "[5. ĐẠI TIỆC CHỐT ĐƠN] • Đủ 2 size 6KG & 9KG tỏa sáng trên đảo bếp kèm CTA chốt đơn",
                "calloutTag": "SIÊU PHẨM 6KG & 9KG",
                "calloutText": "Bền Bỉ · Chốt Đơn Liền Tay!",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["product_front_clean.png", "front_drawer.png"],
                "image_prompt": (
                    "Explosive high-energy commercial finale shot in a bright sunlit luxury kitchen, 9:16 vertical: "
                    "Two sizes (6kg medium and 9kg tall) of this exact pearl-white and gold 6-compartment rotating grain dispenser standing side by side on a marble island with golden sparkles and bowls of steaming rice, leaving clean lower-third space for shopping cart CTA."
                ),
                "video_prompt": (
                    "PW_S1_C5: High-energy commercial finale shot, sunlit modern kitchen, 9:16 vertical. "
                    "Seconds 0 to 2.5: Dynamic camera push-in toward the two sizes (6kg and 9kg) of the pearl-white 6-compartment rotating grain dispenser gleaming on a marble counter. "
                    "Seconds 2.5 to 5.0: Golden light rays highlight the colorful grains inside the transparent chambers and the sleek gold trim. "
                    "Seconds 5.0 to 6.0: Hero hold leaving clean lower-third space for shopping cart CTA."
                ),
            },
        ],
    },
    {
        "slug": "product-pinewoods-style2-luxury",
        "title": "💎 [Style 2: Luxury Điện Ảnh Bắc Âu] TVC Thùng Đựng Hạt Xoay 360° Pinewoods (29s)",
        "voice": "Mai Anh",
        "atempo": 1.32,
        "scenes": [
            {
                "index": 1,
                "tag": "PW_S2_C1:",
                "text": "Một căn bếp gọn gàng và tinh tế luôn bắt đầu từ cách bạn nâng niu từng hạt gạo, hạt đỗ mỗi ngày. Khám phá ngay tuyệt tác thùng đựng hạt xoay ba trăm sáu mươi độ Pinewoods.",
                "setting": "[1. HOOK LUXURY JAPANDI] • Nắng sớm chiếu qua rèm voan lên đảo bếp đá cẩm thạch & Thùng xoay Pinewoods tinh tế",
                "calloutTag": "TINH TẾ TỪNG GÓC BẾP",
                "calloutText": "Tuyệt Tác Lưu Trữ Bắc Âu",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["product_front_clean.png"],
                "image_prompt": (
                    "High-end Japandi luxury kitchen commercial photography, 9:16 vertical, warm golden morning sunlight streaming through sheer linen curtains: "
                    "This exact pearl-white cylindrical 6-compartment rotating grain dispenser with champagne-gold accents sits gracefully on a travertine stone countertop beside a ceramic vase of eucalyptus."
                ),
                "video_prompt": (
                    "PW_S2_C1: Luxury minimalist Japandi kitchen commercial, golden morning sunlight, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Slow cinematic camera glide across a serene stone kitchen counter bathed in soft morning light, revealing the pearl-white and champagne-gold 6-compartment rotating grain dispenser. "
                    "Seconds 2.5 to 5.0: A woman in a cream cashmere sweater (framed from chest down) gently caresses and rotates the smooth cylindrical dispenser. "
                    "Seconds 5.0 to 6.0: Elegant slow push-in on the minimalist silhouette."
                ),
            },
            {
                "index": 2,
                "tag": "PW_S2_C2:",
                "text": "Thân trụ trắng ngọc trai điểm viền vàng ánh kim sang trọng, lớp vỏ trong suốt tôn lên sắc màu tươi mới của sáu loại đậu và ngũ cốc dinh dưỡng.",
                "setting": "[2. VẺ ĐẸP TRẮNG NGỌC TRAI] • Cận cảnh viền vàng ánh kim & 6 ngăn hạt ngũ cốc trong suốt như pha lê",
                "calloutTag": "TRẮNG NGỌC TRAI",
                "calloutText": "Viền Vàng Ánh Kim · 6 Ngăn Pha Lê",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["product_front_clean.png", "product_top_clean.png"],
                "image_prompt": (
                    "Editorial luxury macro product shot in warm studio lighting, 9:16 vertical: "
                    "Close-up of the crystal-clear 6-compartment body and pearl-white base with champagne-gold button trim of this exact rotating grain dispenser, displaying neatly layered jasmine rice, crimson red beans, emerald mung beans, golden millet, and lotus seeds."
                ),
                "video_prompt": (
                    "PW_S2_C2: Luxury editorial close-up, warm softbox studio lighting, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Slow smooth rotation of the 6-compartment grain dispenser, with warm light reflecting off the crystal-clear dividers and champagne-gold trim. "
                    "Seconds 2.5 to 5.0: Camera tilts smoothly up the six vibrant compartments filled with jasmine rice, red beans, mung beans, and lotus seeds. "
                    "Seconds 5.0 to 6.0: Serene luxury hold on the pearl-white and gold finish."
                ),
            },
            {
                "index": 3,
                "tag": "PW_S2_C3:",
                "text": "Nhẹ nhàng xoay chọn loại hạt yêu thích, ấn nút êm ái để đong vừa đủ khẩu phần ăn và tráng rửa trực tiếp ngay trên khay rút thông minh.",
                "setting": "[3. ASMR ĐONG HẠT & VO GẠO] • Góc quay Slow-motion hạt gạo trắng ngần rơi xuống khay rút & dòng nước trong vắt",
                "calloutTag": "TRẢI NGHIỆM ÊM ÁI",
                "calloutText": "Đong Chuẩn Khẩu Phần · Khay Rút Thông Minh",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["front_drawer.png"],
                "image_prompt": (
                    "Cinematic ASMR macro close-up shot in a sunlit luxury kitchen, 9:16 vertical: "
                    "A manicured hand (neck-down framing) gently presses the champagne-gold push button on this exact pearl-white rotating grain dispenser as pearl-white jasmine rice flows smoothly into the clear measuring drawer with strainer holes."
                ),
                "video_prompt": (
                    "PW_S2_C3: Cinematic ASMR macro close-up, warm sunlight, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: A manicured finger softly presses the champagne-gold button, and pearl-white rice grains stream gracefully into the clear measuring drawer. "
                    "Seconds 2.5 to 5.0: Hands slide out the drawer and let crystal-clear water rinse over the rice, draining smoothly through the built-in strainer holes. "
                    "Seconds 5.0 to 6.0: Calm macro hold on glistening washed rice."
                ),
            },
            {
                "index": 4,
                "tag": "PW_S2_C4:",
                "text": "Ngăn nhỏ trên đỉnh nắp giữ trọn hương thơm của hoa hồi, quế và tỏi khô, bảo vệ từng hạt gạo luôn thơm ngon thuần khiết không lo ẩm mốc.",
                "setting": "[4. ƯỚP HƯƠNG THẢO MỘC TỰ NHIÊN] • Đặt hoa hồi & quế thơm vào ngăn trung tâm đỉnh nắp đậy kín hơi",
                "calloutTag": "BẢO QUẢN THUẦN KHIẾT",
                "calloutText": "Ngăn Thảo Mộc Chống Ẩm Mọt Tự Nhiên",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["product_top_clean.png", "top_view.png"],
                "image_prompt": (
                    "Artistic top-down 45-degree luxury commercial shot, 9:16 vertical, warm afternoon light: "
                    "Delicate hands (framed from chest down in beige linen) placing whole star anise pods and cinnamon bark into the central round herb compartment on top of this exact 6-compartment rotating grain dispenser."
                ),
                "video_prompt": (
                    "PW_S2_C4: Artistic top-down 45-degree commercial shot, warm afternoon light, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands gently place whole star anise and garlic into the central round compartment on top of the 6-compartment grain dispenser. "
                    "Seconds 2.5 to 5.0: Hands smoothly close the translucent pearl-white top cover, sealing in freshness across all six grain sections. "
                    "Seconds 5.0 to 6.0: Elegant overhead hold."
                ),
            },
            {
                "index": 5,
                "tag": "PW_S2_C5:",
                "text": "Nâng tầm đẳng cấp gian bếp hiện đại với hai dung tích sáu ký và chín ký, chạm nhẹ vào giỏ hàng để rước ngay về nhà hôm nay.",
                "setting": "[5. BỮA CƠM ẤM CÚNG & CTA] • Thùng xoay Pinewoods bên bát cơm trắng bốc khói & ấm trà chiều sang trọng",
                "calloutTag": "ĐẲNG CẤP GIAN BẾP",
                "calloutText": "Size 6KG & 9KG · Đặt Mua Ngay",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["product_front_clean.png"],
                "image_prompt": (
                    "Warm luxury evening kitchen lifestyle outro shot, 9:16 vertical: "
                    "This exact pearl-white and champagne-gold 6-compartment rotating grain dispenser displayed on a warm travertine island beside a handcrafted ceramic bowl of steaming white rice and wooden chopsticks, leaving clean lower-third space for shopping cart CTA."
                ),
                "video_prompt": (
                    "PW_S2_C5: Warm luxury kitchen lifestyle outro shot, golden hour glow, 9:16 vertical. "
                    "Seconds 0 to 2.5: Slow graceful camera push-in toward the pearl-white and gold 6-compartment rotating grain dispenser beside a steaming ceramic bowl of hot white rice. "
                    "Seconds 2.5 to 5.0: Soft golden hour light caresses the sleek cylindrical body and vibrant grains inside. "
                    "Seconds 5.0 to 6.0: Serene hero hold with clean lower-third space for shopping cart CTA."
                ),
            },
        ],
    },
    {
        "slug": "product-pinewoods-style3-healthy",
        "title": "🌿 [Style 3: Sữa Hạt Eat-Clean Cho Mẹ Bỉm] TVC Thùng Xoay Ngũ Cốc 6 Ngăn Pinewoods (28s)",
        "voice": "Duyên Hà My",
        "atempo": 1.38,
        "scenes": [
            {
                "index": 1,
                "tag": "PW_S3_C1:",
                "text": "Mỗi sáng nấu sữa hạt hay cháo dinh dưỡng cho con mà phải mở tới mở lui cả chục cái lọ thủy tinh lỉnh kỉnh? Sắm ngay trạm ngũ cốc xoay sáu ngăn Pinewoods giải cứu buổi sáng bận rộn!",
                "setting": "[1. HOOK TÍN ĐỒ SỮA HẠT] • Bàn bếp bày chục lọ thủy tinh lỉnh kỉnh -> Thay bằng Trạm ngũ cốc xoay 6 ngăn Pinewoods",
                "calloutTag": "NẤU SỮA HẠT MỖI SÁNG?",
                "calloutText": "Thay Thế Chục Lọ Thủy Tinh Lỉnh Kỉnh",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["product_front_clean.png", "product_top_clean.png"],
                "image_prompt": (
                    "Bright healthy morning kitchen commercial shot, 9:16 vertical, fresh daylight: "
                    "Neck-down framing only, no head or face visible: Cluttered glass jars of beans are pushed aside on a wooden counter to reveal this exact pearl-white 6-compartment rotating grain dispenser standing next to a modern nut-milk maker and a glass of creamy nut milk."
                ),
                "video_prompt": (
                    "PW_S3_C1: Bright healthy morning kitchen commercial, fresh daylight, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands clear away multiple cluttered glass jars on the kitchen counter, revealing this sleek pearl-white 6-compartment rotating grain dispenser next to a nut-milk blender. "
                    "Seconds 2.5 to 5.0: Hands rotate the 6-compartment dispenser filled with red beans, mung beans, lotus seeds, soybeans, and brown rice. "
                    "Seconds 5.0 to 6.0: Bright energetic push-in on the healthy grain station."
                ),
            },
            {
                "index": 2,
                "tag": "PW_S3_C2:",
                "text": "Chia sẵn sáu ngăn riêng biệt cho đậu đỏ, đậu xanh, hạt sen, gạo lứt, xoay nhẹ một vòng là mix đủ công thức sữa hạt thơm béo chỉ trong năm giây.",
                "setting": "[2. MIX 6 LOẠI HẠT TRONG 5 GIÂY] • Xoay nhẹ lấy lần lượt đậu đỏ, hạt sen, đậu xanh, gạo lứt vào cùng 1 khay",
                "calloutTag": "MIX HẠT TRONG 5 GIÂY",
                "calloutText": "Đậu Đỏ · Hạt Sen · Đậu Xanh · Gạo Lứt",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["product_top_clean.png", "front_drawer.png"],
                "image_prompt": (
                    "High-angle 45-degree healthy lifestyle commercial shot, 9:16 vertical, bright sunlit kitchen: "
                    "Neck-down framing only: Hands rotate this exact pearl-white 6-compartment rotating grain dispenser and press the buttons in sequence to mix colorful red beans, green mung beans, golden soybeans, and lotus seeds into the single pull-out measuring cup."
                ),
                "video_prompt": (
                    "PW_S3_C2: High-angle commercial shot, bright sunlit kitchen, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands smoothly rotate the 6-compartment dispenser from red beans to lotus seeds and green mung beans, pressing the front buttons in quick succession. "
                    "Seconds 2.5 to 5.0: A colorful mix of nutritious beans and seeds collects neatly inside the clear measuring drawer at the base. "
                    "Seconds 5.0 to 6.0: Close-up of the vibrant mixed superfood grains."
                ),
            },
            {
                "index": 3,
                "tag": "PW_S3_C3:",
                "text": "Bấm nút lấy hạt theo đúng vạch chia định lượng, mang khay đi xả nước vo sạch bụi bẩn cực nhanh mà không rơi rớt một hạt nào ra bồn rửa.",
                "setting": "[3. KHAY RÚT CÓ LỖ THOÁT NƯỚC] • Rút khay đong có lỗ thoát nước đem xả trực tiếp dưới vòi nước bồn rửa",
                "calloutTag": "KHAY RÚT ĐA NĂNG",
                "calloutText": "Có Lỗ Thoát Nước · Rửa Hạt Cực Nhanh",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["front_drawer.png"],
                "image_prompt": (
                    "Close-up commercial shot at a bright kitchen sink, 9:16 vertical, fresh morning light: "
                    "Neck-down framing only: Hands hold the transparent pull-out measuring drawer from this rotating grain dispenser under running faucet water, rinsing a colorful mix of beans and lotus seeds while water drains cleanly through the side strainer holes."
                ),
                "video_prompt": (
                    "PW_S3_C3: Close-up commercial shot, bright kitchen sink, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands pull out the clear measuring drawer filled with mixed beans and hold it under running faucet water at the sink. "
                    "Seconds 2.5 to 5.0: Water swirls and drains cleanly through the built-in strainer holes of the drawer without a single bean falling out. "
                    "Seconds 5.0 to 6.0: Clean close-up of the fresh washed beans ready for cooking."
                ),
            },
            {
                "index": 4,
                "tag": "PW_S3_C4:",
                "text": "Chất liệu nhựa PP và ABS cao cấp an toàn thực phẩm, nắp đậy kín hơi kèm khay đựng tỏi ớt giữ hạt dinh dưỡng luôn giòn thơm không lo mọt.",
                "setting": "[4. NHỰA PP+ABS AN TOÀN CHO BÉ] • Nhựa nguyên sinh dày dặn kèm ngăn chống mọt giữ hạt dinh dưỡng luôn mới",
                "calloutTag": "NHỰA PP+ABS AN TOÀN",
                "calloutText": "Chống Ẩm Mốc · Giữ Trọn Dinh Dưỡng",
                "cameraEffect": "static",
                "transition": "slide",
                "refs": ["product_top_clean.png", "product_front_clean.png"],
                "image_prompt": (
                    "Clean commercial close-up in a bright healthy kitchen, 9:16 vertical: "
                    "Neck-down framing only: Hands close the tight-sealing lid over the 6 compartments and central star-anise anti-insect box of this exact pearl-white rotating grain dispenser, highlighting the thick food-grade PP+ABS walls."
                ),
                "video_prompt": (
                    "PW_S3_C4: Clean commercial close-up, bright healthy kitchen, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Close-up of the top lid with star anise in the center box being pressed firmly shut onto the 6-compartment grain dispenser. "
                    "Seconds 2.5 to 5.0: Camera pans down the thick glossy food-grade PP+ABS transparent walls keeping all six types of grains dry and fresh. "
                    "Seconds 5.0 to 6.0: Steady hold on the hygienic sealed dispenser."
                ),
            },
            {
                "index": 5,
                "tag": "PW_S3_C5:",
                "text": "Bí quyết sống khỏe và tiết kiệm thời gian cho mọi gia đình Việt, ưu đãi giảm sâu hôm nay, các chị bấm giỏ hàng đặt ngay nhé!",
                "setting": "[5. THÀNH PHẨM SỮA HẠT & CTA] • Thùng xoay Pinewoods bên ly sữa hạt nóng hổi & Kêu gọi bấm giỏ hàng",
                "calloutTag": "BÍ QUYẾT SỐNG KHỎE",
                "calloutText": "Ưu Đãi Giảm Sâu · Đặt Ngay Hôm Nay!",
                "cameraEffect": "zoom_in",
                "transition": "fade",
                "refs": ["product_front_clean.png", "front_drawer.png"],
                "image_prompt": (
                    "Sunny healthy lifestyle commercial finale shot on a wooden kitchen island, 9:16 vertical: "
                    "This exact pearl-white and gold 6-compartment rotating grain dispenser sitting beside two glasses of warm creamy nut milk, a bowl of nutritious porridge, and fresh flowers, leaving clean lower-third space for shopping cart CTA."
                ),
                "video_prompt": (
                    "PW_S3_C5: Sunny healthy lifestyle commercial finale shot, bright kitchen island, 9:16 vertical. Neck-down framing only. "
                    "Seconds 0 to 2.5: Hands pour warm creamy nut milk into a glass right beside the pearl-white 6-compartment rotating grain dispenser on a sunlit counter. "
                    "Seconds 2.5 to 5.0: Smooth camera push-in showcasing the dispenser filled with 6 colorful healthy grains alongside the nutritious breakfast. "
                    "Seconds 5.0 to 6.0: Steady hero hold leaving clean lower-third space for shopping cart CTA."
                ),
            },
        ],
    },
]


def ensure_worker_profiles() -> None:
    gflow_home = Path.home() / "Library" / "Application Support" / "gflow-cli"
    src_profile = gflow_home / "profile_quangtu99772005"
    if not src_profile.exists():
        return
    for w in range(1, 5):
        dst_profile = gflow_home / f"profile_worker_{w}"
        if not dst_profile.exists():
            subprocess.run(
                [
                    "rsync", "-a", "--delete",
                    "--exclude=Singleton*",
                    "--exclude=RunningChromeVersion",
                    "--exclude=*Cache*",
                    "--exclude=Code Cache",
                    "--exclude=Service Worker",
                    f"{src_profile}/",
                    f"{dst_profile}/",
                ],
                check=True,
            )


def find_image_id_by_prompt(prompt_substr: str) -> str | None:
    res = subprocess.run(["gflow", "data", "list", "images", "--limit", "30", "--json"], capture_output=True, text=True)
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
            if row.get("project_id") == FLOW_PROJECT_ID and prompt_substr[:60] in (row.get("prompt") or ""):
                if row.get("media_id"):
                    return row["media_id"]
        except Exception:
            pass
    return None


def find_media_id_by_prompt(prompt_tag: str) -> str | None:
    res = subprocess.run(["gflow", "data", "list", "videos", "--limit", "40", "--json"], capture_output=True, text=True)
    for line in res.stdout.splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            row = json.loads(line)
            if row.get("project_id") == FLOW_PROJECT_ID and prompt_tag in (row.get("prompt") or ""):
                if row.get("media_id"):
                    return row["media_id"]
        except Exception:
            pass
    return None


def download_by_media_id(label: str, profile: str, media_id: str, clip_dir: Path, target_mp4: Path) -> bool:
    env = {**os.environ, "GFLOW_CLI_PROFILE": profile}
    for attempt in range(1, 4):
        log(f"📥 [{label} · {profile} · Attempt {attempt}/3] Downloading media_id={media_id}...")
        subprocess.run(
            ["gflow", "data", "download", media_id, "--out", str(clip_dir), "--json"],
            capture_output=True,
            text=True,
            env=env,
        )
        candidate = clip_dir / f"{media_id}.mp4"
        if candidate.exists() and candidate.stat().st_size > 50000:
            shutil.move(str(candidate), str(target_mp4))
            log(f"✅ [{label} · {profile}] Video ready: {target_mp4.name} ({target_mp4.stat().st_size} B)")
            return True
        time.sleep(3)
    return False


def run_scene_task(slug: str, sc: dict) -> tuple[str, int]:
    idx = sc["index"]
    label = f"{slug}#S{idx}"
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    raw_dir = base_dir / "raw_images"
    img_dir = base_dir / "images"
    clip_dir = base_dir / "clips"
    img_out = img_dir / f"ref_scene_0{idx}.jpg"
    clip_out = clip_dir / f"scene_0{idx}.mp4"
    prompt_tag = sc["tag"]

    profile = profile_pool.get()
    try:
        with started_lock:
            if profile not in started_profiles:
                delay = len(started_profiles) * 2.5
                started_profiles.add(profile)
            else:
                delay = 0.0
        if delay > 0:
            time.sleep(delay)

        env = {**os.environ, "GFLOW_CLI_PROFILE": profile}

        # 1. Generate I2I Keyframe
        if not (img_out.exists() and img_out.stat().st_size > 10000):
            for attempt in range(1, 5):
                cmd = [
                    "gflow", "image", "i2i",
                    "--project", FLOW_PROJECT_ID,
                    "--aspect", "9:16",
                    "-o", str(img_out),
                ]
                for r in sc["refs"]:
                    cmd.extend(["--ref", str(raw_dir / r)])
                cmd.append(sc["image_prompt"])
                log(f"🎨 [{label} I2I · {profile} · Attempt {attempt}] Generating keyframe...")
                res = subprocess.run(cmd, capture_output=True, text=True, env=env)
                if res.returncode == 0 and img_out.exists() and img_out.stat().st_size > 10000:
                    log(f"✅ [{label} I2I · {profile}] Keyframe saved ({img_out.stat().st_size} B) -> Immediately launching I2V!")
                    break
                img_id = find_image_id_by_prompt(sc["image_prompt"])
                if img_id:
                    subprocess.run(["gflow", "data", "download", img_id, "--out", str(img_dir), "--json"], capture_output=True, text=True, env=env)
                    for ext in (".jpg", ".png", ".jpeg"):
                        cand = img_dir / f"{img_id}{ext}"
                        if cand.exists() and cand.stat().st_size > 10000:
                            shutil.move(str(cand), str(img_out))
                            break
                    if img_out.exists() and img_out.stat().st_size > 10000:
                        log(f"✅ [{label} I2I · {profile}] Keyframe recovered via media_id={img_id} -> Immediately launching I2V!")
                        break
                log(f"⚠️ [{label} I2I · {profile}] Attempt {attempt} failed (exit {res.returncode}), retrying...")
                time.sleep(4)
            if not (img_out.exists() and img_out.stat().st_size > 10000):
                raise RuntimeError(f"Failed {label} I2I image")
        else:
            log(f"⏭️ [{label} I2I · {profile}] Keyframe exists -> Immediately launching I2V!")

        # 2. Immediately generate I2V Video
        if not (clip_out.exists() and clip_out.stat().st_size > 50000):
            for attempt in range(1, 4):
                cmd = [
                    "gflow", "video", "i2v",
                    "--project", FLOW_PROJECT_ID,
                    "--model", "omni-flash",
                    "--duration", "6",
                    "--resolution", "360p",
                    "--aspect", "9:16",
                    "-i", str(img_out),
                    "-o", str(clip_out),
                    sc["video_prompt"],
                ]
                log(f"🎬 [{label} I2V · {profile} · Attempt {attempt}] Generating 6s AI video clip...")
                res = subprocess.run(cmd, capture_output=True, text=True, env=env)
                if res.returncode == 0 and clip_out.exists() and clip_out.stat().st_size > 50000:
                    log(f"✅ [{label} I2V · {profile}] Video saved directly: {clip_out.name}")
                    break

                time.sleep(2)
                vid_id = find_media_id_by_prompt(prompt_tag)
                if vid_id:
                    log(f"🔄 [{label} I2V · {profile}] Matched media_id={vid_id} by tag '{prompt_tag}', downloading...")
                    if download_by_media_id(label, profile, vid_id, clip_dir, clip_out):
                        break
                log(f"⚠️ [{label} I2V · {profile}] Attempt {attempt} did not produce downloadable video, retrying...")
                time.sleep(3)

            if not (clip_out.exists() and clip_out.stat().st_size > 50000):
                raise RuntimeError(f"Failed {label} I2V video")
        else:
            log(f"⏭️ [{label} I2V · {profile}] Video already exists: {clip_out.name}")

        return slug, idx
    finally:
        profile_pool.put(profile)


def setup_audio_and_db_for_campaign(camp: dict) -> str:
    """Sample-accurate per-scene VieNeu-TTS synthesis + Faster-Whisper word alignment + Go API / DB ingestion."""
    slug = camp["slug"]
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    proj_id_file = base_dir / "project_id.txt"
    out_wav = base_dir / "voice.wav"
    words_file = base_dir / "words.json"

    if proj_id_file.exists() and out_wav.exists() and words_file.exists():
        existing_id = proj_id_file.read_text(encoding="utf-8").strip()
        if existing_id:
            log(f"⏭️ [{slug} Audio] Reusing existing voiceover & project_id={existing_id}")
            return existing_id

    sys.path.insert(0, str(AI_WORKER_DIR))
    import numpy as np
    import soundfile as sf
    from app.tts import _synth_vieneu
    from app.captions import transcribe

    all_audio = []
    all_words = []
    all_segs = []
    scene_bounds = []
    cur_ms = 0
    sr = 24000
    atempo = camp.get("atempo", 1.38)

    with tts_lock:
        log(f"🎙️ [{slug} Audio] Synthesizing 5 scenes with VieNeu-TTS ({camp['voice']} @ {atempo}x)...")
        for sc in camp["scenes"]:
            idx = sc["index"]
            sc_raw = base_dir / f"sc_{idx}_raw.wav"
            sc_wav = base_dir / f"sc_{idx}.wav"
            _synth_vieneu(sc["text"], sc_raw, camp["voice"])
            subprocess.run(
                ["ffmpeg", "-y", "-i", str(sc_raw), "-filter:a", f"atempo={atempo}", str(sc_wav)],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            data, sr = sf.read(sc_wav, dtype="float32")
            if data.ndim > 1:
                data = data.mean(axis=1)
            sc_dur_ms = int(round(len(data) / sr * 1000))
            words, _, _ = transcribe(sc_wav, sc["text"])
            for w in words:
                all_words.append({
                    "text": w["text"],
                    "startMs": cur_ms + w["startMs"],
                    "endMs": min(cur_ms + sc_dur_ms, cur_ms + w["endMs"]),
                })
            start_ms = cur_ms
            end_ms = cur_ms + sc_dur_ms
            scene_bounds.append((start_ms, end_ms))
            all_segs.append({"index": idx - 1, "startMs": start_ms, "endMs": end_ms, "text": sc["text"]})
            all_audio.append(data)
            cur_ms = end_ms
            sc_raw.unlink(missing_ok=True)
            sc_wav.unlink(missing_ok=True)

        sf.write(out_wav, np.concatenate(all_audio), sr)

    words_json = json.dumps(all_words, ensure_ascii=False, indent=2)
    words_file.write_text(words_json, encoding="utf-8")
    (base_dir / "segments.json").write_text(json.dumps(all_segs, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"✅ [{slug} Audio] Sample-accurate voiceover ready: {cur_ms} ms ({len(all_words)} words)")

    full_script = " ".join(sc["text"] for sc in camp["scenes"])
    req = urllib.request.Request(
        "http://localhost:9090/api/v1/projects",
        data=json.dumps({
            "title": camp["title"],
            "script": full_script,
            "aspectRatio": "9:16",
            "videoType": "product",
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        project_id = json.loads(resp.read().decode("utf-8"))["data"]["id"]

    proj_id_file.write_text(project_id, encoding="utf-8")
    proj_storage = STORAGE_DIR / project_id
    proj_storage.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_wav, proj_storage / "voice.wav")

    sql = f"""
    UPDATE projects
    SET audio_path = '{project_id}/voice.wav',
        duration_ms = {cur_ms},
        status = 'ready',
        words = $w${words_json}$w$::jsonb
    WHERE id = '{project_id}';
    """
    subprocess.run(
        ["psql", "postgres://storytoon:storytoon@localhost:5432/storytoon?sslmode=disable", "-c", sql],
        check=True,
        stdout=subprocess.DEVNULL,
    )

    scenes_payload = {"scenes": []}
    for i, sc in enumerate(camp["scenes"]):
        s_ms, e_ms = scene_bounds[i]
        scenes_payload["scenes"].append({
            "sceneIndex": sc["index"],
            "startMs": s_ms,
            "endMs": e_ms,
            "transcriptText": sc["text"],
            "setting": sc["setting"],
            "characters": [],
            "imagePrompt": "",
            "imageUrl": f"http://localhost:9090/media/{slug}/clips/scene_0{sc['index']}.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=6.04",
            "cameraEffect": sc["cameraEffect"],
            "transition": sc["transition"],
            "showCaption": True,
            "layoutType": "standard",
            "layers": [],
            "calloutTag": sc["calloutTag"],
            "calloutText": sc["calloutText"],
            "calloutPosition": "top_center",
            "calloutTheme": "dark",
        })

    req_scenes = urllib.request.Request(
        f"http://localhost:9090/api/v1/projects/{project_id}/scenes",
        data=json.dumps(scenes_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req_scenes) as resp:
        json.loads(resp.read().decode("utf-8"))

    log(f"✅ [{slug} Audio] Created Go API project_id={project_id} & saved 5 sample-accurate scenes!")
    return project_id


def render_campaign_mp4(slug: str, project_id: str) -> dict:
    base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
    clip_dir = base_dir / "clips"
    proj_storage = STORAGE_DIR / project_id
    proj_storage.mkdir(parents=True, exist_ok=True)
    for clip in clip_dir.glob("scene_*.mp4"):
        shutil.copy2(clip, proj_storage / clip.name)

    log(f"🎬 [{slug}] Triggering Remotion 1080p MP4 render for project_id={project_id}...")
    with urllib.request.urlopen(f"http://localhost:9090/api/v1/projects/{project_id}") as resp:
        proj = json.loads(resp.read().decode("utf-8"))["data"]

    render_payload = {
        "project_id": project_id,
        "composition_id": "ProductCommercialVideo",
        "input_props": {
            "audioUrl": proj["audioUrl"],
            "durationMs": proj["durationMs"],
            "aspectRatio": "9:16",
            "words": proj["words"],
            "scenes": proj["scenes"],
            "bgmUrl": "http://localhost:9090/media/football-assets/bgm.mp3",
            "bgmVolume": 0.12,
        },
    }
    req = urllib.request.Request(
        "http://localhost:8000/video/render",
        data=json.dumps(render_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.loads(r.read().decode("utf-8"))
    log(f"🏆 [{slug}] Render MP4 Complete -> {res['videoUrl']}")
    return res


def main():
    ensure_worker_profiles()

    for camp in CAMPAIGNS:
        slug = camp["slug"]
        base_dir = RAC_VL_ROOT / "apps" / "web" / "public" / slug
        raw_dir = base_dir / "raw_images"
        (base_dir / "images").mkdir(parents=True, exist_ok=True)
        (base_dir / "clips").mkdir(parents=True, exist_ok=True)
        raw_dir.mkdir(parents=True, exist_ok=True)

        symlink_path = STORAGE_DIR / slug
        if not symlink_path.exists():
            symlink_path.symlink_to(base_dir)

        for img_name in ["front_drawer.png", "product_front_clean.png", "product_top_clean.png", "top_view.png"]:
            src = ADS_ASSET_DIR / img_name
            if src.exists():
                shutil.copy2(src, raw_dir / img_name)
        if SHOPEE_IMG.exists():
            shutil.copy2(SHOPEE_IMG, raw_dir / "product_img_01.jpg")

    log("🚀 Starting Unified 6-Worker Queue Pool for 3 Pinewoods Grain Dispenser TVCs (15 scenes total + Audio/DB thread)...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
        audio_futures = {
            camp["slug"]: executor.submit(setup_audio_and_db_for_campaign, camp)
            for camp in CAMPAIGNS
        }

        scene_futures = {}
        for camp in CAMPAIGNS:
            for sc in camp["scenes"]:
                fut = executor.submit(run_scene_task, camp["slug"], sc)
                scene_futures[fut] = (camp["slug"], sc["index"])

        completed_counts = {camp["slug"]: 0 for camp in CAMPAIGNS}
        render_futures = {}

        for fut in concurrent.futures.as_completed(scene_futures):
            slug, idx = fut.result()
            completed_counts[slug] += 1
            log(f"🎉 [{slug}#S{idx}] Finished ({completed_counts[slug]}/5 scenes complete for {slug})!")

            if completed_counts[slug] == 5 and slug not in render_futures:
                proj_id = audio_futures[slug].result()
                render_futures[slug] = executor.submit(render_campaign_mp4, slug, proj_id)

        results = {}
        for camp in CAMPAIGNS:
            slug = camp["slug"]
            proj_id = audio_futures[slug].result()
            render_res = render_futures[slug].result()
            results[slug] = {"project_id": proj_id, "render": render_res}

    total_sec = time.time() - START_TIME
    log(f"🏆 ALL 3 PINEWOODS GRAIN DISPENSER TVCS COMPLETE in {total_sec:.1f}s ({total_sec/60:.2f} minutes)!")
    for slug, info in results.items():
        log(f"👉 [{slug}] Studio: http://localhost:3000/product?id={info['project_id']} | MP4: {info['render']['videoUrl']}")


if __name__ == "__main__":
    main()
