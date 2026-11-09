// Demo projects and media-pool helpers for the Product studio variant.
// (Moved verbatim from app/product/page.tsx.)
import type { Project, Scene } from "@storytoon/shared-types";
import { API_URL } from "@/lib/api";
import type { MediaPoolClip } from "@/components/nle/NleMediaPool";
import trashcanWords from "@/lib/trashcan_words.json";
import shopeeWords from "@/lib/shopee_trashcan_words.json";

export const MEDIA_BASE = `${API_URL}/media`;

// Thư viện Media mẫu cho video sản phẩm (các góc 3D Nano Banana + video render)
export const INITIAL_PRODUCT_CLIPS: MediaPoolClip[] = [
  {
    label: "🎬 Cảnh 1: Phòng khách sofa (Raw 8s)",
    url: "/product-shopee/raw_1.mp4#autofit=1&srcdur=7.98",
    badge: "Shopee Raw 1",
  },
  {
    label: "🎬 Cảnh 2: Đạp chân nắp cánh bướm (Raw 8s)",
    url: "/product-shopee/raw_2.mp4#autofit=1&srcdur=7.98",
    badge: "Shopee Raw 2",
  },
  {
    label: "🎬 Cảnh 3: Nhấn nút giữ nắp mở (Raw 8s)",
    url: "/product-shopee/raw_3.mp4#autofit=1&srcdur=7.98",
    badge: "Shopee Raw 3",
  },
  {
    label: "🎬 Cảnh 4: Khung kẹp giấu túi rác (Raw 8s)",
    url: "/product-shopee/raw_4.mp4#autofit=1&srcdur=7.98",
    badge: "Shopee Raw 4",
  },
  {
    label: "🎬 Cảnh 5: 3 Kích thước 10-15-20L & CTA (Raw 8s)",
    url: "/product-shopee/raw_5.mp4#autofit=1&srcdur=7.98",
    badge: "Shopee Raw 5",
  },
  {
    label: "🎬 Cảnh 1: Toàn cảnh bếp (Video AI)",
    url: "/product-trashcan/scene1_kitchen.mp4",
    badge: "Video AI",
  },
  {
    label: "🎬 Cảnh 2: Nắp cánh bướm mở đôi (Video AI)",
    url: "/product-trashcan/scene2_butterfly.mp4",
    badge: "Video AI",
  },
  {
    label: "🎬 Cảnh 3: Bàn đạp Inox dẫm mở (Video AI)",
    url: "/product-trashcan/scene3_pedal.mp4",
    badge: "Video AI",
  },
  {
    label: "🎬 Cảnh 4: 2 Ngăn phân loại rác (Video AI)",
    url: "/product-trashcan/scene4_interior.mp4",
    badge: "Video AI",
  },
  {
    label: "🎬 Video xuất bản Smart Sync (26s)",
    url: "/product-trashcan/rendered_smart_sync.mp4",
    badge: "Master",
  },
  {
    label: "🗑️ Hero Shot 45° bên tủ bếp",
    url: "/product-shots/shot1_lifestyle_hero_45deg.jpg",
    badge: "Ảnh chụp",
  },
  {
    label: "🦋 Cận cảnh nắp mở cánh bướm",
    url: "/product-shots/shot2_butterfly_split_lid.jpg",
    badge: "Ảnh chụp",
  },
  {
    label: "🦶 Bàn đạp pedal Inox",
    url: "/product-shots/shot3_foot_pedal_press.jpg",
    badge: "Ảnh chụp",
  },
  {
    label: "📦 2 Khung gài túi rác bên trong",
    url: "/product-shots/shot4_interior_dual_compartments.jpg",
    badge: "Ảnh chụp",
  },
  {
    label: "📹 Video gốc Người Bán Shopee (50s)",
    url: "/product-shopee/seller_video.mp4",
    badge: "Shopee Gốc",
  },
  {
    label: "🏠 Thùng rác dưới gầm quầy bar",
    url: "/product-shots/shot5_under_counter_lifestyle.jpg",
    badge: "Ảnh chụp",
  },
];

