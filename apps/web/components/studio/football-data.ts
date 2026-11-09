// Demo projects, broadcast defaults and media-pool helpers for the Football studio variant.
// (Moved verbatim from app/football/page.tsx.)
import type { FootballBroadcastConfig, Project } from "@storytoon/shared-types";
import { API_URL } from "@/lib/api";
import type { MediaPoolClip } from "@/components/nle/NleMediaPool";

export const MEDIA_BASE = `${API_URL}/media`;

export const INITIAL_VIDEO_CLIPS: MediaPoolClip[] = [
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

export function defaultBroadcastConfig(theme: "navy" | "crimson" = "navy"): FootballBroadcastConfig {
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

export const FOOTBALL_DEMO_PRESETS: Record<
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

/**
 * Trích xuất danh sách Media Pool riêng biệt cho từng dự án bóng đá.
 * Chỉ bao gồm INITIAL_VIDEO_CLIPS (El Clasico) khi đang mở đúng bản mẫu El Clasico.
 */
export function extractFootballMediaClips(p: Project): MediaPoolClip[] {
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
