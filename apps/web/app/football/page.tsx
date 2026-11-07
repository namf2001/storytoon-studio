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
  Square,
  Terminal,
  Trash2,
  Trophy,
} from "lucide-react";
import {
  type FootballBroadcastConfig,
  type MediaAspectRatio,
  type Project,
  type Scene,
} from "@storytoon/shared-types";
import { FPS, msToFrames } from "@storytoon/video-engine";
import { API_URL, api, fmtMs, type ProjectSummary } from "@/lib/api";
import { cn } from "@/lib/utils";
import { FootballPlayer } from "@/components/FootballPlayer";
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

const MEDIA_BASE = `${API_URL}/media`;

const INITIAL_VIDEO_CLIPS: MediaPoolClip[] = [
  {
    label: "⚽ Bàn 1: Mbappé 41' (0-1 Cận sân 6.7s)",
    url: `${MEDIA_BASE}/football-clips/goal_1_mbappe_41m_closeup.mp4#crop=50,60,1.05,0&v=1`,
    badge: "6.7s",
  },
  {
    label: "⚽ Bàn 2: Raphinha 61' (1-1 Gỡ hòa 10.9s)",
    url: `${MEDIA_BASE}/football-clips/goal_2_raphinha_61m.mp4#crop=50,65,1.05,0&v=1`,
    badge: "10.9s",
  },
  {
    label: "⚽ Bàn 3: Mbappé 87' (1-2 Ấn định 11.3s)",
    url: `${MEDIA_BASE}/football-clips/goal_3_mbappe_87m_main.mp4#crop=50,55,1.05,0&v=1`,
    badge: "11.3s",
  },
  {
    label: "🎬 Bàn 1 Full 2 góc quay (35s)",
    url: `${MEDIA_BASE}/football-clips/goal_1_mbappe_41m_full.mp4#crop=50,55,1,7&v=1`,
    badge: "35.1s",
  },
  {
    label: "🎬 Bàn 3 Full ăn mừng (29.5s)",
    url: `${MEDIA_BASE}/football-clips/goal_3_mbappe_87m_full.mp4#crop=50,55,1,11&v=1`,
    badge: "29.5s",
  },
];

function defaultBroadcastConfig(theme: "navy" | "crimson" = "navy"): FootballBroadcastConfig {
  return {
    templateId: "broadcast_stripes",
    backgroundColor: theme === "crimson" ? "#BA0C2F" : "#0A1C3E",
    backgroundTheme: theme,
    backgroundScrollSpeed: 0.35,
    mediaAspectRatio: "3:4",
    showFrameBorders: true,
    frameBorderColor: "#FFFFFF",
    showTicker: true,
    tickerText: "SIÊU KINH ĐIỂN LA LIGA",
    tickerSocialText: "f  |  yt  |  tiktok  |  @nguoidabong  |  NGƯỜI ĐÁ BÓNG",
    dateText: "26/10/2026",
    categoryText: "EL CLASICO:",
    categoryColor: "#FFD600",
    headlines: [
      "Barca 1 - 2 Real Madrid:",
      "Mbappé lập cú đúp nhấn chìm Camp Nou!",
    ],
    headlineColor: "#FFFFFF",
    headlineFontSize: 42,
    watermarkLogoUrl: `${MEDIA_BASE}/football-assets/nguoi_da_bong_logo.png`,
    watermarkText: "NGƯỜI ĐÁ BÓNG",
    bgmUrl: `${MEDIA_BASE}/football-assets/bgm.mp3`,
    bgmVolume: 0.14,
    enableTransitionSfx: true,
    sfxBaseUrl: `${MEDIA_BASE}/football-assets/sfx`,
    enableFlashOnTransition: true,
    showCaptions: false,
    backgroundTileUrl:
      theme === "crimson"
        ? `${MEDIA_BASE}/football-assets/broadcast_seamless_tile_red.png`
        : `${MEDIA_BASE}/football-assets/broadcast_seamless_tile_blue.png`,
    backgroundVideoUrl: `${MEDIA_BASE}/football-assets/bg_loop.mp4`,
  };
}

const DEMO_PRESETS: Record<
  "el_clasico" | "mancity_psg" | "roma_real" | "vtv_news_reel",
  { project: Project; config: Partial<FootballBroadcastConfig> }