// Presets Mẫu Dự Án Sản Phẩm
const SHOPEE_PROJECT: { project: Project; title: string } = {
  title: "🛒 Thùng rác đạp chân nút nhấn Shopee (10L-20L)",
  project: {
    id: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
    title: "🛒 Thùng Rác Đạp Chân Nút Nhấn Shopee (10L-20L)",
    rawScript:
      "Thùng rác nhà bạn cứ buông chân ra là sập nắp, lại còn thò cái túi bóng lòng thòng ra ngoài trông xấu cả nhà? Đổi ngay sang em thùng rác đạp chân có nút nhấn thông minh này đi! Điểm ăn tiền nhất là cơ chế mở kép: bình thường đạp chân mở cực êm, nhưng lúc cần gọt hoa quả thì chỉ cần nhấn nút một cái là nắp mở giữ cố định luôn. Bên trong có sẵn thanh kẹp giấu kín túi rác, bên ngoài nhìn sạch bong tinh tế chuẩn đồ decor. Đủ size mười lít, mười lăm lít, hai mươi lít cho phòng khách và góc bếp. Đang sale giá cực hời, bấm ngay vào giỏ hàng bên dưới để rước em nó về nha!",
    audioUrl: "/product-shopee/voice_fast.wav",
    captionSrtUrl: null,
    captionVttUrl: null,
    durationMs: 30880,
    aspectRatio: "9:16",
    videoType: "product",
    status: "ready",
    errorMessage: null,
    characters: [],
    words: shopeeWords,
    createdAt: "2026-10-29T00:00:00Z",
    scenes: [
      {
        id: "78b96d5e-b499-45ef-b5a5-1b4655a6b1fa",
        projectId: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
        sceneIndex: 1,
        startMs: 0,
        endMs: 6000,
        transcriptText:
          "Thùng rác nhà bạn cứ buông chân ra là sập nắp, lại còn thò cái túi bóng lòng thòng ra ngoài trông xấu cả nhà? Đổi ngay sang em thùng rác đạp chân có nút nhấn thông minh này đi!",
        setting: "[1. HOOK & HERO REVEAL] • Căn phòng khách sang trọng, thùng rác trắng kem viền kim loại",
        characters: [],
        imagePrompt:
          "Eye-level cinematic commercial shot of a modern, sleek minimalist white rectangular trash can with chrome trim placed beside a cozy beige fabric sofa in a sunlit Scandinavian living room. High-end lifestyle aesthetics, clean interior decor, soft studio softbox illumination, subtle specular glint on polished chrome trim, 9:16 vertical commercial video, smooth forward camera glide, photorealistic 8k.",
        imageUrl: "/product-shopee/raw_1.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=7.98",
        cameraEffect: "zoom_in",
        transition: "fade",
        showCaption: true,
        autoFitSpeed: true,
        sourceDurationSec: 7.98,
        calloutTag: "Thiết kế",
        calloutText: "Đạp chân & nút nhấn",
        calloutPosition: "top_center",
        calloutTheme: "dark",
      },
      {
        id: "a54899cf-578c-4718-a718-e95999e7e575",
        projectId: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
        sceneIndex: 2,
        startMs: 6000,
        endMs: 13500,
        transcriptText:
          "Điểm ăn tiền nhất là cơ chế mở kép: bình thường đạp chân mở cực êm, nhưng lúc cần gọt hoa quả thì chỉ cần nhấn nút một cái là nắp mở giữ cố định luôn.",
        setting: "[2. DUAL-OPEN MECHANISM] • Bàn đạp trợ lực + Nút nhấn giữ nắp mở lâu dài",
        characters: [],
        imagePrompt:
          "Low-angle close-up macro transition shot: first showing a foot gently depressing the polished metal foot pedal with smooth rebound, then cutting to a human finger tapping the flush push-button latch on top, mechanically locking the butterfly lid wide open in a stationary stay-open position, crisp mechanical precision, warm studio lighting, 9:16 vertical, photorealistic.",
        imageUrl: "/product-shopee/raw_2.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=7.98",
        cameraEffect: "static",
        transition: "slide",
        showCaption: true,
        autoFitSpeed: true,
        sourceDurationSec: 7.98,
        calloutTag: "Cơ chế",
        calloutText: "Mở kép thông minh",
        calloutPosition: "top_center",
        calloutTheme: "dark",
      },
      {
        id: "e275159f-a075-4015-9737-05caeeee0e1f",
        projectId: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
        sceneIndex: 3,
        startMs: 13500,
        endMs: 20500,
        transcriptText:
          "Bên trong có sẵn thanh kẹp giấu kín túi rác, bên ngoài nhìn sạch bong tinh tế chuẩn đồ decor.",
        setting: "[3. CONCEALED BAG HOLDER] • Thanh kẹp giữ túi rác thông minh, không lộ túi ra ngoài",
        characters: [],
        imagePrompt:
          "High-angle top-down smooth glide looking directly into the open interior of the rectangular trash can, human hands effortlessly tucking a trash bag under the sleek internal clamping ring frame. The lid gently closes, leaving zero plastic bag edges visible from the outside, perfectly flush, elegant and neat, clean studio lighting, photorealistic 8k.",
        imageUrl: "/product-shopee/raw_3.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=7.98",
        cameraEffect: "static",
        transition: "wipe",
        showCaption: true,
        autoFitSpeed: true,
        sourceDurationSec: 7.98,
        calloutTag: "Khung kẹp",
        calloutText: "Giấu kín túi rác",
        calloutPosition: "top_center",
        calloutTheme: "dark",
      },
      {
        id: "4e0eb55e-3a1d-4da3-ae1d-5027335b038a",
        projectId: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
        sceneIndex: 4,
        startMs: 20500,
        endMs: 25500,
        transcriptText:
          "Đủ size mười lít, mười lăm lít, hai mươi lít cho phòng khách và góc bếp.",
        setting: "[4. MULTI-CAPACITY 10L 15L 20L] • 3 kích thước đa năng cho phòng khách, bếp, nhà tắm",
        characters: [],
        imagePrompt:
          "Wide catalog commercial tracking shot displaying three sizes of the white pedal trash can (10L, 15L, 20L) lined up neatly on a bright hardwood floor in ascending height order, modern minimalist home context, bright daylight, photorealistic commercial product presentation.",
        imageUrl: "/product-shopee/raw_4.mp4#crop=75,30,1.6,0&v=1&autofit=1&srcdur=7.98",
        cameraEffect: "static",
        transition: "slide",
        showCaption: true,
        autoFitSpeed: true,
        sourceDurationSec: 7.98,
        calloutTag: "Dung tích",
        calloutText: "Đủ size 10L - 20L",
        calloutPosition: "top_center",
        calloutTheme: "dark",
      },
      {
        id: "9450a44e-f1c5-4652-9754-641765b604e7",
        projectId: "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
        sceneIndex: 5,
        startMs: 25500,
        endMs: 30880,
        transcriptText:
          "Đang sale giá cực hời, bấm ngay vào giỏ hàng bên dưới để rước em nó về nha!",
        setting: "[5. LIFESTYLE OUTRO & CTA] • Không gian sống sang trọng & Thôi thúc bấm giỏ hàng Shopee",
        characters: [],
        imagePrompt:
          "Slow elegant push-in on the closed white trash can seamlessly integrated beside an oak kitchen cabinet, modern minimalist aesthetic, leaving ample clean negative space on the lower-left for shopping cart UI button overlay, high-conversion commercial outro.",
        imageUrl: "/product-shopee/raw_5.mp4#crop=50,50,1,0&v=1&autofit=1&srcdur=7.98",
        cameraEffect: "zoom_in",
        transition: "fade",
        showCaption: true,
        autoFitSpeed: true,
        sourceDurationSec: 7.98,
        calloutTag: "Ưu đãi",
        calloutText: "Giá hời bấm giỏ hàng",
        calloutPosition: "top_center",
        calloutTheme: "dark",
      },
    ],
  },
};


