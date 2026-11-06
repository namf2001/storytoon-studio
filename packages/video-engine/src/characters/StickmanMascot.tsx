import React, { useId } from "react";
import {
  DEFAULT_FEMALE_RIG,
  DEFAULT_MALE_RIG,
  type RigPoint,
  type StickmanRig,
  type StickmanViseme,
} from "./stickman-rig";
import {
  getStickmanMouthImage,
  type StickmanMouthShape,
} from "./stickman-mouth-images";

export type StickmanGender = "male" | "female";
export type StickmanMood =
  | "neutral"
  | "side_eye" // Ánh mắt liếc nghi ngờ/phán xét đặc trưng như trong reel
  | "talking"
  | "shocked"
  | "happy"
  | "disappointed"
  | "smug";

export type StickmanArmPose =
  | "hip" // Chống nạnh như trong reel
  | "idle" // Tay xuôi (dùng đúng toạ độ tay trong rig)
  | "point" // Chỉ tay sang bên
  | "shrug" // Nhún vai bó tay
  | "wave" // Vẫy tay chào
  | "explain"; // Vung tay giải thích

/** StickmanPoseProps controls the live pose; all fields are optional. */
export interface StickmanPoseProps {
  /** Full character description. Falls back to the preset for `gender`. */
  rig?: StickmanRig;
  gender?: StickmanGender;
  mood?: StickmanMood;
  armPose?: StickmanArmPose;
  isSpeaking?: boolean;
  /** Forces a mouth shape (lip-sync from Whisper or manual viseme). Overrides the speaking loop. */
  viseme?: StickmanMouthShape;
  /** -1 (look left) .. 1 (look right): shifts face features inside the head. */
  headTurn?: number;
  /** -1 .. 1: head roll, scaled by rig.head.maxTilt. */
  headTilt?: number;
  /** Body lean in degrees around the feet. */
  bodyLean?: number;
  /** Pupil/eye offset, -1..1 each. */
  gaze?: { x: number; y: number };
  eyesClosed?: boolean;
  autoBlink?: boolean;
  bouncy?: boolean;
  tick?: number;
  flipHorizontal?: boolean;
  hasGlasses?: boolean;
  shirtColor?: string;
}

/** StickmanMascotProps adds the outer <svg> sizing to the pose props. */
export interface StickmanMascotProps extends StickmanPoseProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

/** STICKMAN_VIEWBOX is the coordinate system used by rigs and the editor. */
export const STICKMAN_VIEWBOX = { x: 0, y: 0, width: 160, height: 220 };

interface ArmShape {
  shoulder: RigPoint;
  control: RigPoint;
  hand: RigPoint;
}

function armFor(
  pose: StickmanArmPose,
  side: -1 | 1,
  rest: StickmanRig["arms"]["left"],
  tick: number,
): ArmShape {
  const s = rest.shoulder;
  const sway = Math.sin(((tick % 24) / 24) * Math.PI * 2);
  const idle: ArmShape = {
    shoulder: s,
    control: rest.elbow,
    hand: { x: rest.hand.x, y: rest.hand.y + Math.sin((tick / 90) * Math.PI * 2) * 0.8 },
  };
  switch (pose) {
    case "hip":
      return { shoulder: s, control: { x: s.x + side * 22, y: s.y + 22 }, hand: { x: s.x + side * 6, y: s.y + 48 } };
    case "shrug":
      return { shoulder: s, control: { x: s.x + side * 24, y: s.y + 5 }, hand: { x: s.x + side * 16, y: s.y - 20 } };
    case "explain":
      return {
        shoulder: s,
        control: { x: s.x + side * 20, y: s.y + 20 },
        hand: { x: s.x + side * 30, y: s.y + 6 + sway * 5 * side },
      };
    case "point":
      return side === 1
        ? { shoulder: s, control: { x: s.x + 27, y: s.y + 5 }, hand: { x: s.x + 44, y: s.y + 8 } }
        : idle;
    case "wave":
      return side === 1
        ? { shoulder: s, control: { x: s.x + 22, y: s.y - 25 }, hand: { x: s.x + 27 + sway * 5, y: s.y - 45 } }
        : idle;
    default:
      return idle;
  }
}

