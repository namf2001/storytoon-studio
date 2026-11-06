import React from "react";

export type MascotEmotion = "neutral" | "happy" | "surprised" | "thinking" | "angry";
export type MascotPose = "idle" | "wave" | "pointing" | "hands_on_hips" | "holding_mic";
export type MascotMouth = "closed" | "open_mid" | "open_wide" | "round_o" | "smile";

export interface DuoMascotProps {
  emotion?: MascotEmotion;
  pose?: MascotPose;
  mouth?: MascotMouth;
  isSpeaking?: boolean;
  isBlinking?: boolean;
  bouncy?: boolean;
  tick?: number; // frame index or time tick for continuous motion
  width?: number | string;
  height?: number | string;
  className?: string;
  hasBowtie?: boolean;
  hasGlasses?: boolean;
}

/**
 * 2D Vector Mascot (Duolingo-style) rendered 100% in pure SVG.
 * Supports slot-swapping for eyes, mouth (lip-sync), pose arms, and squash & stretch bounce.
 */
export const DuoMascot: React.FC<DuoMascotProps> = ({
  emotion = "neutral",
  pose = "idle",
  mouth = "closed",
  isSpeaking = false,
  isBlinking = false,
  bouncy = true,
  tick = 0,
  width = 240,
  height = 280,
  className = "",
  hasBowtie = false,
  hasGlasses = false,
}) => {
  // Bouncy idle calculation (squash & stretch)
  const bounceCycle = (tick % 60) / 60; // 1s loop at 60fps
  const bounceY = bouncy ? Math.sin(bounceCycle * Math.PI * 2) * 5 : 0;
  const stretchY = bouncy ? 1 + Math.sin(bounceCycle * Math.PI * 2) * 0.03 : 1;
  const stretchX = bouncy ? 1 - Math.sin(bounceCycle * Math.PI * 2) * 0.02 : 1;
  const headTilt = bouncy ? Math.sin(bounceCycle * Math.PI) * 2 : 0;

  // Wing wave cycle
  const waveAngle = pose === "wave" ? Math.sin((tick % 20) / 20 * Math.PI * 2) * 16 : 0;

  // Dynamic mouth for speaking if not explicitly overridden
  let activeMouth = mouth;
  if (isSpeaking && mouth === "closed") {
    const mouthCycle = Math.floor((tick % 24) / 4); // cycles through 6 frames
    const cycleMap: MascotMouth[] = ["open_mid", "open_wide", "round_o", "open_mid", "smile", "open_mid"];
    activeMouth = cycleMap[mouthCycle] || "open_mid";
  }

  return (
    <svg
      viewBox="0 0 240 280"
      width={width}
      height={height}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Gradients for rich Duolingo flat shading */}
        <linearGradient id="duoBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#78C800" />
          <stop offset="100%" stopColor="#58A700" />
        </linearGradient>

        <linearGradient id="duoBellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8EE000" />
          <stop offset="100%" stopColor="#6DB800" />
        </linearGradient>

        <linearGradient id="duoBeakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFA600" />
          <stop offset="100%" stopColor="#E67E00" />
        </linearGradient>

        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Ground Shadow */}
      <ellipse
        cx="120"
        cy="260"
        rx={60 * stretchX}
        ry={14}
        fill="#000000"
        opacity="0.18"
      />

      {/* Main Animated Group with Squash & Stretch */}
      <g
        transform={`translate(120, 255) scale(${stretchX}, ${stretchY}) translate(-120, -255) translate(0, ${bounceY})`}
      >
        {/* Feet */}
        <g id="feet">
          {/* Left foot */}
          <path
            d="M 85 245 C 80 245 70 252 70 258 C 70 263 80 264 92 264 C 102 264 105 258 105 250 Z"
            fill="#E67E00"
          />
          <path
            d="M 88 245 C 84 245 74 251 74 256 C 74 260 82 262 92 262 C 100 262 102 257 102 250 Z"
            fill="#FFA600"
          />

          {/* Right foot */}
          <path
            d="M 155 245 C 160 245 170 252 170 258 C 170 263 160 264 148 264 C 138 264 135 258 135 250 Z"
            fill="#E67E00"
          />
          <path
            d="M 152 245 C 156 245 166 251 166 256 C 166 260 158 262 148 262 C 140 262 138 257 138 250 Z"
            fill="#FFA600"
          />
        </g>

        {/* Tail feathers behind */}
        <path
          d="M 120 230 C 105 248 135 248 120 230 Z"
          fill="#488E00"
        />

        {/* Head & Body (Smooth pear/capsule shape) */}
        <g transform={`rotate(${headTilt}, 120, 160)`}>
          {/* Body Base */}
          <path
            d="M 60 140 
               C 60 75, 85 45, 120 45 
               C 155 45, 180 75, 180 140 
               C 180 205, 165 242, 120 242 
               C 75 242, 60 205, 60 140 Z"
            fill="url(#duoBodyGrad)"
            stroke="#458200"
            strokeWidth="3.5"
            filter="url(#softShadow)"
          />

          {/* Eye patches (Light green spectacles around eyes) */}
          <path
            d="M 72 125 C 72 95 105 92 120 108 C 135 92 168 95 168 125 C 168 152 138 158 120 146 C 102 158 72 152 72 125 Z"
            fill="url(#duoBellyGrad)"
            opacity="0.9"
          />

          {/* Belly Feather Pattern */}
          <g opacity="0.6">
            <path
              d="M 105 180 C 112 188 128 188 135 180"
              fill="none"
              stroke="#468800"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 98 198 C 106 206 134 206 142 198"
              fill="none"
              stroke="#468800"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* ================= EYES ================= */}
          <g id="eyes">
            {isBlinking ? (
              // Blinking Eyes (Happy arcs)
              <g stroke="#2C5200" strokeWidth="4.5" strokeLinecap="round" fill="none">
                <path d="M 85 126 Q 98 135 110 126" />
                <path d="M 130 126 Q 142 135 155 126" />
              </g>
            ) : emotion === "happy" ? (
              // Happy squinting crescents
              <g stroke="#1F3D00" strokeWidth="5" strokeLinecap="round" fill="none">
                <path d="M 84 128 Q 98 114 112 128" />
                <path d="M 128 128 Q 142 114 156 128" />
              </g>
            ) : emotion === "surprised" ? (
              // Surprised Wide Eyes
              <g>
                <circle cx="98" cy="122" r="19" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2.5" />
                <circle cx="142" cy="122" r="19" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2.5" />
                <circle cx="98" cy="122" r="7" fill="#1C1C1E" />
                <circle cx="142" cy="122" r="7" fill="#1C1C1E" />
                <circle cx="96" cy="119" r="2.5" fill="#FFFFFF" />
                <circle cx="140" cy="119" r="2.5" fill="#FFFFFF" />
              </g>
            ) : emotion === "thinking" ? (
              // Thinking Eyes (Looking up right, one eyebrow raised)
              <g>
                <circle cx="98" cy="124" r="17" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2" />
                <circle cx="142" cy="124" r="17" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2" />
                {/* Pupils looking up-right */}
                <circle cx="104" cy="118" r="9.5" fill="#1C1C1E" />
                <circle cx="148" cy="118" r="9.5" fill="#1C1C1E" />
                <circle cx="106" cy="115" r="3" fill="#FFFFFF" />
                <circle cx="150" cy="115" r="3" fill="#FFFFFF" />
                {/* Raised eyebrow */}
                <path d="M 86 100 Q 98 94 110 102" fill="none" stroke="#2C5200" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 130 96 Q 142 86 156 94" fill="none" stroke="#2C5200" strokeWidth="4" strokeLinecap="round" />
              </g>
            ) : emotion === "angry" ? (
              // Stern/Angry Eyes
              <g>
                <circle cx="98" cy="124" r="17" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2" />
                <circle cx="142" cy="124" r="17" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2" />
                <circle cx="100" cy="125" r="9" fill="#1C1C1E" />
                <circle cx="140" cy="125" r="9" fill="#1C1C1E" />
                <circle cx="102" cy="122" r="3" fill="#FFFFFF" />
                <circle cx="142" cy="122" r="3" fill="#FFFFFF" />
                {/* Angry eyebrows angled down */}
                <path d="M 84 98 L 112 110" fill="none" stroke="#234200" strokeWidth="4" strokeLinecap="round" />
                <path d="M 156 98 L 128 110" fill="none" stroke="#234200" strokeWidth="4" strokeLinecap="round" />
              </g>
            ) : (
              // Neutral / Default Eyes
              <g>
                <circle cx="98" cy="124" r="18" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2" />
                <circle cx="142" cy="124" r="18" fill="#FFFFFF" stroke="#3D7500" strokeWidth="2" />
                <circle cx="100" cy="124" r="10.5" fill="#1C1C1E" />
                <circle cx="140" cy="124" r="10.5" fill="#1C1C1E" />
                <circle cx="103" cy="120" r="3.5" fill="#FFFFFF" />
                <circle cx="143" cy="120" r="3.5" fill="#FFFFFF" />
              </g>
            )}
          </g>

          {/* ================= MOUTH / BEAK ================= */}
          <g id="mouth">
            {activeMouth === "closed" ? (
              // Classic Closed Triangular Beak
              <path
                d="M 104 135 L 136 135 C 136 135, 126 156, 120 156 C 114 156, 104 135, 104 135 Z"
                fill="url(#duoBeakGrad)"
                stroke="#C46500"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            ) : activeMouth === "open_mid" ? (
              // Talking Mid Open (Dark cavity + tongue + upper beak)
              <g>
                {/* Mouth Cavity */}
                <path
                  d="M 104 136 C 104 136, 105 162, 120 162 C 135 162, 136 136, 136 136 Z"
                  fill="#5A0505"
                  stroke="#C46500"
                  strokeWidth="2"
                />
                {/* Cute Pink Tongue */}
                <path
                  d="M 112 153 C 114 148, 126 148, 128 153 C 127 160, 113 160, 112 153 Z"
                  fill="#FF6584"
                />
                {/* Upper Beak Lip */}
                <path
                  d="M 103 135 L 137 135 L 120 144 Z"
                  fill="url(#duoBeakGrad)"
                  stroke="#C46500"
                  strokeWidth="2"
                />
              </g>
            ) : activeMouth === "open_wide" ? (
              // Excited / Loud Speech Open
              <g>
                <path
                  d="M 101 133 C 100 133, 103 168, 120 168 C 137 168, 140 133, 140 133 Z"
                  fill="#500000"
                  stroke="#C46500"
                  strokeWidth="2.5"
                />
                {/* Tongue */}
                <path
                  d="M 110 158 C 112 150, 128 150, 130 158 C 128 166, 112 166, 110 158 Z"
                  fill="#FF5277"
                />
                {/* Upper Flap */}
                <path
                  d="M 100 132 L 140 132 L 120 142 Z"
                  fill="url(#duoBeakGrad)"
                  stroke="#C46500"
                  strokeWidth="2"
                />
              </g>
            ) : activeMouth === "round_o" ? (
              // Rounded "O" / "U" Mouth
              <g>
                <ellipse cx="120" cy="144" rx="10" ry="12" fill="#5A0505" stroke="#C46500" strokeWidth="2.5" />
                <path
                  d="M 112 136 Q 120 132 128 136"
                  fill="none"
                  stroke="#FFA600"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </g>
            ) : (
              // Smile Beak
              <g>
                <path
                  d="M 102 134 Q 120 154 138 134 Q 120 142 102 134 Z"
                  fill="url(#duoBeakGrad)"
                  stroke="#C46500"
                  strokeWidth="2.5"
                />
              </g>
            )}
          </g>

          {/* Glasses Accessory (Optional) */}
          {hasGlasses && (
            <g stroke="#1F1F1F" strokeWidth="3" fill="none">
              <circle cx="98" cy="124" r="21" />
              <circle cx="142" cy="124" r="21" />
              <line x1="119" y1="124" x2="121" y2="124" />
            </g>
          )}

          {/* Bowtie Accessory (Optional Host style) */}
          {hasBowtie && (
            <g transform="translate(120, 172)">
              <polygon points="-14,-8 0,0 -14,8" fill="#E11D48" />
              <polygon points="14,-8 0,0 14,8" fill="#E11D48" />
              <circle cx="0" cy="0" r="4" fill="#BE123C" />
            </g>
          )}
        </g>

        {/* ================= WINGS / ARMS ================= */}
        {/* Left Wing */}
        {pose === "hands_on_hips" ? (
          <path
            d="M 68 150 C 44 158 48 185 68 195"
            fill="none"
            stroke="#569E00"
            strokeWidth="14"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M 64 140 C 42 155 45 195 68 200 C 66 182 65 160 64 140 Z"
            fill="#569E00"
            stroke="#458200"
            strokeWidth="2.5"
          />
        )}

        {/* Right Wing (With pose variations) */}
        {pose === "wave" ? (
          // Waving Wing
          <g transform={`translate(175, 145) rotate(${-35 + waveAngle}) translate(-175, -145)`}>
            <path
              d="M 175 145 C 198 120 215 105 210 95 C 198 90 180 115 170 135 Z"
              fill="#569E00"
              stroke="#458200"
              strokeWidth="2.5"
            />
          </g>
        ) : pose === "pointing" ? (
          // Pointing to the right (at video/screen)
          <g>
            <path
              d="M 172 150 C 195 142 225 142 228 148 C 228 156 195 168 172 165 Z"
              fill="#569E00"
              stroke="#458200"
              strokeWidth="2.5"
            />
          </g>
        ) : pose === "hands_on_hips" ? (
          <path
            d="M 172 150 C 196 158 192 185 172 195"
            fill="none"
            stroke="#569E00"
            strokeWidth="14"
            strokeLinecap="round"
          />
        ) : pose === "holding_mic" ? (
          // Holding Microphone like an MC
          <g>
            <path
              d="M 172 150 C 190 152 195 170 185 180 C 176 172 174 162 172 150 Z"
              fill="#569E00"
              stroke="#458200"
              strokeWidth="2.5"
            />
            {/* Microphone */}
            <g transform="translate(195, 165) rotate(-20)">
              <rect x="-4" y="-2" width="8" height="24" rx="2" fill="#27272A" />
              <ellipse cx="0" cy="-6" rx="7" ry="9" fill="#71717A" stroke="#3F3F46" strokeWidth="1" />
              <line x1="-7" y1="-6" x2="7" y2="-6" stroke="#27272A" strokeWidth="1.5" />
            </g>
          </g>
        ) : (
          // Default Resting Wing
          <path
            d="M 176 140 C 198 155 195 195 172 200 C 174 182 175 160 176 140 Z"
            fill="#569E00"
            stroke="#458200"
            strokeWidth="2.5"
          />
        )}
      </g>
    </svg>
  );
};