export const PRODUCT_DEMO_PRESETS: Record<string, { project: Project; title: string }> = {
  "55ff74ba-60bd-4106-8bbf-e5e47a86445e": SHOPEE_PROJECT,
  "demo-product-shopee-trashcan": SHOPEE_PROJECT,

  "demo-product-trashcan": {
    title: "🗑️ Thùng rác cánh bướm 2 ngăn (Video AI 26s)",
    project: {
      id: "demo-product-trashcan",
      title: "Thùng Rác Nắp Cánh Bướm 2 Ngăn Thông Minh",
      rawScript:
        "Bạn có đang phát điên vì chiếc thùng rác trong bếp vừa xấu, vừa vướng lại hay bốc mùi không? Xem ngay em này nè! Thiết kế nắp cánh bướm mở đôi siêu thông minh, đặt dưới gầm bàn vẫn mở thoải mái luôn! Bàn đạp trợ lực bằng inox cực êm, chỉ một chạm nhẹ là mở ngay mà không lo bẩn tay. Điểm đỉnh nhất là bên trong có sẵn hai quai gài túi riêng biệt, phân loại rác hữu cơ và tái chế cực kỳ tiện lợi. Màu trắng tinh tế, vỏ chống bám bẩn, chuẩn gu cho căn bếp hiện đại. Đang có giá cực tốt hôm nay, bấm ngay vào giỏ hàng góc trái bên dưới để rước em nó về nha!",
      audioUrl: "/product-trashcan/voiceover.wav",
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 25945,
      aspectRatio: "9:16",
      videoType: "product",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: trashcanWords,
      createdAt: "2026-10-28T00:00:00Z",
      scenes: [
        {
          id: "demo-tc-1",
          projectId: "demo-product-trashcan",
          sceneIndex: 1,
          startMs: 0,
          endMs: 4800,
          transcriptText:
            "Bạn có đang phát điên vì chiếc thùng rác trong bếp vừa xấu, vừa vướng lại hay bốc mùi không? Xem ngay em này nè!",
          setting: "[1. HOOK & INTRO] • Toàn cảnh góc bếp hiện đại và chiếc thùng rác",
          characters: [],
          imagePrompt:
            "Smooth push-in tracking shot of an elegant modern matte off-white trash can in kitchen corner",
          imageUrl: "/product-trashcan/scene1_kitchen.mp4",
          cameraEffect: "static",
          transition: "fade",
          showCaption: true,
        },
        {
          id: "demo-tc-2",
          projectId: "demo-product-trashcan",
          sceneIndex: 2,
          startMs: 4800,
          endMs: 8800,
          transcriptText:
            "Thiết kế nắp cánh bướm mở đôi siêu thông minh, đặt dưới gầm bàn vẫn mở thoải mái luôn!",
          setting: "[2. BUTTERFLY SPLIT LID] • Cận cảnh nắp mở đôi cánh bướm êm ái dưới gầm bàn",
          characters: [],
          imagePrompt:
            "Close-up of butterfly split dual lids opening outward simultaneously without touching table above",
          imageUrl: "/product-trashcan/scene2_butterfly.mp4",
          cameraEffect: "static",
          transition: "slide",
          showCaption: true,
        },
        {
          id: "demo-tc-3",
          projectId: "demo-product-trashcan",
          sceneIndex: 3,
          startMs: 8800,
          endMs: 13300,
          transcriptText:
            "Bàn đạp trợ lực bằng inox cực êm, chỉ một chạm nhẹ là mở ngay mà không lo bẩn tay.",
          setting: "[3. ACTION FOOT PEDAL] • Bàn đạp trợ lực inox dẫm nhẹ mở nắp không bẩn tay",
          characters: [],
          imagePrompt:
            "Low-angle close-up of foot depressing polished chrome foot pedal with tactile spring rebound",
          imageUrl: "/product-trashcan/scene3_pedal.mp4",
          cameraEffect: "static",
          transition: "fade",
          showCaption: true,
        },
        {
          id: "demo-tc-4",
          projectId: "demo-product-trashcan",
          sceneIndex: 4,
          startMs: 13300,
          endMs: 18300,
          transcriptText:
            "Điểm đỉnh nhất là bên trong có sẵn hai quai gài túi riêng biệt, phân loại rác hữu cơ và tái chế cực kỳ tiện lợi.",
          setting: "[4. INTERIOR DUAL LINER] • 2 ngăn phân loại rác tách biệt bên trong",
          characters: [],
          imagePrompt:
            "Top-down view into open interior showing dual separate bag-holder liner frames for waste sorting",
          imageUrl: "/product-trashcan/scene4_interior.mp4",
          cameraEffect: "static",
          transition: "wipe",
          showCaption: true,
        },
        {
          id: "demo-tc-5",
          projectId: "demo-product-trashcan",
          sceneIndex: 5,
          startMs: 18300,
          endMs: 25945,
          transcriptText:
            "Màu trắng tinh tế, vỏ chống bám bẩn, chuẩn gu cho căn bếp hiện đại. Đang có giá cực tốt hôm nay, bấm ngay vào giỏ hàng góc trái bên dưới để rước em nó về nha!",
          setting: "[5. LIFESTYLE OUTRO & CTA] • Căn bếp cao cấp và kêu gọi bấm giỏ hàng góc trái",
          characters: [],
          imagePrompt:
            "45-degree tracking shot showcasing sleek matte off-white body beside modern oak kitchen cabinets",
          imageUrl: "/product-trashcan/scene1_kitchen.mp4",
          cameraEffect: "zoom_in",
          transition: "fade",
          showCaption: true,
        },
      ],
    },
  },

  "demo-product-anc-headphone": {
    title: "🎧 Tai nghe chống ồn chủ động ANC (32s)",
    project: {
      id: "demo-product-anc-headphone",
      title: "Tai Nghe Không Dây Chống Ồn Chủ Động ANC Pro",
      rawScript:
        "Bạn mệt mỏi vì tiếng ồn văn phòng và tiếng còi xe inh ỏi? Đeo ngay chiếc tai nghe này vào và cảm nhận không gian yên tĩnh tuyệt đối! Công nghệ chống ồn chủ động Hybrid ANC triệt tiêu đến 98% tạp âm. Màng loa mạ titan 40mm mang đến âm bass uy lực, chi tiết từng nốt nhạc. Đệm tai memory foam siêu êm, đeo suốt 8 tiếng không đau tai. Thời lượng pin khủng lên đến 60 giờ nghe liên tục. Đặt hàng ngay hôm nay để nhận ưu đãi giảm 40%!",
      audioUrl: null,
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 31500,
      aspectRatio: "9:16",
      videoType: "product",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: [],
      createdAt: "2026-10-28T00:00:00Z",
      scenes: [
        {
          id: "demo-hp-1",
          projectId: "demo-product-anc-headphone",
          sceneIndex: 1,
          startMs: 0,
          endMs: 6200,
          transcriptText:
            "Bạn mệt mỏi vì tiếng ồn văn phòng và tiếng còi xe inh ỏi? Đeo ngay chiếc tai nghe này vào và cảm nhận không gian yên tĩnh tuyệt đối!",
          setting: "[1. HERO SHOT 45°] • Góc nghiêng toàn cảnh tai nghe xoay 3D lơ lửng",
          characters: [],
          imagePrompt:
            "Smooth 45-degree orbital pan around the floating subject rotating in dark studio, metallic earcups catching sharp cyan neon rim light sweep, 60fps cinematic commercial pacing, sound direction: no speech, subtle whoosh sfx",
          imageUrl: null,
          cameraEffect: "zoom_in",
          transition: "cut",
          showCaption: true,
        },
        {
          id: "demo-hp-2",
          projectId: "demo-product-anc-headphone",
          sceneIndex: 2,
          startMs: 6200,
          endMs: 12500,
          transcriptText:
            "Công nghệ chống ồn chủ động Hybrid ANC triệt tiêu đến 98% tạp âm xung quanh.",
          setting: "[2. MECHANISM SHOT] • Cận cảnh công tắc xúc giác và cảm biến Hybrid ANC",
          characters: [],
          imagePrompt:
            "Slow macro push-in on acoustic sensor grill on earcup, finger presses physical ANC tactile switch with LED indicator ring glowing cyan, 60fps slow motion, sound direction: no speech, crisp tactile mechanical button click sfx",
          imageUrl: null,
          cameraEffect: "zoom_out",
          transition: "slide",
          showCaption: true,
        },
        {
          id: "demo-hp-3",
          projectId: "demo-product-anc-headphone",
          sceneIndex: 3,
          startMs: 12500,
          endMs: 19000,
          transcriptText:
            "Màng loa mạ titan 40mm mang đến âm bass uy lực, chi tiết từng nốt nhạc.",
          setting: "[3. ACTION ANGLE] • Mặt cắt cơ học màng loa dao động âm trầm uy lực",
          characters: [],
          imagePrompt:
            "Exploded mechanical motion showing acoustic driver diaphragm vibrating with sonic energy pulses, studio rim light reflection gliding along the coil, 60fps, sound direction: no speech, low mechanical resonance hum sfx",
          imageUrl: null,
          cameraEffect: "pan_right",
          transition: "fade",
          showCaption: true,
        },
        {
          id: "demo-hp-4",
          projectId: "demo-product-anc-headphone",
          sceneIndex: 4,
          startMs: 19000,
          endMs: 25500,
          transcriptText:
            "Đệm tai memory foam siêu êm, đeo suốt 8 tiếng không đau tai. Thời lượng pin khủng lên đến 60 giờ nghe liên tục.",
          setting: "[4. INTERIOR SHOT] • Cận cảnh chất liệu đệm tai memory foam đàn hồi êm ái",
          characters: [],
          imagePrompt:
            "Macro close-up of textured ear cushion being pressed and smoothly springing back into shape with elastic memory, 60fps, sound direction: no speech, soft tactile cushion rebound sfx",
          imageUrl: null,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: true,
        },
        {
          id: "demo-hp-5",
          projectId: "demo-product-anc-headphone",
          sceneIndex: 5,
          startMs: 25500,
          endMs: 31500,
          transcriptText:
            "Đặt hàng ngay hôm nay để nhận ưu đãi giảm 40%! Nhấn vào giỏ hàng ngay thôi nào!",
          setting: "[5. SCALE/CONTEXT SHOT] • Hộp sạc nam châm cao cấp và bộ phụ kiện hoàn chỉnh",
          characters: [],
          imagePrompt:
            "Wide tracking pull-back beside carrying case with magnetic charging case snapping open, subject nesting inside with gold contact pins clicking in, 60fps commercial finish, sound direction: no speech, crisp magnetic snap and latching click sfx",
          imageUrl: null,
          cameraEffect: "zoom_in",
          transition: "fade",
          showCaption: true,
        },
      ],
    },
  },

  "demo-product-coffee-maker": {
    title: "☕ Máy pha cà phê Espresso (28s)",
    project: {
      id: "demo-product-coffee-maker",
      title: "Máy Pha Cà Phê Espresso Tự Động Mini",
      rawScript:
        "Bạn muốn thưởng thức một ly Espresso đậm đà chuẩn vị Ý ngay tại nhà chỉ trong 30 giây? Chiếc máy pha cà phê mini này chính là chân ái của bạn! Áp suất bơm 20 Bar tiêu chuẩn Ý chiết xuất lớp Crema vàng óng, thơm nức mũi. Vòi đánh sữa inox tạo bọt mịn màng cho ly Cappuccino béo ngậy. Kích thước siêu gọn, vừa vặn mọi góc bếp. Click vào góc màn hình để sở hữu ngay giá tốt nhất hôm nay!",
      audioUrl: null,
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 28200,
      aspectRatio: "9:16",
      videoType: "product",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: [],
      createdAt: "2026-10-28T00:00:00Z",
      scenes: [
        {
          id: "demo-cf-1",
          projectId: "demo-product-coffee-maker",
          sceneIndex: 1,
          startMs: 0,
          endMs: 5800,
          transcriptText:
            "Bạn muốn thưởng thức một ly Espresso đậm đà chuẩn vị Ý ngay tại nhà chỉ trong 30 giây?",
          setting: "[1. HERO SHOT 45°] • Toàn cảnh nghiêng máy pha cà phê mini trên mặt đá cẩm thạch",
          characters: [],
          imagePrompt:
            "Smooth 45-degree orbital pan around the compact machine, portafilter firmly locks into group head with firm mechanical twist, warm morning sunlight reflection sweep, 60fps commercial pacing, sound direction: no speech, solid mechanical metal twist and lock sfx",
          imageUrl: null,
          cameraEffect: "zoom_in",
          transition: "cut",
          showCaption: true,
        },
        {
          id: "demo-cf-2",
          projectId: "demo-product-coffee-maker",
          sceneIndex: 2,
          startMs: 5800,
          endMs: 12500,
          transcriptText:
            "Chiếc máy pha cà phê mini này chính là chân ái của bạn! Áp suất bơm 20 Bar tiêu chuẩn Ý chiết xuất lớp Crema vàng óng.",
          setting: "[2. MECHANISM SHOT] • Cận cảnh áp suất 20 Bar và đồng hồ cơ học chiết xuất Crema",
          characters: [],
          imagePrompt:
            "Slow macro push-in toward vintage mechanical pressure gauge needle smoothly climbing to 20 Bar, rich dark espresso streaming through dual spouts into glass cup, 60fps slow motion, sound direction: no speech, mechanical pump hum and espresso flow sfx",
          imageUrl: null,
          cameraEffect: "pan_right",
          transition: "slide",
          showCaption: true,
        },
        {
          id: "demo-cf-3",
          projectId: "demo-product-coffee-maker",
          sceneIndex: 3,
          startMs: 12500,
          endMs: 19800,
          transcriptText:
            "Vòi đánh sữa inox tạo bọt mịn màng cho ly Cappuccino béo ngậy. Kích thước siêu gọn, vừa vặn mọi góc bếp.",
          setting: "[3. ACTION ANGLE] • Thao tác gạt cần vòi đánh sữa inox tạo bọt microfoam mịn màng",
          characters: [],
          imagePrompt:
            "Low-angle tracking shot gliding toward stainless steel steam wand lever clicking upward, high pressure microfoam steam swirling milk inside pitcher, 60fps commercial pacing, sound direction: no speech, crisp steam lever click and smooth steam jet sfx",
          imageUrl: null,
          cameraEffect: "zoom_out",
          transition: "fade",
          showCaption: true,
        },
        {
          id: "demo-cf-4",
          projectId: "demo-product-coffee-maker",
          sceneIndex: 4,
          startMs: 19800,
          endMs: 28200,
          transcriptText:
            "Click vào góc màn hình để sở hữu ngay giá tốt nhất hôm nay!",
          setting: "[4. SCALE/CONTEXT SHOT] • Đặt cạnh góc bếp hiện đại cảm nhận kích thước nhỏ gọn và CTA",
          characters: [],
          imagePrompt:
            "Wide tracking pull-back revealing entire compact machine resting beside kitchen nook and croissants, LED power ring softly pulsing, 60fps commercial finish, sound direction: no speech, tactile switch click sfx",
          imageUrl: null,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: true,
        },
      ],
    },
  },
};

