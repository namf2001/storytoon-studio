import React from "react";

export type DuolingoCharacterId =
  | "duo"
  | "lily"
  | "zari"
  | "junior"
  | "oscar"
  | "lucy"
  | "falstaff"
  | "eddy"
  | "bea"
  | "lin"
  | "vikram";

export type DuoMood =
  | "waving"
  | "jolly"
  | "excited"
  | "daunting"
  | "crying"
  | "amour"
  | "whistling";

export interface AuthenticDuolingoProps {
  character?: DuolingoCharacterId;
  duoMood?: DuoMood;
  isSpeaking?: boolean;
  bouncy?: boolean;
  tick?: number; // frame counter
  width?: number | string;
  height?: number | string;
  className?: string;
  flipHorizontal?: boolean;
}

// Maps characters and moods to the authentic SVG files downloaded from Duolingo's asset pipeline
const ASSET_MAP: Record<DuolingoCharacterId, (mood: DuoMood, isSpeaking: boolean, tick: number) => string> = {
  duo: (mood, isSpeaking, tick) => {
    // When speaking in jolly/waving mood, alternate between waving and excited/jolly for lively animation
    if (isSpeaking && mood === "waving") {
      const cycle = Math.floor((tick % 24) / 12);
      return cycle === 0
        ? "/characters/duolingo/Duo_waving.svg"
        : "/characters/duolingo/Duo_Jolly.svg";
    }
    switch (mood) {
      case "waving":
        return "/characters/duolingo/Duo_waving.svg";
      case "jolly":
        return "/characters/duolingo/Duo_Jolly.svg";
      case "excited":
        return "/characters/duolingo/Duo_Excited.svg";
      case "daunting":
        return "/characters/duolingo/Duo_Daunting.svg";
      case "crying":
        return "/characters/duolingo/Duo_Crying.svg";
      case "amour":
        return "/characters/duolingo/Duo_Amour.svg";
      case "whistling":
        return "/characters/duolingo/whistling.svg";
      default:
        return "/characters/duolingo/Duo_waving.svg";
    }
  },
  lily: (_m, isSpeaking, tick) => {
    if (isSpeaking) {
      return (Math.floor(tick / 16) % 2 === 0)
        ? "/characters/duolingo/Lily_1.svg"
        : "/characters/duolingo/Lily_2.svg";
    }
    return "/characters/duolingo/Lily_1.svg";
  },
  zari: () => "/characters/duolingo/Zari_1.svg",
  junior: (_m, isSpeaking, tick) => {
    if (isSpeaking) {
      return (Math.floor(tick / 14) % 2 === 0)
        ? "/characters/duolingo/Junior_1.svg"
        : "/characters/duolingo/Junior_2.svg";
    }
    return "/characters/duolingo/Junior_1.svg";
  },
  oscar: (_m, isSpeaking, tick) => {
    if (isSpeaking) {
      return (Math.floor(tick / 18) % 2 === 0)
        ? "/characters/duolingo/Oscar_1.svg"
        : "/characters/duolingo/Oscar_2.svg";
    }
    return "/characters/duolingo/Oscar_1.svg";
  },
  lucy: () => "/characters/duolingo/Lucy_1.svg",
  falstaff: () => "/characters/duolingo/Falstaff_1.svg",
  eddy: () => "/characters/duolingo/Eddy_1.svg",
  bea: (_m, isSpeaking, tick) => {
    if (isSpeaking) {
      return (Math.floor(tick / 16) % 2 === 0)
        ? "/characters/duolingo/Bea_1.svg"
        : "/characters/duolingo/Bea_2.svg";
    }
    return "/characters/duolingo/Bea_1.svg";
  },
  lin: () => "/characters/duolingo/Lin_1.svg",
  vikram: () => "/characters/duolingo/Vikram.svg",
};

export const CHARACTER_META: Record<
  DuolingoCharacterId,
  { name: string; title: string; description: string; defaultMood?: DuoMood }