function bodyPath(b: StickmanRig["body"]): string {
  // Half-ellipse dome: starts at bottom-left (cx - rx, bottomY),
  // sweeps clockwise arc up to (cx + rx, bottomY), then line across the bottom base.
  if (b.rx && b.ry) {
    const cx = b.cx ?? 80;
    const by = b.bottomY ?? 210;
    const rx = b.rx;
    const ry = b.ry;
    return `M ${cx - rx} ${by} A ${rx} ${ry} 0 0 1 ${cx + rx} ${by} Z`;
  }
  // Fallback for legacy trapezoid body
  const nl = b.neckLeft ?? { x: 54, y: 108 };
  const nr = b.neckRight ?? { x: 106, y: 108 };
  const fl = b.footLeft ?? { x: 38, y: 210 };
  const fr = b.footRight ?? { x: 122, y: 210 };
  const bulge = b.bulge ?? 0;
  const lc = { x: (nl.x + fl.x) / 2 - bulge, y: (nl.y + fl.y) / 2 };
  const rc = { x: (nr.x + fr.x) / 2 + bulge, y: (nr.y + fr.y) / 2 };
  return `M ${nl.x} ${nl.y} Q ${lc.x} ${lc.y} ${fl.x} ${fl.y} L ${fr.x} ${fr.y} Q ${rc.x} ${rc.y} ${nr.x} ${nr.y} Z`;
}

/**
 * MouthImage renders real high-resolution mouth sprite images (PNG) instead of vector code,
 * supporting full phonetic lip-sync and character expressions.
 */
function MouthImage({
  shape,
  cx,
  cy,
  w,
  h,
}: {
  shape: StickmanMouthShape;
  cx: number;
  cy: number;
  w: number;
  h: number;
}) {
  const imgSrc = getStickmanMouthImage(shape);
  const scale = 1.35;
  const isTall = shape === "A" || shape === "O" || shape === "surprised";
  const isWide = shape === "I" || shape === "smile" || shape === "smirk" || shape === "rest";
  const finalW = w * scale * (isWide ? 1.08 : shape === "U" ? 0.82 : 1.0);
  const finalH = h * scale * (isTall ? 1.25 : 0.95);
  const x = cx - finalW / 2;
  const y = cy - finalH / 2;
  return (
    <image
      href={imgSrc}
      x={x}
      y={y}
      width={finalW}
      height={finalH}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: "none" }}
    />
  );
}

/**
 * StickmanFigure renders the character as an SVG <g> in rig coordinates, so editors can
 * draw handles on top of it inside the same <svg>.
 */