const TRASHCAN_DEMO_IDS = new Set([
  "55ff74ba-60bd-4106-8bbf-e5e47a86445e",
  "demo-product-shopee-trashcan",
  "demo-product-trashcan",
]);

/**
 * Trích xuất danh sách Media Pool riêng biệt cho từng dự án.
 * Tuyệt đối không trộn lẫn clip thùng rác (INITIAL_PRODUCT_CLIPS) sang dự án sản phẩm khác.
 */
export function extractProductMediaClips(p: Project): MediaPoolClip[] {
  const isTrashcanProject = TRASHCAN_DEMO_IDS.has(p.id);
  const seen = new Set<string>();
  const clips: MediaPoolClip[] = [];

  const addClip = (clip: MediaPoolClip) => {
    const cleanUrl = clip.url.split("#")[0];
    if (!cleanUrl || seen.has(cleanUrl)) return;
    seen.add(cleanUrl);
    clips.push(clip);
  };

  for (const s of p.scenes ?? []) {
    if (s.imageUrl) {
      const cleanUrl = s.imageUrl.split("#")[0];
      const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(cleanUrl);
      const shortLabel =
        s.calloutTag ||
        s.calloutText ||
        s.setting?.replace(/^\[.*?\]\s*•?\s*/, "").slice(0, 28) ||
        s.transcriptText.slice(0, 24);
      addClip({
        label: `${isVideo ? "🎬" : "🖼️"} Cảnh #${s.sceneIndex}: ${shortLabel}`,
        url: s.imageUrl,
        badge: `Cảnh ${s.sceneIndex}`,
      });

      // Nếu dự án có cặp ảnh tham chiếu chuẩn /product-xxx/clips/scene_0N.mp4 -> thêm luôn ảnh gốc tương ứng của dự án đó
      const clipMatch = cleanUrl.match(/^(\/product-(?!pinewoods)[^/]+)\/clips\/scene_(\d+)\.mp4$/i);
      if (clipMatch) {
        const [, folder, num] = clipMatch;
        addClip({
          label: `🖼️ Ảnh tham chiếu Cảnh #${s.sceneIndex}`,
          url: `${folder}/images/ref_scene_${num}.jpg`,
          badge: `Ref C${s.sceneIndex}`,
        });
      }
    }

    if (s.layers) {
      for (const layer of s.layers) {
        const layerUrl =
          (layer as any).mediaUrl || (layer as any).imageUrl || (layer as any).src;
        if (typeof layerUrl === "string" && layerUrl) {
          const cleanLayerUrl = layerUrl.split("#")[0];
          const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(cleanLayerUrl);
          addClip({
            label: `${isVideo ? "🎬" : "🖼️"} Layer: ${layer.name || `Cảnh #${s.sceneIndex}`}`,
            url: layerUrl,
            badge: `Layer C${s.sceneIndex}`,
          });
        }
      }
    }
  }

  if (isTrashcanProject) {
    for (const c of INITIAL_PRODUCT_CLIPS) {
      addClip(c);
    }
  }

  return clips;
}
