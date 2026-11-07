"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import type { PlayerRef } from "@remotion/player";
import {
  Check,
  Columns2,
  Copy,
  Film,
  FolderOpen,
  Loader2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  Plus,
  Redo2,
  Rocket,
  ShoppingBag,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  type MediaAspectRatio,
  type Project,
  type Scene,
} from "@storytoon/shared-types";
import { FPS, msToFrames } from "@storytoon/video-engine";
import { API_URL, api, fmtMs, type ProjectSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ProductPlayer } from "@/components/ProductPlayer";
import { RenderAndYoutubePanel } from "@/components/RenderAndYoutubePanel";
import { NleTimeline } from "@/components/nle/NleTimeline";
import { NleInspector } from "@/components/nle/NleInspector";
import { NleMediaPool, type MediaPoolClip } from "@/components/nle/NleMediaPool";
import { NleSceneViewer } from "@/components/nle/NleSceneViewer";
import { NleWorkspaceSwitcher } from "@/components/nle/NleWorkspaceSwitcher";
import { ProjectLoadingOverlay } from "@/components/nle/ProjectLoadingOverlay";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { useConfirmDialog, deleteProjectConfirm } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import trashcanWords from "@/lib/trashcan_words.json";
import shopeeWords from "@/lib/shopee_trashcan_words.json";

const MEDIA_BASE = `${API_URL}/media`;