export const StickmanFigure: React.FC<StickmanPoseProps> = ({
  rig: rigProp,
  gender = "male",
  mood = "neutral",
  armPose = "idle",
  isSpeaking = false,
  viseme,
  headTurn = 0,
  headTilt = 0,
  bodyLean = 0,
  gaze = { x: 0, y: 0 },
  eyesClosed = false,
  autoBlink = true,
  bouncy = true,
  tick = 0,
  flipHorizontal = false,
  hasGlasses = false,
  shirtColor,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const rig = rigProp ?? (gender === "female" ? DEFAULT_FEMALE_RIG : DEFAULT_MALE_RIG);
  const { style, head, eyes, mouth, body, motion, hair, brows } = rig;
  const stroke = style.stroke;
  const sw = style.strokeWidth;
  const shirt = shirtColor ?? style.shirt;

  // ---- Motion ----
  const cyc = Math.sin(((tick % 60) / 60) * Math.PI * 2);
  const amp = isSpeaking ? 2 : 1;
  const bounceY = bouncy ? cyc * motion.bounce * amp : 0;
  const stretchY = bouncy ? 1 + cyc * motion.breathe * amp : 1;
  const stretchX = bouncy ? 1 - cyc * motion.breathe * 0.8 * amp : 1;
  const footX = body.cx ?? ((body.footLeft?.x ?? 38) + (body.footRight?.x ?? 122)) / 2;
  const footY = body.bottomY ?? Math.max(body.footLeft?.y ?? 210, body.footRight?.y ?? 210);
  const footRadiusX =
    body.rx !== undefined
      ? body.rx + 6
      : Math.abs((body.footRight?.x ?? 122) - (body.footLeft?.x ?? 38)) / 2 + 6;

  const blinking =
    eyesClosed ||
    (autoBlink && motion.blinkEveryFrames > 0 && tick % motion.blinkEveryFrames < motion.blinkFrames);

  // ---- Face offsets ----
  const turn = Math.max(-1, Math.min(1, headTurn));
  const dx = turn * head.turnShift;
  const gx = gaze.x * 3 + (mood === "side_eye" ? 4 : 0);
  const gy = gaze.y * 3;
  const tiltDeg = Math.max(-1, Math.min(1, headTilt)) * head.maxTilt;
  const neck = { x: head.cx, y: head.cy + head.r };

  // ---- Mouth shape ----
  let mouthShape: StickmanMouthShape = "rest";
  if (viseme) mouthShape = viseme;
  else if (isSpeaking) {
    const loop: StickmanMouthShape[] = ["A", "O", "E", "rest"];
    mouthShape = loop[Math.floor(tick / Math.max(1, motion.talkFramesPerShape)) % loop.length];
  } else if (mood === "shocked") mouthShape = "surprised";
  else if (mood === "happy") mouthShape = "smile";
  else if (mood === "disappointed") mouthShape = "frown";
  else if (mood === "smug") mouthShape = "smirk";

  const mouthDx = dx + (mood === "side_eye" && !isSpeaking && !viseme ? 3 : 0);

  // ---- Eyes ----
  const eyeLine = (p: RigPoint, key: string) => {
    const x = p.x + dx + gx;
    const y = p.y + gy;
    if (blinking) {
      return <line key={key} x1={x - 4} y1={y} x2={x + 4} y2={y} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
    }
    if (mood === "shocked") {
      return (
        <g key={key}>
          <circle cx={x} cy={y - 2} r={eyes.dotRadius} fill={stroke} />
          <circle cx={x + eyes.dotRadius * 0.3} cy={y - 2 - eyes.dotRadius * 0.3} r={eyes.dotRadius * 0.33} fill={style.skin} />
        </g>
      );
    }
    if (mood === "happy") {
      return <path key={key} d={`M ${x - 9} ${y + 2} Q ${x} ${y - 9} ${x + 9} ${y + 2}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
    }
    const h = mood === "smug" || mood === "side_eye" ? eyes.height * 0.75 : eyes.height;
    return <line key={key} x1={x} y1={y - h / 2 + (mood === "smug" ? 2 : 0)} x2={x} y2={y + h / 2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
  };

  const showBrows = brows.enabled || mood === "side_eye" || mood === "disappointed" || mood === "shocked";
  const brow = (p: RigPoint, side: -1 | 1, key: string) => {
    const x = p.x + dx + gx * 0.6;
    const y = p.y - eyes.height / 2 + brows.offsetY + (mood === "shocked" ? -5 : mood === "side_eye" ? 4 : 0);
    const half = brows.width / 2;
    if (mood === "disappointed") {
      return <line key={key} x1={x - half} y1={y + (side === -1 ? -2 : 4)} x2={x + half} y2={y + (side === -1 ? 4 : -2)} stroke={stroke} strokeWidth={sw * 0.85} strokeLinecap="round" />;
    }
    if (mood === "shocked") {
      return <path key={key} d={`M ${x - half} ${y + 3} Q ${x} ${y - 4} ${x + half} ${y + 3}`} fill="none" stroke={stroke} strokeWidth={sw * 0.8} strokeLinecap="round" />;
    }
    return <line key={key} x1={x - half} y1={y} x2={x + half} y2={y} stroke={stroke} strokeWidth={sw * 0.85} strokeLinecap="round" />;
  };

  const leftArm = armFor(armPose, -1, rig.arms.left, tick);
  const rightArm = armFor(armPose, 1, rig.arms.right, tick);
  const drawArm = (a: ArmShape, key: string) => (
    <g key={key}>
      <path
        d={`M ${a.shoulder.x} ${a.shoulder.y} Q ${a.control.x} ${a.control.y} ${a.hand.x} ${a.hand.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <circle cx={a.hand.x} cy={a.hand.y} r={style.handRadius} fill={stroke} />
    </g>
  );

  const bodyD = bodyPath(body);
  const headClip = `stk-head-${uid}`;
  const bodyClip = `stk-body-${uid}`;
  const fringeTop = head.cy - head.r;

  return (
    <g>
      <defs>
        <clipPath id={headClip}>
          <circle cx={head.cx} cy={head.cy} r={head.r} />
        </clipPath>
        <clipPath id={bodyClip}>
          <path d={bodyD} />
        </clipPath>
      </defs>

      {/* Ground shadow (not affected by squash) */}
      <ellipse cx={footX} cy={footY + 4} rx={footRadiusX * stretchX} ry={8} fill="#000" opacity={style.groundShadow} />

      <g
        transform={[
          `translate(${footX} ${footY})`,
          `rotate(${bodyLean})`,
          `scale(${stretchX * (flipHorizontal ? -1 : 1)} ${stretchY})`,
          `translate(${-footX} ${-footY})`,
          `translate(0 ${bounceY})`,
        ].join(" ")}
      >
        {/* ===== Body ===== */}
        <path d={bodyD} fill={shirt} />
        <g clipPath={`url(#${bodyClip})`}>
          <path d={bodyD} fill={style.shade} opacity={style.shadeOpacity} />
          <path d={bodyD} fill={shirt} transform="translate(16 0)" />
        </g>
        <path d={bodyD} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />

        {/* ===== Head (rolls around the neck) ===== */}
        <g transform={`rotate(${tiltDeg} ${neck.x} ${neck.y})`}>
          {hair.bun.enabled && (
            <circle cx={hair.bun.cx + dx * 0.3} cy={hair.bun.cy} r={hair.bun.r} fill={style.hair} stroke={stroke} strokeWidth={sw} />
          )}

          <circle cx={head.cx} cy={head.cy} r={head.r} fill={style.shade} />
          <g clipPath={`url(#${headClip})`}>
            <circle cx={head.cx + head.r * 0.2 + dx * 0.6} cy={head.cy} r={head.r} fill={style.skin} />
            {hair.fringe.enabled && (
              <path
                d={`M ${head.cx - head.r - 2} ${head.cy + head.r * 0.15}
                    C ${head.cx - head.r * 0.5 + dx} ${fringeTop + hair.fringe.depth},
                      ${head.cx + head.r * 0.3 + dx} ${fringeTop + hair.fringe.depth * 0.7},
                      ${head.cx + head.r + 2} ${head.cy - head.r * 0.15}
                    L ${head.cx + head.r + 2} ${fringeTop - 2} L ${head.cx - head.r - 2} ${fringeTop - 2} Z`}
                fill={style.hair}
                stroke={stroke}
                strokeWidth={sw * 0.8}
              />
            )}
          </g>
          <circle cx={head.cx} cy={head.cy} r={head.r} fill="none" stroke={stroke} strokeWidth={sw * 1.08} />

          {/* Eyes & brows */}
          {eyeLine(eyes.left, "el")}
          {eyeLine(eyes.right, "er")}
          {showBrows && !blinking && brow(eyes.left, -1, "bl")}
          {showBrows && !blinking && brow(eyes.right, 1, "br")}

          {hasGlasses && (
            <g stroke={stroke} strokeWidth={sw * 0.7} fill="none">
              <rect x={eyes.left.x + dx - 11} y={eyes.left.y - 10} width={22} height={20} rx={4} />
              <rect x={eyes.right.x + dx - 11} y={eyes.right.y - 10} width={22} height={20} rx={4} />
              <line x1={eyes.left.x + dx + 11} y1={eyes.left.y} x2={eyes.right.x + dx - 11} y2={eyes.right.y} />
            </g>
          )}

          <MouthImage shape={mouthShape} cx={mouth.cx + mouthDx} cy={mouth.cy} w={mouth.width} h={mouth.openHeight} />
        </g>

        {/* ===== Arms ===== */}
        {drawArm(leftArm, "al")}
        {drawArm(rightArm, "ar")}
      </g>
    </g>
  );
};

/**
 * StickmanMascot is the minimalist storyteller character (Mark Kacy style) wrapped in an
 * <svg>. Pass `rig` to render a character made in the Stickman Studio editor.
 */
export const StickmanMascot: React.FC<StickmanMascotProps> = ({
  width = 240,
  height = 320,
  className = "",
  ...pose
}) => (
  <svg
    viewBox={`${STICKMAN_VIEWBOX.x} ${STICKMAN_VIEWBOX.y} ${STICKMAN_VIEWBOX.width} ${STICKMAN_VIEWBOX.height}`}
    width={width}
    height={height}
    className={className}
    style={{ overflow: "visible" }}
  >
    <StickmanFigure {...pose} />
  </svg>
);