> = {
  el_clasico: {
    config: {
      templateId: "broadcast_stripes",
      mediaAspectRatio: "3:4",
      categoryText: "EL CLASICO:",
      categoryColor: "#FFD600",
      headlines: [
        "Barca 1 - 2 Real Madrid:",
        "Mbappé lập cú đúp nhấn chìm Camp Nou!",
      ],
      tickerText: "SIÊU KINH ĐIỂN LA LIGA",
      dateText: "26/10/2026",
    },
    project: {
      id: "demo-el-clasico-goals",
      title: "[Video] Barca 1-2 Real Madrid (3 Bàn Thắng)",
      rawScript:
        "Camp Nou chết lặng ở phút tám mươi bảy, Kylian Mbappe nhấn chìm Barcelona ngay tại thánh địa của đại kình địch! Bước vào trận Siêu Kinh Điển với chuỗi bất bại từ đầu mùa, Barca tràn lên ép sân. Thế nhưng phút bốn mươi mốt, Mbappe mở tỷ số cho Real Madrid. Sang hiệp hai, Raphinha gỡ hòa một đều ở phút sáu mươi mốt. Thế nhưng đúng phút tám mươi bảy, vẫn là Mbappe hoàn tất cú đúp ấn định chiến thắng hai một. Theo bạn ai sẽ vô địch La Liga mùa này?",
      audioUrl: `${MEDIA_BASE}/035e4ce0-cb0a-42fb-a9a3-22d35c0bd275/voice.wav`,
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 40060,
      aspectRatio: "9:16",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: [],
      createdAt: "2026-10-26T00:00:00Z",
      scenes: [
        {
          id: "demo-ec-1",
          projectId: "demo-el-clasico-goals",
          sceneIndex: 1,
          startMs: 0,
          endMs: 5920,
          transcriptText:
            "Camp Nou chết lặng ở phút tám mươi bảy, Kylian Mbappe nhấn chìm Barcelona ngay tại thánh địa của đại kình địch!",
          setting: "[CAMP NOU CHẾT LẶNG] • Mbappe ăn mừng bàn thắng",
          characters: ["Kylian Mbappe"],
          imagePrompt: "Kylian Mbappe in white Real Madrid kit celebrating at Camp Nou",
          imageUrl: `${MEDIA_BASE}/035e4ce0-cb0a-42fb-a9a3-22d35c0bd275/images/scene_001_1792999583.jpeg`,
          cameraEffect: "zoom_in",
          transition: "cut",
          showCaption: false,
        },
        {
          id: "demo-ec-2",
          projectId: "demo-el-clasico-goals",
          sceneIndex: 2,
          startMs: 5920,
          endMs: 13460,
          transcriptText:
            "Bước vào trận Siêu Kinh Điển với chuỗi bất bại từ đầu mùa, Barca tràn lên ép sân nhằm đòi lại món nợ lượt đi.",
          setting: "[BARCA ÉP SÂN] • Toàn cảnh sân Camp Nou",
          characters: ["Barcelona"],
          imagePrompt: "Barcelona attacking Real Madrid at packed Camp Nou stadium",
          imageUrl: `${MEDIA_BASE}/football-clips/goal_1_mbappe_41m_full.mp4#crop=50,45,1.05,8&v=1`,
          cameraEffect: "pan_right",
          transition: "wipe",
          showCaption: false,
        },
        {
          id: "demo-ec-3",
          projectId: "demo-el-clasico-goals",
          sceneIndex: 3,
          startMs: 13460,
          endMs: 18220,
          transcriptText:
            "Thế nhưng phút bốn mươi mốt, từ pha phản công sắc lẹm, Mbappe xé toạc hàng thủ dâng cao của đội chủ nhà để mở tỷ số cho Real Madrid.",
          setting: "[MBAPPE MỞ TỶ SỐ 0-1] • Video bàn thắng phút 41",
          characters: ["Kylian Mbappe"],
          imagePrompt: "Kylian Mbappe scoring opening goal vs Barcelona",
          imageUrl: `${MEDIA_BASE}/football-clips/goal_1_mbappe_41m_closeup.mp4#crop=50,60,1.05,0&v=1`,
          cameraEffect: "static",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-ec-4",
          projectId: "demo-el-clasico-goals",
          sceneIndex: 4,
          startMs: 18220,
          endMs: 26500,
          transcriptText:
            "Sang hiệp hai, Raphinha thắp lại hy vọng cho đội bóng xứ Catalunya bằng bàn gỡ hòa một đều ở phút sáu mươi mốt khiến cầu trường nổ tung.",
          setting: "[RAPHINHA GỠ HÒA 1-1] • Video bàn thắng phút 61",
          characters: ["Raphinha", "Lamine Yamal"],
          imagePrompt: "Raphinha scoring equalizer goal for Barcelona vs Real Madrid",
          imageUrl: `${MEDIA_BASE}/football-clips/goal_2_raphinha_61m.mp4#crop=50,65,1.05,0&v=1`,
          cameraEffect: "static",
          transition: "wipe",
          showCaption: false,
        },
        {
          id: "demo-ec-5",
          projectId: "demo-el-clasico-goals",
          sceneIndex: 5,
          startMs: 26500,
          endMs: 35060,
          transcriptText:
            "Thế nhưng đúng phút tám mươi bảy định mệnh, vẫn là Mbappe hoàn tất cú đúp lịch sử, chạm cột mốc một trăm bàn thắng sau hai mùa giải để ấn định chiến thắng hai một.",
          setting: "[CÚ ĐÚP PHÚT 87] • Video bàn ấn định 1-2 của Mbappé",
          characters: ["Kylian Mbappe"],
          imagePrompt: "Kylian Mbappe scoring 87th minute winner vs Barcelona",
          imageUrl: `${MEDIA_BASE}/football-clips/goal_3_mbappe_87m_main.mp4#crop=50,55,1.05,0&v=1`,
          cameraEffect: "static",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-ec-6",
          projectId: "demo-el-clasico-goals",
          sceneIndex: 6,
          startMs: 35060,
          endMs: 40060,
          transcriptText:
            "Khoảng cách ngôi đầu giờ chỉ còn ba điểm, theo bạn ai sẽ là nhà vô địch La Liga mùa này?",
          setting: "[AI SẼ VÔ ĐỊCH?] • Mbappé ăn mừng cùng đồng đội",
          characters: ["Real Madrid", "Barcelona"],
          imagePrompt: "Real Madrid celebrating El Clasico win",
          imageUrl: `${MEDIA_BASE}/football-clips/goal_3_mbappe_87m_full.mp4#crop=50,55,1.05,12&v=1`,
          cameraEffect: "zoom_out",
          transition: "fade",
          showCaption: false,
        },
      ],
    },
  },
  mancity_psg: {
    config: {
      templateId: "broadcast_stripes",
      mediaAspectRatio: "4:3",
      categoryText: "ĐỊA CHẤN C1:",
      categoryColor: "#FF4D4D",
      headlines: [
        "Man City thảm bại 2-4 PSG:",
        "Kỷ lục của Haaland thành công cốc!",
      ],
      tickerText: "ĐỊA CHẤN CHAMPIONS LEAGUE",
      dateText: "26/10/2026",
    },
    project: {
      id: "demo-man-city-vs-psg",
      title: "[Mẫu] Man City 2-4 PSG",
      rawScript:
        "Dẫn trước 2 bàn chỉ sau 53 phút nhưng Man City vẫn phải nhận thất bại 2-4 trước PSG tại Champions League.",
      audioUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/voiceover.mp3`,
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 33366,
      aspectRatio: "9:16",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: [],
      createdAt: "2026-10-26T00:00:00Z",
      scenes: [
        {
          id: "demo-mc-1",
          projectId: "demo-man-city-vs-psg",
          sceneIndex: 1,
          startMs: 0,
          endMs: 6966,
          transcriptText:
            "Dẫn trước 2-0 nhưng Man City vẫn sụp đổ 2-4 trước PSG tại sân Công viên các Hoàng tử.",
          setting: "Sân Parc des Princes",
          characters: ["Erling Haaland"],
          imagePrompt: "Erling Haaland looking shocked on the pitch",
          imageUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/broll/scene_1.jpg`,
          cameraEffect: "zoom_in",
          transition: "cut",
          showCaption: false,
        },
        {
          id: "demo-mc-2",
          projectId: "demo-man-city-vs-psg",
          sceneIndex: 2,
          startMs: 6966,
          endMs: 13733,
          transcriptText:
            "Jack Grealish và Erling Haaland liên tiếp lập công đầu hiệp hai đưa Man City vượt lên.",
          setting: "Pha ghi bàn của Haaland",
          characters: ["Erling Haaland"],
          imagePrompt: "Erling Haaland scoring goal celebration",
          imageUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/broll/scene_2.jpg`,
          cameraEffect: "pan_right",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-mc-3",
          projectId: "demo-man-city-vs-psg",
          sceneIndex: 3,
          startMs: 13733,
          endMs: 19633,
          transcriptText:
            "Nhưng chỉ trong vòng 7 phút, Dembele và Barcola gỡ hòa 2-2 chớp nhoáng cho PSG.",
          setting: "PSG vùng lên gỡ hòa",
          characters: ["Ousmane Dembele"],
          imagePrompt: "PSG players celebrating comeback goal",
          imageUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/broll/scene_3.jpg`,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-mc-4",
          projectId: "demo-man-city-vs-psg",
          sceneIndex: 4,
          startMs: 19633,
          endMs: 24733,
          transcriptText:
            "Joao Neves và Goncalo Ramos nhấn chìm đoàn quân của Pep Guardiola với chiến thắng 4-2.",
          setting: "Phút bù giờ bùng nổ",
          characters: ["Pep Guardiola"],
          imagePrompt: "Pep Guardiola looking dejected",
          imageUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/broll/scene_4.jpg`,
          cameraEffect: "pan_left",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-mc-5",
          projectId: "demo-man-city-vs-psg",
          sceneIndex: 5,
          startMs: 24733,
          endMs: 28766,
          transcriptText:
            "Cột mốc 50 bàn thắng nhanh nhất lịch sử C1 của Haaland bỗng chốc hóa bi kịch.",
          setting: "Nỗi buồn của Haaland",
          characters: ["Erling Haaland"],
          imagePrompt: "Haaland standing alone on the field",
          imageUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/broll/scene_5.jpg`,
          cameraEffect: "zoom_in",
          transition: "fade",
          showCaption: false,
        },
        {
          id: "demo-mc-6",
          projectId: "demo-man-city-vs-psg",
          sceneIndex: 6,
          startMs: 28766,
          endMs: 33366,
          transcriptText:
            "Liệu Man City có nguy cơ bị loại ngay từ vòng phân hạng Champions League năm nay?",
          setting: "Bảng xếp hạng C1",
          characters: ["Man City"],
          imagePrompt: "UEFA Champions League trophy",
          imageUrl: `${MEDIA_BASE}/football-demos/man-city-vs-psg-dia-chan-c1/broll/scene_6.jpg`,
          cameraEffect: "pan_right",
          transition: "slide",
          showCaption: false,
        },
      ],
    },
  },
  roma_real: {
    config: {
      templateId: "broadcast_stripes",
      mediaAspectRatio: "4:3",
      categoryText: "NGƯỢC DÒNG ĐIÊN RỒ:",
      categoryColor: "#FFD600",
      headlines: [
        "Real Madrid thắng nghẹt thở 4-3:",
        "Bản lĩnh Champions League thức tỉnh!",
      ],
      tickerText: "NGƯỢC DÒNG KINH ĐIỂN C1",
      dateText: "26/10/2026",
    },
    project: {
      id: "demo-roma-vs-real-madrid",
      title: "[Mẫu] Real Madrid 4-3 Roma",
      rawScript: "Real Madrid tạo nên màn rượt đuổi tỷ số 4-3 điên rồ trước AS Roma.",
      audioUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/voiceover.mp3`,
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 34433,
      aspectRatio: "9:16",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: [],
      createdAt: "2026-10-26T00:00:00Z",
      scenes: [
        {
          id: "demo-rm-1",
          projectId: "demo-roma-vs-real-madrid",
          sceneIndex: 1,
          startMs: 0,
          endMs: 7366,
          transcriptText:
            "Trận cầu điên rồ khép lại với chiến thắng nghẹt thở 4-3 nghiêng về Real Madrid.",
          setting: "Sân vận động rực lửa",
          characters: ["Real Madrid"],
          imagePrompt: "Real Madrid players celebrating",
          imageUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/broll/scene_1.jpg`,
          cameraEffect: "zoom_in",
          transition: "cut",
          showCaption: false,
        },
        {
          id: "demo-rm-2",
          projectId: "demo-roma-vs-real-madrid",
          sceneIndex: 2,
          startMs: 7366,
          endMs: 13033,
          transcriptText: "AS Roma nhập cuộc đầy hưng phấn và liên tục gây sức ép nghẹt thở.",
          setting: "AS Roma tấn công",
          characters: ["AS Roma"],
          imagePrompt: "AS Roma players celebrating",
          imageUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/broll/scene_2.jpg`,
          cameraEffect: "pan_left",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-rm-3",
          projectId: "demo-roma-vs-real-madrid",
          sceneIndex: 3,
          startMs: 13033,
          endMs: 19733,
          transcriptText:
            "Nhưng DNA Champions League của Kền Kền Trắng chưa bao giờ biết đầu hàng.",
          setting: "Real Madrid phản công",
          characters: ["Vinicius"],
          imagePrompt: "Real Madrid stars charging forward",
          imageUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/broll/scene_3.jpg`,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-rm-4",
          projectId: "demo-roma-vs-real-madrid",
          sceneIndex: 4,
          startMs: 19733,
          endMs: 27400,
          transcriptText: "Những bàn thắng liên tiếp ở hiệp hai đẩy kịch tính lên tới đỉnh điểm.",
          setting: "Rượt đuổi tỷ số 4-3",
          characters: ["Real Madrid"],
          imagePrompt: "Dramatic goal celebration",
          imageUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/broll/scene_4.jpg`,
          cameraEffect: "pan_right",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-rm-5",
          projectId: "demo-roma-vs-real-madrid",
          sceneIndex: 5,
          startMs: 27400,
          endMs: 32566,
          transcriptText:
            "Bản lĩnh của đội bóng hoàng gia Tây Ban Nha một lần nữa được khẳng định.",
          setting: "Khoảnh khắc định đoạt",
          characters: ["Real Madrid"],
          imagePrompt: "Real Madrid team huddle",
          imageUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/broll/scene_5.jpg`,
          cameraEffect: "zoom_in",
          transition: "fade",
          showCaption: false,
        },
        {
          id: "demo-rm-6",
          projectId: "demo-roma-vs-real-madrid",
          sceneIndex: 6,
          startMs: 32566,
          endMs: 34433,
          transcriptText:
            "Đâu là màn lội ngược dòng ấn tượng nhất của Real Madrid mà bạn từng chứng kiến?",
          setting: "Kết thúc trận đấu",
          characters: ["Real Madrid"],
          imagePrompt: "Santiago Bernabeu scoreboard",
          imageUrl: `${MEDIA_BASE}/football-demos/roma-vs-real-madrid-nguoc-dong-4-3/broll/scene_6.jpg`,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: false,
        },
      ],
    },
  },
  vtv_news_reel: {
    config: {
      templateId: "vtv_news_template",
      cardStyle: "liquid_glass",
      mediaAspectRatio: "16:9",
      categoryText: "NGOẠI HẠNG ANH:",
      categoryColor: "#FFD600",
      headlines: [
        "CƠN ĐỊA CHẤN TẠI NGOẠI HẠNG ANH:",
        "MU bẽ mặt thua trắng 0-2 trước tân binh Hull City!",
      ],
      tickerText: "NGƯỜI ĐÁ BÓNG",
      dateText: "27/10/2026",
      backgroundVideoUrl: `${MEDIA_BASE}/football-assets/bg_loop.mp4`,
    },
    project: {
      id: "demo-vtv-news-template",
      title: "[Mẫu VTV News] MU 0-2 Hull City (Liquid Glass)",
      rawScript:
        "Cơn địa chấn tại giải Ngoại hạng Anh, Manchester United bẽ mặt thua trắng không hai trước tân binh Hull City. Bầu không khí u ám bao trùm sân Old Trafford khi Quỷ Đỏ bế tắc toàn tập trước lối đá phòng ngự phản công của đối thủ. Huấn luyện viên và các ngôi sao MU rời sân trong tiếng la ó từ chính các cổ động viên nhà. Liệu đây có phải là cuộc khủng hoảng tồi tệ nhất lịch sử câu lạc bộ?",
      audioUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/voiceover.mp3`,
      captionSrtUrl: null,
      captionVttUrl: null,
      durationMs: 32360,
      aspectRatio: "9:16",
      status: "ready",
      errorMessage: null,
      characters: [],
      words: [],
      createdAt: "2026-10-27T00:00:00Z",
      scenes: [
        {
          id: "demo-vtv-1",
          projectId: "demo-vtv-news-template",
          sceneIndex: 1,
          startMs: 0,
          endMs: 5533,
          transcriptText:
            "Cơn địa chấn tại giải Ngoại hạng Anh, Manchester United bẽ mặt thua trắng không hai trước tân binh Hull City.",
          setting: "MU thua trận",
          characters: ["Manchester United"],
          imagePrompt: "MU players dejected",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide3.jpg`,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-vtv-2",
          projectId: "demo-vtv-news-template",
          sceneIndex: 2,
          startMs: 5533,
          endMs: 9100,
          transcriptText:
            "Bầu không khí u ám bao trùm sân vận động khi Quỷ Đỏ bế tắc hoàn toàn.",
          setting: "Khán đài Old Trafford",
          characters: ["Manchester United"],
          imagePrompt: "Fans shocked",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide1.jpg`,
          cameraEffect: "pan_right",
          transition: "fade",
          showCaption: false,
        },
        {
          id: "demo-vtv-3",
          projectId: "demo-vtv-news-template",
          sceneIndex: 3,
          startMs: 9100,
          endMs: 12433,
          transcriptText:
            "Hull City thi đấu kiên cường với đấu pháp phòng ngự phản công xuất sắc.",
          setting: "Hull City ăn mừng",
          characters: ["Hull City"],
          imagePrompt: "Hull City players celebrating",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide4.jpg`,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-vtv-4",
          projectId: "demo-vtv-news-template",
          sceneIndex: 4,
          startMs: 12433,
          endMs: 17966,
          transcriptText:
            "Hai bàn thắng chớp nhoáng khiến hàng thủ áo đỏ hoàn toàn vỡ vụn.",
          setting: "Bàn thắng Hull City",
          characters: ["Hull City"],
          imagePrompt: "Goal action",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide5.jpg`,
          cameraEffect: "zoom_out",
          transition: "wipe",
          showCaption: false,
        },
        {
          id: "demo-vtv-5",
          projectId: "demo-vtv-news-template",
          sceneIndex: 5,
          startMs: 17966,
          endMs: 23666,
          transcriptText:
            "Áp lực ngàn cân đè nặng lên vai ban huấn luyện và ban lãnh đạo Quỷ Đỏ.",
          setting: "HLV trầm ngâm",
          characters: ["Manchester United"],
          imagePrompt: "Manager on touchline looking concerned",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide6.jpg`,
          cameraEffect: "pan_left",
          transition: "fade",
          showCaption: false,
        },
        {
          id: "demo-vtv-6",
          projectId: "demo-vtv-news-template",
          sceneIndex: 6,
          startMs: 23666,
          endMs: 28000,
          transcriptText: "Cổ động viên rời sân trong nỗi thất vọng tột cùng.",
          setting: "Khán giả ra về",
          characters: ["Manchester United"],
          imagePrompt: "Fans leaving stadium",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide2.jpg`,
          cameraEffect: "zoom_in",
          transition: "slide",
          showCaption: false,
        },
        {
          id: "demo-vtv-7",
          projectId: "demo-vtv-news-template",
          sceneIndex: 7,
          startMs: 28000,
          endMs: 32360,
          transcriptText: "Liệu MU có thể gượng dậy sau thất bại muối mặt này?",
          setting: "Bảng tỷ số chung cuộc 0-2",
          characters: ["Manchester United"],
          imagePrompt: "Scoreboard 0-2",
          imageUrl: `${MEDIA_BASE}/football-demos/vtv-news-template/real_mu_slide7.jpg`,
          cameraEffect: "zoom_out",
          transition: "fade",
          showCaption: false,
        },
      ],
    },
  },
};

const ASPECT_OPTIONS: { value: MediaAspectRatio; label: string }[] = [
  { value: "3:4", label: "3:4 Dọc" },
  { value: "4:3", label: "4:3 Chuẩn" },
  { value: "16:9", label: "16:9 Ngang" },
  { value: "1:1", label: "1:1 Vuông" },
];

/**
 * Trích xuất danh sách Media Pool riêng biệt cho từng dự án bóng đá.
 * Chỉ bao gồm INITIAL_VIDEO_CLIPS (El Clasico) khi đang mở đúng bản mẫu El Clasico.
 */
function extractFootballMediaClips(p: Project): MediaPoolClip[] {
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
    }
  }

  if (p.id === "demo-el-clasico-goals") {
    for (const c of INITIAL_VIDEO_CLIPS) {
      addClip(c);
    }
  }

  return clips;
}

const FOOTBALL_DEMO_IDS = new Set(Object.values(DEMO_PRESETS).map((p) => p.project.id));

/** Placeholder trống trong lúc tải dự án thật — không hiển thị dự án mẫu thay thế. */
const LOADING_FOOTBALL_PROJECT: Project = {
  ...DEMO_PRESETS.el_clasico.project,
  id: "loading-football",
  title: "",
  rawScript: "",
  durationMs: 0,
  scenes: [],
  words: [],
  audioUrl: null,
};

function FootballStudioContent() {
  const playerRef = useRef<PlayerRef>(null);
  const searchParams = useSearchParams();
  const [confirm, confirmDialog] = useConfirmDialog();
  const queryId = searchParams.get("id") || searchParams.get("project");
  const opensRealProject = !!queryId && !FOOTBALL_DEMO_IDS.has(queryId);

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(() =>
    opensRealProject ? queryId : null
  );
  const [project, setProject] = useState<Project>(() =>
    opensRealProject ? LOADING_FOOTBALL_PROJECT : DEMO_PRESETS.el_clasico.project
  );
  const [broadcastConfig, setBroadcastConfig] = useState<FootballBroadcastConfig>(() => ({
    ...defaultBroadcastConfig("navy"),
    ...DEMO_PRESETS.el_clasico.config,
  }));

  // Undo / Redo Scene History Stack
  const [historyPast, setHistoryPast] = useState<Scene[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<Scene[][]>([]);

  // NLE Workspace & Panel Visibility State
  const [workspaceMode, setWorkspaceMode] = useState<"edit" | "deliver">("edit");
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [viewerMode, setViewerMode] = useState<"dual" | "scene" | "program">("dual");

  const [selectedSceneId, setSelectedSceneId] = useState<string>(() =>
    opensRealProject ? "" : "demo-ec-3"
  );
  const [videoClips, setVideoClips] = useState<MediaPoolClip[]>(() =>
    opensRealProject ? [] : extractFootballMediaClips(DEMO_PRESETS.el_clasico.project)
  );

  // Script & Voice Creator State
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Thiện Minh");
  const [creatingVideo, setCreatingVideo] = useState(false);

  // Batch & Media Operations
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [attachingMedia, setAttachingMedia] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
      setProjects(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // Auto-load project from URL query if present (e.g. /football?id=... or /football?project=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkQuery = () => {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("id") || params.get("project");
      if (pid && pid !== project.id) {
        loadExistingProject(pid);
      }
    };
    checkQuery();
    window.addEventListener("popstate", checkQuery);
    return () => window.removeEventListener("popstate", checkQuery);
  }, []);

  useEffect(() => {
    if (!project || project.id.startsWith("demo-") || project.status !== "processing") return;
    const t = setInterval(async () => {
      try {
        const updated = await api.getProject(project.id);
        setProject(updated);
        setVideoClips(extractFootballMediaClips(updated));
        if (updated.status !== "processing") {
          setCreatingVideo(false);
          if (updated.scenes.length > 0) {
            setSelectedSceneId(updated.scenes[0].id);
          }
          toast.success("Pipeline AI đã xử lý xong dự án!");
          refreshList();
        }
      } catch {
        // ignore
      }
    }, 2500);
    return () => clearInterval(t);
  }, [project, refreshList]);

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
    playerRef.current?.toggle();
  }, []);

  const handleSplitAtPlayhead = useCallback(() => {
    const target = project.scenes.find(
      (s) => nowMs > s.startMs + 600 && nowMs < s.endMs - 600
    );
    if (!target) {
      toast.warning(
        "Hãy đặt kim Playhead vào giữa một cảnh (cách mép ít nhất 0.6s) để tách đôi!"
      );
      return;
    }
    const splitPoint = Math.round(nowMs);
    const words = target.transcriptText.split(/\s+/);
    const midWord = Math.max(1, Math.floor(words.length / 2));
    const text1 = words.slice(0, midWord).join(" ");
    const text2 = words.slice(midWord).join(" ") || target.transcriptText;

    updateScenesWithHistory((scenes) => {
      const next: Scene[] = [];
      scenes.forEach((sc) => {
        if (sc.id !== target.id) {
          next.push(sc);
        } else {
          next.push({
            ...sc,
            endMs: splitPoint,
            transcriptText: text1,
          });
          next.push({
            ...sc,
            id: `${sc.id}-split-${Date.now()}`,
            startMs: splitPoint,
            endMs: sc.endMs,
            transcriptText: text2,
            transition: "cut",
          });
        }
      });
      return next.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
    });
    toast.success(`Đã tách Cảnh #${target.sceneIndex} tại ${fmtMs(splitPoint)}`);
  }, [nowMs, project.scenes, updateScenesWithHistory]);

  const handleSplitSceneAtMs = useCallback(
    (sceneId: string, splitMs: number) => {
      const target = project.scenes.find((s) => s.id === sceneId);
      if (!target) return;
      if (splitMs <= target.startMs + 350 || splitMs >= target.endMs - 350) {
        toast.warning("Vui lòng chọn điểm cắt cách 2 mép ít nhất 0.35s");
        return;
      }
      const words = target.transcriptText.split(/\s+/).filter(Boolean);
      const ratio = (splitMs - target.startMs) / Math.max(1, target.endMs - target.startMs);
      const cutIdx = Math.max(1, Math.min(words.length - 1, Math.round(words.length * ratio)));
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

      const firstScene = direction === "prev" ? project.scenes[targetIdx] : project.scenes[idx];
      const secondScene = direction === "prev" ? project.scenes[idx] : project.scenes[targetIdx];

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
          // skip merged scene
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
        imagePrompt: target.imagePrompt ?? "",
        imageUrl: null,
        cameraEffect: "zoom_in",
        transition: "wipe",
        showCaption: false,
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
          // Extend previous scene to cover deleted scene's endMs
          nextScenes.push({ ...sc, endMs: target.endMs });
        } else if (idx === 0 && i === 1) {
          // If first scene deleted, extend next scene backwards to 0
          nextScenes.push({ ...sc, startMs: target.startMs });
        } else {
          nextScenes.push(sc);
        }
      });

      const reindexed = nextScenes.map((sc, i) => ({ ...sc, sceneIndex: i + 1 }));
      updateScenesWithHistory(() => reindexed);
      setSelectedSceneId(reindexed[Math.max(0, idx - 1)]?.id ?? reindexed[0]?.id ?? "");
      if (!project.id.startsWith("demo-")) {
        api.saveProjectScenes(project.id, reindexed).catch(() => {});
      }
      toast.success(`Đã xóa Cảnh #${target.sceneIndex}`);
    },
    [project.id, project.scenes, updateScenesWithHistory]
  );

  const handleUpdateSceneBounds = useCallback(
    (sceneId: string, newStartMs: number, newEndMs: number, newTranscriptText?: string) => {
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

  // NLE Keyboard Shortcuts
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

  function loadDemoPreset(
    key: "el_clasico" | "mancity_psg" | "roma_real" | "vtv_news_reel"
  ) {
    const preset = DEMO_PRESETS[key];
    setHistoryPast([]);
    setHistoryFuture([]);
    setProject(preset.project);
    setVideoClips(extractFootballMediaClips(preset.project));
    setSelectedSceneId(
      key === "el_clasico"
        ? "demo-ec-3"
        : preset.project.scenes[0]?.id ?? ""
    );
    setBroadcastConfig((prev) => ({
      ...prev,
      ...preset.config,
    }));
    toast.success(`Đã nạp dự án: ${preset.project.title}`);
  }

  async function loadExistingProject(id: string) {
    if (id === "demo-el-clasico-goals") return loadDemoPreset("el_clasico");
    if (id === "demo-man-city-vs-psg") return loadDemoPreset("mancity_psg");
    if (id === "demo-roma-vs-real-madrid") return loadDemoPreset("roma_real");
    if (id === "demo-vtv-news-template") return loadDemoPreset("vtv_news_reel");
    setLoadingProjectId(id);
    try {
      const p = await api.getProject(id);
      setHistoryPast([]);
      setHistoryFuture([]);
      setProject(p);
      setVideoClips(extractFootballMediaClips(p));
      if (p.scenes.length > 0) {
        setSelectedSceneId(p.scenes[0].id);
      } else {
        setSelectedSceneId("");
      }
      toast.success(`Đã mở dự án: ${p.title}`);
    } catch (e) {
      toast.error("Không thể tải dự án", { description: (e as Error).message });
      if (project.id === LOADING_FOOTBALL_PROJECT.id) loadDemoPreset("el_clasico");
    } finally {
      setLoadingProjectId((cur) => (cur === id ? null : cur));
    }
  }

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
      loadDemoPreset("el_clasico");
      refreshList();
    } catch (e) {
      toast.error("Không thể xóa dự án", {
        id: toastId,
        description: (e as Error).message,
      });
    }
  }

  async function handleCreateAndProcess() {
    if (!script.trim()) {
      toast.warning("Vui lòng nhập kịch bản trước!");
      return;
    }
    setCreatingVideo(true);
    const toastId = toast.loading(
      `Đang tạo giọng đọc (${selectedVoice}) & chia cảnh tự động...`
    );
    try {
      const created = await api.createProject({
        title: title.trim() || "Bản tin Bóng đá",
        script: script.trim(),
        aspectRatio: "9:16",
        videoType: "football",
      });
      await api.processProject(created.id, selectedVoice);
      const latest = await api.getProject(created.id);
      setProject(latest);
      setVideoClips(extractFootballMediaClips(latest));
      if (latest.scenes.length > 0) {
        setSelectedSceneId(latest.scenes[0].id);
      }
      toast.success(`Đã khởi chạy Pipeline AI với giọng ${selectedVoice}!`, {
        id: toastId,
      });
      refreshList();
    } catch (e) {
      toast.error("Lỗi tạo dự án", {
        id: toastId,
        description: (e as Error).message,
      });
      setCreatingVideo(false);
    }
  }

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
    } catch (e) {
      toast.error("Lỗi gắn Media vào cảnh", { description: (e as Error).message });
    } finally {
      setAttachingMedia(null);
    }
  }

  async function handleAttachMediaToSelectedScene(mediaUrl: string, isLocalClip = false) {
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
    if (project.id.startsWith("demo-")) return;
    const missing = project.scenes.filter((s) => !s.imageUrl);
    if (missing.length === 0) return;
    setBatchGenerating(true);
    const toastId = toast.loading(`Đang vẽ ${missing.length} ảnh AI FLUX...`);
    try {
      for (let i = 0; i < missing.length; i++) {
        const sc = missing[i];
        setBatchProgress(`${i + 1}/${missing.length}`);
        const updated = await api.generateSceneImage(sc.id, sc.imagePrompt);
        setProject((prev) => ({
          ...prev,
          scenes: prev.scenes.map((x) => (x.id === sc.id ? { ...x, ...updated } : x)),
        }));
      }
      toast.success("Đã vẽ xong toàn bộ ảnh FLUX!", { id: toastId });
    } catch (e) {
      toast.error("Lỗi vẽ ảnh hàng loạt", {
        id: toastId,
        description: (e as Error).message,
      });
    } finally {
      setBatchGenerating(false);
      setBatchProgress("");
    }
  }

  function updateTheme(theme: "navy" | "crimson") {
    setBroadcastConfig((prev) => ({
      ...prev,
      backgroundTheme: theme,
      backgroundColor: theme === "crimson" ? "#BA0C2F" : "#0A1C3E",
      backgroundTileUrl:
        theme === "crimson"
          ? `${MEDIA_BASE}/football-assets/broadcast_seamless_tile_red.png`
          : `${MEDIA_BASE}/football-assets/broadcast_seamless_tile_blue.png`,
    }));
  }

  const updateSelectedScene = useCallback(
    (updated: Scene) => {
      updateScenesWithHistory((scenes) =>
        scenes.map((x) => (x.id === updated.id ? updated : x))
      );
    },
    [updateScenesWithHistory]
  );

  const exportedNewsConfigJson = useMemo(() => {
    const totalFrames = msToFrames(Math.max(project.durationMs, 1000));
    return JSON.stringify(
      {
        durationInFrames: totalFrames,
        fps: 30,
        backgroundColor: broadcastConfig.backgroundColor,
        mediaAspectRatio: broadcastConfig.mediaAspectRatio,
        dateText: broadcastConfig.dateText,
        categoryText: broadcastConfig.categoryText,
        categoryColor: broadcastConfig.categoryColor,
        headlines: broadcastConfig.headlines,
        tickerText: broadcastConfig.tickerText,
        audioSrc: project.audioUrl,
        mediaClips: project.scenes.map((sc, idx) => ({
          sceneIndex: sc.sceneIndex,
          src: sc.imageUrl,
          startFrame: msToFrames(sc.startMs),
          durationInFrames: Math.max(15, msToFrames(sc.endMs - sc.startMs)),
          motion: sc.cameraEffect,
          transition: idx === 0 ? "none" : sc.transition,
        })),
      },
      null,
      2
    );
  }, [project, broadcastConfig]);

  const missingCount = project.scenes.filter((s) => !s.imageUrl).length;

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-surface-1 text-zinc-100 select-none">
      {loadingProjectId && <ProjectLoadingOverlay />}
      {confirmDialog}
      {/* 1. TOP NLE HEADER BAR (48px) */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800/90 bg-surface-3 px-3">
        {/* Left: Toggle Left Panel + Project Selector */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Media Pool (Thư viện media)"
                type="button"
                onClick={() => setShowLeftPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showLeftPanel
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Media Pool (Thư viện media)</TooltipContent>
          </Tooltip>

          <Select value={loadingProjectId ?? project.id} onValueChange={loadExistingProject}>
            <SelectTrigger className="h-7 w-[220px] border-zinc-700/80 bg-zinc-900/90 text-xs text-zinc-100">
              <SelectValue placeholder="Chọn dự án..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                  Dự án mẫu (Demo)
                </SelectLabel>
                <SelectItem value="demo-el-clasico-goals" className="text-xs font-semibold">
                  ⚽ [Video] Barca 1-2 Real (3 Bàn Thắng)
                </SelectItem>
                <SelectItem value="demo-man-city-vs-psg" className="text-xs">
                  [Mẫu] Man City 2-4 PSG
                </SelectItem>
                <SelectItem value="demo-roma-vs-real-madrid" className="text-xs">
                  [Mẫu] Real Madrid 4-3 Roma
                </SelectItem>
                <SelectItem value="demo-vtv-news-template" className="text-xs">
                  💎 [Mẫu VTV News] MU 0-2 Hull City (Liquid Glass)
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

          {!project.id.startsWith("demo-") && (
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
        </div>

        {/* Center: DaVinci Resolve Workspace Switcher + Dual Monitor Mode */}
        <div className="flex items-center gap-2">
          <NleWorkspaceSwitcher mode={workspaceMode} onChange={setWorkspaceMode} />

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
                        ? "bg-cyan-500 text-black font-bold"
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
                        ? "bg-cyan-500 text-black font-bold"
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
                        ? "bg-cyan-500 text-black font-bold"
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

        {/* Right: Quick Aspect Ratio Frame Switcher & Panel Toggles */}
        <div className="flex items-center gap-1.5">
          <div className="hidden xl:flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5">
            {ASPECT_OPTIONS.map((opt) => (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastConfig((c) => ({ ...c, mediaAspectRatio: opt.value }));
                      toast.info(`Đã chuyển khung B-Roll sang ${opt.label}`);
                    }}
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                      broadcastConfig.mediaAspectRatio === opt.value
                        ? "bg-amber-500 text-black font-bold shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    {opt.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Khung hình B-Roll {opt.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button aria-label="Đóng / Mở Timeline"
                type="button"
                onClick={() => setShowBottomPanel((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  showBottomPanel
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
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
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
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
                  {/* Left Monitor: Scene Monitor (Active Scene Crop & Source Preview) */}
                  {(viewerMode === "dual" || viewerMode === "scene") && (
                    <ResizablePanel
                      defaultSize={viewerMode === "dual" ? "50%" : "100%"}
                      minSize="25%"
                    >
                      <NleSceneViewer
                        scene={selectedScene}
                        frameAspectRatio={broadcastConfig.mediaAspectRatio ?? "3:4"}
                        onSceneChange={updateSelectedScene}
                        onSeekToScene={seek}
                      />
                    </ResizablePanel>
                  )}

                  {viewerMode === "dual" && (
                    <ResizableHandle withHandle direction="horizontal" />
                  )}

                  {/* Right Monitor: Program Monitor (Full Assembled Video) */}
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
                            <span className="font-bold text-amber-400">
                              {fmtMs(nowMs)}
                            </span>
                            <span className="text-zinc-600">/</span>
                            <span className="text-zinc-400">
                              {fmtMs(project.durationMs)}
                            </span>
                          </div>
                        </div>

                        {/* Remotion Full Broadcast Canvas Container */}
                        <div className="relative flex flex-1 min-h-0 items-center justify-center p-2.5 overflow-hidden">
                          <FootballPlayer
                            ref={playerRef}
                            project={project}
                            config={broadcastConfig}
                          />
                        </div>
                      </div>
                    </ResizablePanel>
                  )}
                </ResizablePanelGroup>
              </ResizablePanel>

              {/* RIGHT DOCK: Inspector for Selected Scene & Broadcast Graphics (Collapsible) */}
              {showRightPanel && (
                <>
                  <ResizableHandle withHandle direction="horizontal" />
                  <ResizablePanel defaultSize="24%" minSize="16%" maxSize="38%">
                    <NleInspector
                      scene={selectedScene}
                      totalScenes={project.scenes.length}
                      frameAspectRatio={broadcastConfig.mediaAspectRatio ?? "3:4"}
                      onSceneChange={updateSelectedScene}
                      onSeek={seek}
                      broadcastConfig={broadcastConfig}
                      onBroadcastChange={setBroadcastConfig}
                      onThemeChange={updateTheme}
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
                  bgmUrl={broadcastConfig.bgmUrl}
                  onResizeSceneBoundary={handleResizeSceneBoundary}
                  onResizeSceneBoundaryEnd={handleResizeSceneBoundaryEnd}
                  onDropMediaOnScene={handleDropMediaOnScene}
                  onSplitAtPlayhead={handleSplitAtPlayhead}
                  onAddScene={() => selectedScene && handleAddSceneAfter(selectedScene.id)}
                  onMergeSelectedWithNext={() => selectedScene && handleMergeScene(selectedScene.id, "next")}
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
            <div className="lg:col-span-7 rounded-xl bg-surface-3 p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between pb-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-zinc-100">
                    <Film className="h-4 w-4 text-red-500" />
                    Deliver: Kết xuất MP4 (1080p) & Đăng YouTube Shorts
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Dự án: <strong className="text-zinc-200">{project.title}</strong> • Khung B-Roll:{" "}
                    <strong className="text-amber-400">{broadcastConfig.mediaAspectRatio}</strong>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWorkspaceMode("edit")}
                  className="h-7 text-xs border-0 bg-zinc-800/80"
                >
                  ← Quay lại Bàn dựng
                </Button>
              </div>

              <RenderAndYoutubePanel
                projectId={project.id}
                compositionId={broadcastConfig.templateId === "vtv_news_template" ? "VtvNewsTemplate" : "FootballShortVideo"}
                inputProps={{
                  audioUrl: project.audioUrl,
                  durationMs: Math.max(project.durationMs, 1000),
                  words: project.words ?? [],
                  scenes: project.scenes ?? [],
                  config: broadcastConfig,
                }}
                defaultTitle={`${broadcastConfig.headlines.join(" ")} #Shorts`}
                script={project.rawScript}
              />
            </div>

            <div className="lg:col-span-5 rounded-xl bg-surface-3 p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                  <Terminal className="h-3.5 w-3.5 text-amber-400" />
                  Cấu hình Remotion Props (JSON)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs border-0 bg-zinc-800/80"
                  onClick={() => {
                    navigator.clipboard.writeText(exportedNewsConfigJson);
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
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-lg bg-zinc-950 p-3 text-[10px] leading-relaxed text-emerald-400">
                {exportedNewsConfigJson}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FootballStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-sm text-zinc-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
          Đang khởi động Football Studio...
        </div>
      }
    >
      <FootballStudioContent />
    </Suspense>
  );
}