// Thư viện Media mẫu cho video sản phẩm (các góc 3D Nano Banana + video render)
const INITIAL_PRODUCT_CLIPS: MediaPoolClip[] = [
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

const BLANK_PRODUCT_PROJECT: Project = {
  id: "new-blank-product",
  title: "Dự Án Sản Phẩm Mới",
  rawScript: "",
  aspectRatio: "9:16",
  videoType: "product",
  durationMs: 0,
  scenes: [],
  words: [],
  status: "ready",
  audioUrl: null,
  captionSrtUrl: null,
  captionVttUrl: null,
  errorMessage: null,
  characters: [],
  createdAt: new Date().toISOString(),
};

const PRODUCT_DEMO_PRESETS: Record<string, { project: Project; title: string }> = {
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
function extractProjectMediaClips(p: Project): MediaPoolClip[] {
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

const ASPECT_OPTIONS: { value: MediaAspectRatio; label: string }[] = [
  { value: "3:4", label: "3:4 Dọc" },
  { value: "4:3", label: "4:3 Chuẩn" },
  { value: "16:9", label: "16:9 Ngang" },
  { value: "1:1", label: "1:1 Vuông" },
];

function ProductStudioContent() {
  const playerRef = useRef<PlayerRef>(null);
  const searchParams = useSearchParams();
  const [confirm, confirmDialog] = useConfirmDialog();
  const queryId = searchParams.get("id") || searchParams.get("project");
  const isNew = searchParams.get("new") === "1";

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  // URL trỏ tới dự án thật (không phải mẫu) -> chưa có dữ liệu, KHÔNG hiển thị dự án mẫu trong lúc chờ API
  const opensRealProject = !isNew && !!queryId && !(queryId in PRODUCT_DEMO_PRESETS);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(() =>
    opensRealProject ? queryId : null
  );
  const [project, setProject] = useState<Project>(() => {
    if (isNew || opensRealProject) return BLANK_PRODUCT_PROJECT;
    if (queryId && queryId in PRODUCT_DEMO_PRESETS) {
      return PRODUCT_DEMO_PRESETS[queryId].project;
    }
    return PRODUCT_DEMO_PRESETS["demo-product-shopee-trashcan"].project;
  });

  // Undo / Redo Scene History Stack
  const [historyPast, setHistoryPast] = useState<Scene[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Scene[][]>([]);

  // NLE Workspace & Panel Visibility State (Giống hệt Football Studio)
  const [workspaceMode, setWorkspaceMode] = useState<"edit" | "deliver">("edit");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [viewerMode, setViewerMode] = useState<"dual" | "scene" | "program">("dual");

  const [selectedSceneId, setSelectedSceneId] = useState<string>(() => {
    if (isNew) return "";
    if (queryId && !(queryId in PRODUCT_DEMO_PRESETS)) return "";
    const initialProj =
      queryId && queryId in PRODUCT_DEMO_PRESETS
        ? PRODUCT_DEMO_PRESETS[queryId].project
        : PRODUCT_DEMO_PRESETS["demo-product-shopee-trashcan"].project;
    return initialProj.scenes[0]?.id ?? "";
  });
  const [videoClips, setVideoClips] = useState<MediaPoolClip[]>(() => {
    if (isNew) return [];
    if (queryId && !(queryId in PRODUCT_DEMO_PRESETS)) {
      // Đang chờ tải dự án thực tế từ API -> khởi tạo rỗng, tránh trộn lẫn clip thùng rác
      return [];
    }
    const initialProj =
      queryId && queryId in PRODUCT_DEMO_PRESETS
        ? PRODUCT_DEMO_PRESETS[queryId].project
        : PRODUCT_DEMO_PRESETS["demo-product-shopee-trashcan"].project;
    return extractProjectMediaClips(initialProj);
  });

  // Script & Voice Creator State
  const [title, setTitle] = useState(() => {
    if (isNew) return "";
    if (queryId && !(queryId in PRODUCT_DEMO_PRESETS)) return "";
    const initialProj =
      queryId && queryId in PRODUCT_DEMO_PRESETS
        ? PRODUCT_DEMO_PRESETS[queryId].project
        : PRODUCT_DEMO_PRESETS["demo-product-shopee-trashcan"].project;
    return initialProj.title;
  });
  const [script, setScript] = useState(() => {
    if (isNew) return "";
    if (queryId && !(queryId in PRODUCT_DEMO_PRESETS)) return "";
    const initialProj =
      queryId && queryId in PRODUCT_DEMO_PRESETS
        ? PRODUCT_DEMO_PRESETS[queryId].project
        : PRODUCT_DEMO_PRESETS["demo-product-shopee-trashcan"].project;
    return initialProj.rawScript;
  });
  const [selectedVoice, setSelectedVoice] = useState("Duyên Hà My");
  const [creatingVideo, setCreatingVideo] = useState(false);

  // Batch & Media Operations
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [attachingMedia, setAttachingMedia] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Frame aspect ratio cho scene crop (default: 3:4)
  const [frameAspectRatio, setFrameAspectRatio] = useState<MediaAspectRatio>("3:4");

  const updateScenesWithHistory = useCallback((updater: (prev: Scene[]) => Scene[]) => {
    setProject((prev) => {
      const nextScenes = updater(prev.scenes);
      setHistoryPast((h) => [...h.slice(-24), prev.scenes]);
      setHistoryFuture([]);
      return { ...prev, scenes: nextScenes };
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((h) => h.slice(0, -1));
    setHistoryFuture((f) => [project.scenes, ...f]);
    setProject((p) => ({ ...p, scenes: previous }));
    toast.info("Đã hoàn tác (Undo)");
  }, [historyPast, project.scenes]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((h) => [...h, project.scenes]);
    setProject((p) => ({ ...p, scenes: next }));
    toast.info("Đã làm lại (Redo)");
  }, [historyFuture, project.scenes]);

  const refreshList = useCallback(async () => {
    try {
      const list = await api.listProjects();
      setProjects(list.filter((p) => p.videoType === "product" || !p.videoType));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const handleCreateNewBlankProject = useCallback(() => {
    setHistoryPast([]);
    setHistoryFuture([]);
    setProject(BLANK_PRODUCT_PROJECT);
    setTitle("");
    setScript("");
    setSelectedSceneId("");
    setVideoClips([]);
    setShowLeftPanel(true);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/product?new=1");
    }
    toast.success("Đã mở dự án sản phẩm mới! Hãy nhập kịch bản hoặc thêm ảnh.");
  }, []);

  const handleAddFirstScene = useCallback(() => {
    const firstScene: Scene = {
      id: `sc-init-${Date.now()}`,
      projectId: project.id,
      sceneIndex: 1,
      startMs: 0,
      endMs: 4000,
      transcriptText: "Phân cảnh giới thiệu sản phẩm đầu tiên",
      setting: "Cảnh 1",
      characters: [],
      imagePrompt: "Commercial product showcase, clean studio lighting 4k",
      imageUrl: null,
      cameraEffect: "zoom_in",
      transition: "fade",
      showCaption: true,
    };
    updateScenesWithHistory(() => [firstScene]);
    setSelectedSceneId(firstScene.id);
    setProject((p) => ({ ...p, durationMs: 4000 }));
    toast.success("Đã thêm Cảnh #1 mới");
  }, [project.id, updateScenesWithHistory]);

  function loadDemoPreset(key: keyof typeof PRODUCT_DEMO_PRESETS) {
    const preset = PRODUCT_DEMO_PRESETS[key];
    setHistoryPast([]);
    setHistoryFuture([]);
    setProject(preset.project);
    setTitle(preset.project.title);
    setScript(preset.project.rawScript);
    setSelectedSceneId(preset.project.scenes[0]?.id ?? "");
    setVideoClips(extractProjectMediaClips(preset.project));
    toast.success(`Đã nạp mẫu: ${preset.title}`);
  }

  const loadExistingProject = useCallback(
    async (id: string) => {
      if (id === "__new_blank__" || id === "new-blank-product") {
        handleCreateNewBlankProject();
        return;
      }
      if (id in PRODUCT_DEMO_PRESETS) {
        return loadDemoPreset(id as keyof typeof PRODUCT_DEMO_PRESETS);
      }
      setLoadingProjectId(id);
      try {
        const p = await api.getProject(id);
        setHistoryPast([]);
        setHistoryFuture([]);
        setProject(p);
        setTitle(p.title);
        setScript(p.rawScript);
        if (p.scenes.length > 0) {
          setSelectedSceneId(p.scenes[0].id);
        } else {
          setSelectedSceneId("");
        }
        // Thay thế hoàn toàn Media Pool bằng danh sách media của chính dự án này (không gộp với prev)
        setVideoClips(extractProjectMediaClips(p));
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", `/product?id=${p.id}`);
        }
        toast.success(`Đã mở dự án: ${p.title}`);
      } catch (e) {
        toast.error("Không thể tải dự án", { description: (e as Error).message });
      } finally {
        setLoadingProjectId((cur) => (cur === id ? null : cur));
      }
    },
    [handleCreateNewBlankProject]
  );

  // Handle URL Query Params
  useEffect(() => {
    if (isNew && project.id !== BLANK_PRODUCT_PROJECT.id) {
      handleCreateNewBlankProject();
      return;
    }
    if (!isNew && queryId && queryId !== project.id) {
      loadExistingProject(queryId);
    }
  }, [queryId, isNew, project.id, handleCreateNewBlankProject, loadExistingProject]);

  // Polling updates while project is processing in backend
  useEffect(() => {
    if (
      project.id.startsWith("demo-") ||
      project.id === "new-blank-product" ||
      project.status === "ready" ||
      project.status === "failed"
    ) {
      return;
    }
    const t = setInterval(async () => {
      try {
        const updated = await api.getProject(project.id);
        if (
          updated.status !== project.status ||
          updated.scenes.length !== project.scenes.length
        ) {
          setProject(updated);
          setVideoClips(extractProjectMediaClips(updated));
          if (updated.status === "ready") {
            toast.success("Pipeline AI đã tạo xong video sản phẩm!");
            if (updated.scenes.length > 0) {
              setSelectedSceneId(updated.scenes[0].id);
            }
          } else if (updated.status === "failed") {
            toast.error(
              "Quá trình xử lý AI thất bại: " + (updated.errorMessage || "Lỗi không xác định")
            );
          }
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(t);
  }, [project.id, project.status, project.scenes.length]);

  // Đồng bộ Player timecode
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) =>
      setNowMs((e.detail.frame / FPS) * 1000);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, [project.id, workspaceMode, viewerMode]);

  const selectedScene = useMemo<Scene | null>(() => {
    if (!project.scenes.length) return null;
    return (
      project.scenes.find((s) => s.id === selectedSceneId) ??
      project.scenes[0] ??
      null
    );
  }, [project.scenes, selectedSceneId]);

  const playingScene = useMemo<Scene | null>(() => {
    if (!project.scenes.length) return null;
    return (
      project.scenes.find((s) => nowMs >= s.startMs && nowMs < s.endMs) ??
      project.scenes[0] ??
      null
    );
  }, [project.scenes, nowMs]);

  const seek = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(project.durationMs, ms));
      setNowMs(clamped);
      playerRef.current?.seekTo(Math.round((clamped / 1000) * FPS));
    },
    [project.durationMs]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause();
    } else {
      playerRef.current?.play();
    }
  }, [isPlaying]);


  async function handleDeleteCurrentProject(id: string, projectTitle: string) {
    if (id.startsWith("demo-")) {
      toast.info("Không thể xóa dự án mẫu cài sẵn!");
      return;
    }
    if (!(await confirm(deleteProjectConfirm(projectTitle)))) {
      return;
    }
    const toastId = toast.loading(`Đang xóa dự án "${projectTitle}"...`);
    try {
      await api.deleteProject(id);
      toast.success(`Đã xóa dự án "${projectTitle}"`, { id: toastId });
      loadDemoPreset("demo-product-trashcan");
      refreshList();
    } catch (e) {
      toast.error("Không thể xóa dự án", {
        id: toastId,
        description: (e as Error).message,
      });
    }
  }

  const handleSplitAtPlayhead = useCallback(() => {
    const target = project.scenes.find(
      (s) => nowMs >= s.startMs + 350 && nowMs <= s.endMs - 350
    );
    if (!target) {
      toast.warning("Playhead phải nằm trong cảnh và cách 2 mép ít nhất 0.35s");
      return;
    }

    const splitPoint = Math.round(nowMs);
    const words = target.transcriptText.split(/\s+/).filter(Boolean);
    const ratio =
      (splitPoint - target.startMs) / Math.max(1, target.endMs - target.startMs);
    const cutIdx = Math.max(
      1,
      Math.min(words.length - 1, Math.round(words.length * ratio))
    );
    const text1 = words.slice(0, cutIdx).join(" ") || target.transcriptText;
    const text2 = words.slice(cutIdx).join(" ") || target.transcriptText;

    const nextScenes: Scene[] = [];
    project.scenes.forEach((sc) => {
      if (sc.id !== target.id) {
        nextScenes.push(sc);
      } else {
        nextScenes.push({
          ...sc,
          endMs: splitPoint,
          transcriptText: text1,
        });
        nextScenes.push({
          ...sc,
          id: `${sc.id}-split-${Date.now()}`,
          startMs: splitPoint,
          endMs: sc.endMs,
          transcriptText: text2,
          transition: "cut",
        });
      }
    });

    const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
    updateScenesWithHistory(() => reindexed);
    if (!project.id.startsWith("demo-")) {
      api.saveProjectScenes(project.id, reindexed).catch(() => {});
    }
    toast.success(`Đã tách Cảnh #${target.sceneIndex} tại ${fmtMs(splitPoint)}`);
  }, [nowMs, project.id, project.scenes, updateScenesWithHistory]);

  const handleSplitSceneAtMs = useCallback(
    (sceneId: string, splitMs: number) => {
      const target = project.scenes.find((s) => s.id === sceneId);
      if (!target) return;
      if (splitMs <= target.startMs + 350 || splitMs >= target.endMs - 350) {
        toast.warning("Vui lòng chọn điểm cắt cách 2 mép ít nhất 0.35s");
        return;
      }
      const words = target.transcriptText.split(/\s+/).filter(Boolean);
      const ratio =
        (splitMs - target.startMs) / Math.max(1, target.endMs - target.startMs);
      const cutIdx = Math.max(
        1,
        Math.min(words.length - 1, Math.round(words.length * ratio))
      );
      const text1 = words.slice(0, cutIdx).join(" ") || target.transcriptText;
      const text2 = words.slice(cutIdx).join(" ") || target.transcriptText;

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc) => {
        if (sc.id !== target.id) {
          nextScenes.push(sc);
        } else {
          nextScenes.push({
            ...sc,
            endMs: splitMs,
            transcriptText: text1,
          });
          nextScenes.push({
            ...sc,
            id: `${sc.id}-split-${Date.now()}`,
            startMs: splitMs,
            endMs: sc.endMs,
            transcriptText: text2,
            transition: "cut",
          });
        }
      });
      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã tách Cảnh #${target.sceneIndex} tại ${fmtMs(splitMs)}`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleMergeScene = useCallback(
    (sceneId: string, direction: "prev" | "next") => {
      const idx = project.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return;

      const targetIdx = direction === "prev" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= project.scenes.length) {
        toast.warning(
          direction === "prev"
            ? "Đây là cảnh đầu tiên, không thể gộp về trước"
            : "Đây là cảnh cuối cùng, không thể gộp về sau"
        );
        return;
      }

      const firstScene =
        direction === "prev" ? project.scenes[targetIdx] : project.scenes[idx];
      const secondScene =
        direction === "prev" ? project.scenes[idx] : project.scenes[targetIdx];

      const mergedScene: Scene = {
        ...firstScene,
        endMs: secondScene.endMs,
        transcriptText: `${firstScene.transcriptText.trim()} ${secondScene.transcriptText.trim()}`.trim(),
        setting: firstScene.setting || secondScene.setting,
      };

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc, i) => {
        if (i === (direction === "prev" ? targetIdx : idx)) {
          nextScenes.push(mergedScene);
        } else if (i === (direction === "prev" ? idx : targetIdx)) {
          // skip merged
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(mergedScene.id);
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(
        `Đã gộp Cảnh #${firstScene.sceneIndex} và Cảnh #${secondScene.sceneIndex} thành một cảnh!`
      );
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleAddSceneAfter = useCallback(
    (afterSceneId: string) => {
      const idx = project.scenes.findIndex((s) => s.id === afterSceneId);
      if (idx === -1) return;
      const target = project.scenes[idx];
      const dur = target.endMs - target.startMs;
      if (dur < 1000) {
        toast.warning("Cảnh này quá ngắn (<1s) để chia thêm cảnh mới");
        return;
      }

      const midMs = Math.round(target.startMs + dur / 2);
      const words = target.transcriptText.split(/\s+/).filter(Boolean);
      const half = Math.max(1, Math.floor(words.length / 2));
      const t1 = words.slice(0, half).join(" ") || "Phân cảnh mới";
      const t2 = words.slice(half).join(" ") || "Phân cảnh mới tiếp theo";

      const newScene: Scene = {
        id: `sc-new-${Date.now()}`,
        projectId: project.id,
        sceneIndex: target.sceneIndex + 1,
        startMs: midMs,
        endMs: target.endMs,
        transcriptText: t2,
        setting: `Phân cảnh #${target.sceneIndex + 1}`,
        characters: target.characters ?? [],
        imagePrompt:
          target.imagePrompt ??
          "Slow macro push-in focusing on mechanical action, subtle studio softbox lighting shift, sound direction: tactile mechanical sfx, no speech",
        imageUrl: target.imageUrl ?? null,
        cameraEffect: "zoom_in",
        transition: "slide",
        showCaption: true,
      };

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc, i) => {
        if (i === idx) {
          nextScenes.push({ ...target, endMs: midMs, transcriptText: t1 });
          nextScenes.push(newScene);
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(newScene.id);
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã thêm Cảnh #${newScene.sceneIndex} mới`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleDeleteScene = useCallback(
    (sceneId: string) => {
      if (project.scenes.length <= 1) {
        toast.warning("Không thể xóa cảnh duy nhất của dự án!");
        return;
      }
      const idx = project.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return;
      const target = project.scenes[idx];

      const nextScenes: Scene[] = [];
      project.scenes.forEach((sc, i) => {
        if (sc.id === sceneId) return;
        if (i === idx - 1) {
          nextScenes.push({ ...sc, endMs: target.endMs });
        } else if (idx === 0 && i === 1) {
          nextScenes.push({ ...sc, startMs: target.startMs });
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(
        reindexed[Math.max(0, idx - 1)]?.id ?? reindexed[0]?.id ?? ""
      );
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã xóa Cảnh #${target.sceneIndex}`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleUpdateSceneBounds = useCallback(
    (
      sceneId: string,
      newStartMs: number,
      newEndMs: number,
      newTranscriptText?: string
    ) => {
      updateScenesWithHistory((scenes) =>
        scenes.map((sc) => {
          if (sc.id !== sceneId) return sc;
          return {
            ...sc,
            startMs: newStartMs,
            endMs: newEndMs,
            transcriptText: newTranscriptText ?? sc.transcriptText,
          };
        })
      );
      if (!project.id.startsWith("demo-")) {
        api
          .updateScene(sceneId, {
            startMs: newStartMs,
            endMs: newEndMs,
            transcriptText: newTranscriptText,
          })
          .catch(() => {});
      }
    },
    [project.id, updateScenesWithHistory]
  );

  const handleResizeSceneBoundary = useCallback(
    (leftSceneId: string, rightSceneId: string, newBoundaryMs: number) => {
      setProject((prev) => ({
        ...prev,
        scenes: prev.scenes.map((sc) => {
          if (sc.id === leftSceneId) return { ...sc, endMs: newBoundaryMs };
          if (sc.id === rightSceneId) return { ...sc, startMs: newBoundaryMs };
          return sc;
        }),
      }));
    },
    []
  );

  const handleResizeSceneBoundaryEnd = useCallback(
    (leftSceneId: string, rightSceneId: string, newBoundaryMs: number) => {
      let finalScenes: Scene[] = [];
      updateScenesWithHistory((scenes) => {
        finalScenes = scenes.map((sc) => {
          if (sc.id === leftSceneId) return { ...sc, endMs: newBoundaryMs };
          if (sc.id === rightSceneId) return { ...sc, startMs: newBoundaryMs };
          return sc;
        });
        return finalScenes;
      });

      if (!project.id.startsWith("demo-")) {
        Promise.all([
          api.updateScene(leftSceneId, { endMs: newBoundaryMs }),
          api.updateScene(rightSceneId, { startMs: newBoundaryMs }),
        ]).catch(() => {
          if (finalScenes.length > 0) {
            api.saveProjectScenes(project.id, finalScenes).catch(() => {});
          }
        });
      }
    },
    [project.id, updateScenesWithHistory]
  );

  async function attachMediaToSceneById(
    sceneId: string,
    mediaUrl: string,
    isLocalClip = false
  ) {
    const target = project.scenes.find((s) => s.id === sceneId);
    if (!target) return;

    if (
      isLocalClip &&
      !videoClips.some((c) => c.url.split("#")[0] === mediaUrl.split("#")[0])
    ) {
      const fileName = mediaUrl.split("/").pop()?.split("#")[0] ?? "Clip mới";
      setVideoClips((prev) => [
        { label: `🎬 ${fileName}`, url: mediaUrl, badge: "Upload" },
        ...prev,
      ]);
    }

    if (project.id.startsWith("demo-")) {
      updateScenesWithHistory((scenes) =>
        scenes.map((s) => (s.id === sceneId ? { ...s, imageUrl: mediaUrl } : s))
      );
      return;
    }

    setAttachingMedia(mediaUrl);
    try {
      const updated = isLocalClip
        ? await api.updateScene(sceneId, { imageUrl: mediaUrl })
        : await api.generateSceneImage(sceneId, mediaUrl);
      updateScenesWithHistory((scenes) =>
        scenes.map((s) => (s.id === sceneId ? { ...s, ...updated } : s))
      );
    } catch (e: any) {
      toast.error("Lỗi gắn Media vào cảnh", { description: e.message });
    } finally {
      setAttachingMedia(null);
    }
  }

  async function handleAttachMediaToSelectedScene(
    mediaUrl: string,
    isLocalClip = false
  ) {
    if (!selectedScene) return;
    await attachMediaToSceneById(selectedScene.id, mediaUrl, isLocalClip);
  }

  async function handleDropMediaOnScene(
    sceneId: string,
    mediaUrl: string,
    isLocalClip: boolean
  ) {
    const target = project.scenes.find((s) => s.id === sceneId);
    setSelectedSceneId(sceneId);
    await attachMediaToSceneById(sceneId, mediaUrl, isLocalClip);
    toast.success(`Đã thả Media vào Cảnh #${target?.sceneIndex ?? ""}`);
  }

  async function handleGenerateAllMissingBroll() {
    if (project.id.startsWith("demo-")) {
      toast.info("Dự án mẫu đã có sẵn hình ảnh sản phẩm chất lượng cao!");
      return;
    }
    const missing = project.scenes.filter((s) => !s.imageUrl);
    if (missing.length === 0) {
      toast.info("Tất cả các cảnh đã có hình ảnh!");
      return;
    }
    setBatchGenerating(true);
    const toastId = toast.loading(`Đang vẽ ${missing.length} ảnh sản phẩm FLUX AI...`);
    try {
      for (let i = 0; i < missing.length; i++) {
        const sc = missing[i];
        setBatchProgress(`${i + 1}/${missing.length}`);
        const updated = await api.generateSceneImage(sc.id, sc.imagePrompt);
        setProject((prev) => {
          const nextProj = {
            ...prev,
            scenes: prev.scenes.map((x) =>
              x.id === sc.id ? { ...x, ...updated } : x
            ),
          };
          setVideoClips(extractProjectMediaClips(nextProj));
          return nextProj;
        });
      }
      toast.success("Đã vẽ xong toàn bộ ảnh sản phẩm FLUX!", { id: toastId });
    } catch (e: any) {
      toast.error("Lỗi vẽ ảnh hàng loạt", {
        id: toastId,
        description: e.message,
      });
    } finally {
      setBatchGenerating(false);
      setBatchProgress("");
    }
  }

  const updateSelectedScene = useCallback(
    (updated: Scene) => {
      updateScenesWithHistory((scenes) =>
        scenes.map((x) => (x.id === updated.id ? updated : x))
      );
    },
    [updateScenesWithHistory]
  );

  // Khởi tạo Pipeline AI: Tạo Voice AI (Duyên Hà My / VieNeu) + Tự động chia cảnh < 8s
  async function handleCreateAndProcess() {
    if (!script.trim()) {
      toast.warning("Vui lòng nhập kịch bản mô tả sản phẩm!");
      return;
    }

    setCreatingVideo(true);
    const toastId = toast.loading(
      `Đang tổng hợp giọng (${selectedVoice}) & phân cảnh sản phẩm (< 8s)...`
    );

    try {
      const created = await api.createProject({
        title: title.trim() || "Video Giới Thiệu Sản Phẩm",
        script: script.trim(),
        aspectRatio: "9:16",
        videoType: "product",
      });

      await api.processProject(created.id, selectedVoice);

      // Nạp dữ liệu dự án vừa tạo
      const latest = await api.getProject(created.id);
      setHistoryPast([]);
      setHistoryFuture([]);
      setProject(latest);
      setVideoClips(extractProjectMediaClips(latest));
      if (latest.scenes.length > 0) {
        setSelectedSceneId(latest.scenes[0].id);
      } else {
        setSelectedSceneId("");
      }
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `/product?id=${created.id}`);
      }

      toast.success(
        `Đã khởi chạy Pipeline AI sản phẩm với giọng ${selectedVoice}!`,
        { id: toastId }
      );
      setCreatingVideo(false);
      refreshList();
    } catch (e: any) {
      toast.error("Lỗi tạo dự án sản phẩm", {
        id: toastId,
        description: e.message,
      });
      setCreatingVideo(false);
    }
  }

  // NLE Hotkeys (Space, S, Cmd+Z, Cmd+Shift+Z, Arrows, 1/2/3)
  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      togglePlay();
    },
    { enableOnFormTags: false },
    [togglePlay]
  );
  useHotkeys(
    "left",
    (e) => {
      e.preventDefault();
      seek(nowMs - Math.round(1000 / FPS));
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "right",
    (e) => {
      e.preventDefault();
      seek(nowMs + Math.round(1000 / FPS));
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "shift+left",
    (e) => {
      e.preventDefault();
      seek(nowMs - 1000);
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "shift+right",
    (e) => {
      e.preventDefault();
      seek(nowMs + 1000);
    },
    { enableOnFormTags: false },
    [nowMs, seek]
  );
  useHotkeys(
    "s",
    (e) => {
      e.preventDefault();
      handleSplitAtPlayhead();
    },
    { enableOnFormTags: false },
    [handleSplitAtPlayhead]
  );
  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      handleUndo();
    },
    { enableOnFormTags: false },
    [handleUndo]
  );
  useHotkeys(
    "mod+shift+z, mod+y",
    (e) => {
      e.preventDefault();
      handleRedo();
    },
    { enableOnFormTags: false },
    [handleRedo]
  );
  useHotkeys("1", () => setViewerMode("dual"), [setViewerMode]);
  useHotkeys("2", () => setViewerMode("scene"), [setViewerMode]);
  useHotkeys("3", () => setViewerMode("program"), [setViewerMode]);

  const exportedConfigJson = useMemo(() => {
    return JSON.stringify(
      {
        durationInFrames: msToFrames(Math.max(project.durationMs, 1000)),
        fps: 30,
        aspectRatio: "9:16",
        audioSrc: project.audioUrl,
        scenes: project.scenes.map((sc, idx) => ({
          sceneIndex: sc.sceneIndex,
          src: sc.imageUrl,
          startFrame: msToFrames(sc.startMs),
          durationInFrames: Math.max(15, msToFrames(sc.endMs - sc.startMs)),
          motion: sc.cameraEffect,
          transition: idx === 0 ? "none" : sc.transition,
          transcriptText: sc.transcriptText,
          imagePrompt: sc.imagePrompt,
        })),
      },
      null,
      2
    );
  }, [project]);

  const missingCount = useMemo(
    () => project.scenes.filter((s) => !s.imageUrl).length,
    [project.scenes]
  );

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-surface-1 text-zinc-100 select-none">
      {loadingProjectId && <ProjectLoadingOverlay />}
      {confirmDialog}
      {/* 1. TOP NLE HEADER BAR (48px - Giống hệt Football Studio) */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800/90 bg-surface-3 px-3 z-20">
        {/* Left: Media Pool Toggle + Brand Badge + Project Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Media Pool (Thư viện media & kịch bản)"
                type="button"
                onClick={() => setShowLeftPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showLeftPanel
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Media Pool (Thư viện media & kịch bản)</TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            onClick={handleCreateNewBlankProject}
            className="h-7 gap-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-sm shadow-emerald-950/40 shrink-0 px-2.5"
            title="Tạo dự án sản phẩm trắng hoàn toàn mới"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Tạo mới</span>
          </Button>

          <Select
            value={
              loadingProjectId
                ? loadingProjectId
                : project.id === "new-blank-product"
                  ? "__new_blank__"
                  : project.id
            }
            onValueChange={loadExistingProject}
          >
            <SelectTrigger className="h-7 w-[240px] border-zinc-700/80 bg-zinc-900/90 text-xs text-zinc-100 font-medium">
              <SelectValue placeholder="Chọn dự án sản phẩm..." />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-surface-3 text-zinc-200">
              <SelectGroup>
                <SelectItem
                  value="__new_blank__"
                  className="text-xs font-bold text-emerald-400 focus:text-emerald-300"
                >
                  ➕ Tạo mới dự án trắng (Blank)
                </SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                  Dự án mẫu (Demo)
                </SelectLabel>
                <SelectItem value="demo-product-shopee-trashcan" className="text-xs font-semibold text-emerald-400">
                  🛒 [Mới] Thùng rác Shopee đạp chân có nút nhấn (31s)
                </SelectItem>
                <SelectItem value="demo-product-trashcan" className="text-xs font-semibold">
                  🗑️ [Mẫu] Thùng rác cánh bướm 2 ngăn (26s)
                </SelectItem>
                <SelectItem value="demo-product-anc-headphone" className="text-xs">
                  🎧 [Mẫu] Tai nghe chống ồn ANC (32s)
                </SelectItem>
                <SelectItem value="demo-product-coffee-maker" className="text-xs">
                  ☕ [Mẫu] Máy pha cà phê Espresso (28s)
                </SelectItem>
              </SelectGroup>

              {projects.filter((p) => !p.id.startsWith("demo-")).length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1 border-t border-zinc-800 mt-1 pt-1">
                    Dự án của bạn
                  </SelectLabel>
                  {projects
                    .filter((p) => !p.id.startsWith("demo-"))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.title} ({fmtMs(p.durationMs)})
                      </SelectItem>
                    ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>

          {!project.id.startsWith("demo-") && project.id !== "new-blank-product" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Xóa dự án này khỏi hệ thống"
                  type="button"
                  onClick={() => handleDeleteCurrentProject(project.id, project.title)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Xóa dự án này khỏi hệ thống</TooltipContent>
            </Tooltip>
          )}

          {/* Undo / Redo Buttons */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Hoàn tác (Cmd+Z)"
                  type="button"
                  disabled={historyPast.length === 0}
                  onClick={handleUndo}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Hoàn tác (Cmd+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button aria-label="Làm lại (Cmd+Shift+Z)"
                  type="button"
                  disabled={historyFuture.length === 0}
                  onClick={handleRedo}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <Redo2 className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Làm lại (Cmd+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Center: DaVinci Resolve Workspace Switcher (Edit vs Deliver) + Dual Monitor Mode */}
        <div className="flex items-center gap-2">
          <NleWorkspaceSwitcher mode={workspaceMode} onChange={setWorkspaceMode} accent="emerald" />

          {workspaceMode === "edit" && (
            <div className="hidden lg:flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 text-[11px] gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Dual Monitor (Cảnh đang làm + Full Video)"
                    type="button"
                    onClick={() => setViewerMode("dual")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "dual"
                        ? "bg-emerald-500 text-black font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Dual Monitor (Cảnh đang làm + Full Video)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Single Monitor (Chỉ xem Cảnh đang làm)"
                    type="button"
                    onClick={() => setViewerMode("scene")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "scene"
                        ? "bg-emerald-500 text-black font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Square className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Single Monitor (Chỉ xem Cảnh đang làm)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Single Monitor (Chỉ xem Full Video)"
                    type="button"
                    onClick={() => setViewerMode("program")}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center rounded transition-colors",
                      viewerMode === "program"
                        ? "bg-emerald-500 text-black font-bold"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    <Film className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Single Monitor (Chỉ xem Full Video)</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Right: Panel Toggles */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Đóng / Mở Timeline"
                type="button"
                onClick={() => setShowBottomPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showBottomPanel
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <PanelBottom className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Đóng / Mở Timeline</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Đóng / Mở Inspector"
                type="button"
                onClick={() => setShowRightPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showRightPanel
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <PanelRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Đóng / Mở Inspector</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* 2. RESIZABLE NLE WORKSPACE: EDIT MODE vs DELIVER MODE */}
      {workspaceMode === "edit" ? (
        <ResizablePanelGroup orientation="vertical" className="flex-1 min-h-0">
          {/* TOP DOCK (Media Pool | Dual Monitors | Inspector) */}
          <ResizablePanel defaultSize={showBottomPanel ? "70%" : "100%"} minSize="35%">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
              {/* LEFT DOCK: Media Pool & AI Script (Collapsible) */}
              {showLeftPanel && (
                <>
                  <ResizablePanel defaultSize="20%" minSize="14%" maxSize="35%">
                    <NleMediaPool
                      selectedScene={selectedScene}
                      videoClips={videoClips}
                      attachingMedia={attachingMedia}
                      onAttachMedia={handleAttachMediaToSelectedScene}
                      missingCount={missingCount}
                      batchGenerating={batchGenerating}
                      batchProgress={batchProgress}
                      onGenerateAllMissing={handleGenerateAllMissingBroll}
                      title={title}
                      setTitle={setTitle}
                      script={script}
                      setScript={setScript}
                      selectedVoice={selectedVoice}
                      setSelectedVoice={setSelectedVoice}
                      creatingVideo={creatingVideo}
                      onCreateAndProcess={handleCreateAndProcess}
                      onClose={() => setShowLeftPanel(false)}
                      initialTab={project.scenes.length === 0 ? "script" : "media"}
                      titlePlaceholder="Ví dụ: Review Thùng Rác Thông Minh Đạp Chân 2026"
                      scriptPlaceholder="Nhập kịch bản giới thiệu sản phẩm (Hook 3s -> Tính năng nổi bật -> Ưu đãi/CTA)..."
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle direction="horizontal" />
                </>
              )}

              {/* CENTER DOCK: DaVinci Resolve Dual Monitors (Left = Scene Monitor, Right = Program Full Video) */}
              <ResizablePanel
                defaultSize={
                  showLeftPanel && showRightPanel
                    ? "56%"
                    : showLeftPanel || showRightPanel
                      ? "78%"
                      : "100%"
                }
                minSize="30%"
              >
                <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
                  {/* Left Monitor: Scene Monitor (Active Scene Crop & In-Point Trim) */}
                  {(viewerMode === "dual" || viewerMode === "scene") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <NleSceneViewer
                        scene={selectedScene}
                        frameAspectRatio={frameAspectRatio}
                        onSceneChange={updateSelectedScene}
                        onSeekToScene={seek}
                        defaultShowCropFrame={false}
                      />
                    </ResizablePanel>
                  )}

                  {viewerMode === "dual" && (
                    <ResizableHandle withHandle direction="horizontal" />
                  )}

                  {/* Right Monitor: Program Monitor (Full Assembled Video 9:16) */}
                  {(viewerMode === "dual" || viewerMode === "program") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <div className="flex h-full w-full flex-col min-w-0 bg-background overflow-hidden">
                        {/* Program Monitor Compact Transport Bar */}
                        <div className="flex h-8 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-surface-2 px-2.5 text-[11px]">
                          <button
                            type="button"
                            onClick={togglePlay}
                            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-700"
                            title="Phím tắt: Space"
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="h-3 w-3 text-amber-400" /> Dừng
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 text-emerald-400" /> Phát
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="font-bold text-emerald-400">
                              {fmtMs(nowMs)}
                            </span>
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-400">
                              {fmtMs(project.durationMs)}
                            </span>
                          </div>
                        </div>

                        {/* Remotion Full 9:16 Vertical Player Monitor */}
                        <div className="relative flex flex-1 min-h-0 items-center justify-center p-2.5 overflow-hidden">
                          {project.scenes.length === 0 ? (
                            <div className="flex h-full w-full max-w-[280px] aspect-[9/16] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-800 bg-surface-2 p-6 text-center shadow-xl">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
                                <Sparkles className="h-6 w-6" />
                              </div>
                              <h4 className="text-sm font-bold text-zinc-100 mb-1">Dự Án Trắng (Blank)</h4>
                              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                                Chưa có phân cảnh nào. Nhập kịch bản ở Media Pool để AI tạo giọng đọc và phân cảnh tự động.
                              </p>
                              <Button
                                size="sm"
                                onClick={() => setShowLeftPanel(true)}
                                className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs"
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                                Mở Kịch Bản &amp; Giọng AI
                              </Button>
                            </div>
                          ) : (
                            <ProductPlayer ref={playerRef} project={project} />
                          )}
                        </div>
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>

              {/* RIGHT DOCK: Inspector for Selected Scene & Prompt Assistant (Collapsible) */}
              {showRightPanel && (
                <>
                  <ResizableHandle withHandle direction="horizontal" />
                  <ResizablePanel defaultSize="24%" minSize="16%" maxSize="38%">
                    <NleInspector
                      scene={selectedScene}
                      totalScenes={project.scenes.length}
                      frameAspectRatio={frameAspectRatio}
                      onSceneChange={updateSelectedScene}
                      onSeek={seek}
                      onClose={() => setShowRightPanel(false)}
                      allScenes={project.scenes}
                      words={project.words ?? []}
                      totalDurationMs={project.durationMs}
                      onUpdateBounds={handleUpdateSceneBounds}
                      onSplitSceneAtMs={handleSplitSceneAtMs}
                      onMergeScene={handleMergeScene}
                      onAddSceneAfter={handleAddSceneAfter}
                      onDeleteScene={handleDeleteScene}
                      audioUrl={project.audioUrl}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* 3. BOTTOM DOCK: Multi-Track NLE Timeline (Resizable Height + Collapsible) */}
          {showBottomPanel && (
            <>
              <ResizableHandle withHandle direction="vertical" />
              <ResizablePanel defaultSize="34%" minSize="18%" maxSize="65%">
                <NleTimeline
                  scenes={project.scenes}
                  durationMs={project.durationMs}
                  nowMs={nowMs}
                  selectedSceneId={selectedScene?.id ?? null}
                  onSelectScene={(sc) => setSelectedSceneId(sc.id)}
                  onSeek={seek}
                  audioUrl={project.audioUrl}
                  bgmUrl={`${MEDIA_BASE}/football-assets/bgm.mp3`}
                  onResizeSceneBoundary={handleResizeSceneBoundary}
                  onResizeSceneBoundaryEnd={handleResizeSceneBoundaryEnd}
                  onDropMediaOnScene={handleDropMediaOnScene}
                  onSplitAtPlayhead={handleSplitAtPlayhead}
                  onAddScene={() => {
                    if (project.scenes.length === 0) {
                      handleAddFirstScene();
                    } else if (selectedScene) {
                      handleAddSceneAfter(selectedScene.id);
                    } else if (project.scenes.length > 0) {
                      handleAddSceneAfter(project.scenes[project.scenes.length - 1].id);
                    }
                  }}
                  onMergeSelectedWithNext={() =>
                    selectedScene && handleMergeScene(selectedScene.id, "next")
                  }
                  canUndo={historyPast.length > 0}
                  canRedo={historyFuture.length > 0}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      ) : (
        /* DELIVER WORKSPACE (Render MP4 & Upload YouTube) */
        <div className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7 rounded-xl bg-surface-3 p-5 shadow-xl border border-zinc-800">
              <div className="mb-4 flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-zinc-100">
                    <Rocket className="h-5 w-5 text-emerald-400" />
                    Deliver: Kết xuất MP4 (1080p) &amp; Đăng YouTube Shorts
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Dự án: <strong className="text-zinc-200">{project.title}</strong> • Chuẩn 9:16 Fullscreen
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkspaceMode("edit")}
                  className="h-7 text-xs border-0 bg-zinc-800/80 text-zinc-300 hover:text-white"
                >
                  ← Quay lại Bàn dựng
                </Button>
              </div>

              <RenderAndYoutubePanel
                projectId={project.id}
                compositionId="ProductCommercialVideo"
                inputProps={{
                  audioUrl: project.audioUrl,
                  durationMs: Math.max(project.durationMs, 1000),
                  aspectRatio: "9:16",
                  words: project.words ?? [],
                  scenes: project.scenes ?? [],
                  bgmUrl: `${MEDIA_BASE}/football-assets/bgm.mp3`,
                  bgmVolume: 0.12,
                }}
                defaultTitle={`${project.title} #Shorts #Review`}
                script={project.rawScript}
              />
            </div>

            {/* Quick Preview Specs & Remotion Props JSON */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="rounded-xl bg-surface-3 p-5 shadow-xl border border-zinc-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Thông Số Kỹ Thuật Render
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Độ phân giải:</span>
                    <span className="font-mono font-semibold text-white">1080 × 1920 (9:16)</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Tốc độ khung hình:</span>
                    <span className="font-mono font-semibold text-white">30 FPS</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Tổng thời lượng:</span>
                    <span className="font-mono font-semibold text-white">
                      {(project.durationMs / 1000).toFixed(1)}s ({msToFrames(project.durationMs)} frames)
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/80 pb-1.5">
                    <span className="text-zinc-400">Tổng số phân cảnh:</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {project.scenes.length} phân cảnh (&lt; 8s/cảnh)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Voice-Over lồng tiếng:</span>
                    <span className="font-mono font-semibold text-white">
                      {selectedVoice} (VieNeu)
                    </span>
                  </div>
                </div>
              </div>

              <details className="group rounded-xl bg-surface-3 p-4 shadow-xl border border-zinc-800">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    Cấu hình Remotion Props (JSON)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs border-0 bg-zinc-800/80"
                    onClick={(e) => {
                      e.preventDefault();
                      navigator.clipboard.writeText(exportedConfigJson);
                      setCopiedJson(true);
                      toast.success("Đã copy cấu hình JSON vào clipboard");
                      setTimeout(() => setCopiedJson(false), 1500);
                    }}
                  >
                    {copiedJson ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Đã copy
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </summary>
                <pre className="mt-3 max-h-[300px] overflow-auto rounded-lg bg-zinc-950 p-3 text-[10px] leading-relaxed text-emerald-400">
                  {exportedConfigJson}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
          Đang khởi động Product Studio...
        </div>
      }
    >
      <ProductStudioContent />
    </Suspense>
  );
}