> = {
  duo: {
    name: "Duo",
    title: "Cú xanh đại diện",
    description: "Linh vật chính với đầy đủ các tư thế: Vẫy chào, Tươi cười, Bất ngờ, Nhắc nhở",
  },
  lily: {
    name: "Lily",
    title: "Cô bé tóc tím Emo",
    description: "Tính cách chán chường, mỉa mai, biểu cảm độc đáo cực hút view",
  },
  zari: {
    name: "Zari",
    title: "Cô nàng khăn hồng",
    description: "Năng động, hào hứng, nói nhanh và luôn tràn đầy năng lượng tích cực",
  },
  junior: {
    name: "Junior",
    title: "Cậu bé mũ đỏ",
    description: "Nghịch ngợm, tò mò, hay đặt những câu hỏi ngây ngô",
  },
  oscar: {
    name: "Oscar",
    title: "Thầy giáo nghệ sĩ",
    description: "Điệu đà, uyên bác, phong cách kịch nghệ và dẫn dắt giải thích",
  },
  lucy: {
    name: "Lucy",
    title: "Bà lão siêu quậy",
    description: "Cựu điệp viên ngầm, kinh nghiệm và tính cách bí ẩn thú vị",
  },
  falstaff: {
    name: "Falstaff",
    title: "Chú gấu lười",
    description: "Thích ăn ngủ, lười vận động nhưng rất ấm áp",
  },
  eddy: {
    name: "Eddy",
    title: "Bố của Junior",
    description: "Huấn luyện viên thể thao đam mê nhưng hơi hậu đậu",
  },
  bea: {
    name: "Bea",
    title: "Cô nàng hướng ngoại",
    description: "Thông minh, quyết đoán, mục tiêu rõ ràng",
  },
  lin: {
    name: "Lin",
    title: "Bà cô cá tính",
    description: "Bất cần, phong cách đường phố",
  },
  vikram: {
    name: "Vikram",
    title: "Đầu bếp khăn Turban",
    description: "Lịch thiệp, hiền lành, yêu thích nấu nướng",
  },
};

/**
 * Authentic Duolingo 2D Vector Character Component.
 * Uses official extracted SVGs with Remotion-ready bounce, talk animation and shadow.
 */
export const AuthenticDuolingo: React.FC<AuthenticDuolingoProps> = ({
  character = "duo",
  duoMood = "waving",
  isSpeaking = false,
  bouncy = true,
  tick = 0,
  width = 240,
  height = 280,
  className = "",
  flipHorizontal = false,
}) => {
  // Bouncy Squash & Stretch
  const bounceSpeed = isSpeaking ? 30 : 60; // bounces faster when speaking
  const cycle = (tick % bounceSpeed) / bounceSpeed;
  const bounceY = bouncy ? Math.sin(cycle * Math.PI * 2) * (isSpeaking ? 7 : 4) : 0;
  const stretchY = bouncy ? 1 + Math.sin(cycle * Math.PI * 2) * (isSpeaking ? 0.04 : 0.02) : 1;
  const stretchX = bouncy ? 1 - Math.sin(cycle * Math.PI * 2) * (isSpeaking ? 0.03 : 0.015) : 1;
  const tilt = bouncy ? Math.sin((tick % 120) / 120 * Math.PI * 2) * 2 : 0;

  const getAsset = ASSET_MAP[character] || ASSET_MAP.duo;
  const svgPath = getAsset(duoMood, isSpeaking, tick);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width,
        height,
      }}
    >
      {/* Dynamic Ground Shadow */}
      <div
        className="absolute bottom-2 rounded-full bg-black/20 blur-[2px] transition-all"
        style={{
          width: typeof width === "number" ? width * 0.55 * stretchX : "55%",
          height: 12,
          transform: `scale(${stretchX})`,
        }}
      />

      {/* Main Character Vector */}
      <div
        style={{
          transform: `translateY(${bounceY}px) scale(${stretchX * (flipHorizontal ? -1 : 1)}, ${stretchY}) rotate(${tilt}deg)`,
          transformOrigin: "bottom center",
          transition: "transform 0.05s linear",
          filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18))",
        }}
        className="w-full h-full flex items-center justify-center"
      >
        {/* Render SVG via img tag with high-fidelity vector rendering */}
        <img
          src={svgPath}
          alt={character}
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  );
};
