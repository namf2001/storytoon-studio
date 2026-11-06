import type { RigPoint, StickmanRig } from "@storytoon/video-engine";

/** PartId identifies one editable group of rig fields. */
export type PartId =
  | "head"
  | "hair"
  | "eyes"
  | "brows"
  | "mouth"
  | "body"
  | "leftArm"
  | "rightArm"
  | "style"
  | "motion";

/** RigHandle is a draggable dot on the editor canvas. */
export interface RigHandle {
  id: string;
  label: string;
  /** "size" handles are drawn as squares and change a radius/length. */
  kind: "point" | "size";
  get: (rig: StickmanRig) => RigPoint;
  set: (rig: StickmanRig, p: RigPoint) => StickmanRig;
}

/** RigField is one numeric, color or boolean input in the field panel. */
export interface RigField {
  label: string;
  path: string;
  type: "number" | "color" | "boolean";
  min?: number;
  max?: number;
  step?: number;
}

/** PartDef groups the handles and fields of one part. */
export interface PartDef {
  id: PartId;
  label: string;
  hint: string;
  color: string;
  handles: RigHandle[];
  fields: RigField[];
}

const round = (v: number) => Math.round(v * 2) / 2;
const clone = (rig: StickmanRig): StickmanRig => structuredClone(rig);

/** getPath reads a dotted path such as "head.cx" from the rig. */
export function getPath(rig: StickmanRig, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], rig);
}

/** setPath returns a copy of the rig with a dotted path replaced. */
export function setPath(rig: StickmanRig, path: string, value: unknown): StickmanRig {
  const next = clone(rig);
  const keys = path.split(".");
  let o = next as unknown as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys[keys.length - 1]] = value;
  return next;
}

function pointHandle(id: string, label: string, path: string): RigHandle {
  return {
    id,
    label,
    kind: "point",
    get: (r) => getPath(r, path) as RigPoint,
    set: (r, p) => setPath(r, path, { x: round(p.x), y: round(p.y) }),
  };
}

function armHandles(side: "left" | "right"): RigHandle[] {
  return [
    pointHandle(`${side}.shoulder`, "Vai", `arms.${side}.shoulder`),
    pointHandle(`${side}.elbow`, "Khuỷu (độ cong)", `arms.${side}.elbow`),
    pointHandle(`${side}.hand`, "Bàn tay", `arms.${side}.hand`),
  ];
}

function armFields(side: "left" | "right"): RigField[] {
  const f = (k: string, a: "x" | "y", label: string): RigField => ({
    label,
    path: `arms.${side}.${k}.${a}`,
    type: "number",
    step: 0.5,
  });
  return [
    f("shoulder", "x", "Vai X"),
    f("shoulder", "y", "Vai Y"),
    f("elbow", "x", "Khuỷu X"),
    f("elbow", "y", "Khuỷu Y"),
    f("hand", "x", "Tay X"),
    f("hand", "y", "Tay Y"),
  ];
}

/** PARTS lists every editable part in the order shown in the part list. */
export const PARTS: PartDef[] = [
  {
    id: "head",
    label: "Đầu",
    hint: "Kéo tâm để di chuyển cả khuôn mặt, kéo ô vuông để đổi bán kính.",
    color: "#22c55e",
    handles: [
      {
        id: "head.center",
        label: "Tâm đầu",
        kind: "point",
        get: (r) => ({ x: r.head.cx, y: r.head.cy }),
        set: (r, p) => {
          const dx = round(p.x) - r.head.cx;
          const dy = round(p.y) - r.head.cy;
          const n = clone(r);
          n.head.cx += dx;
          n.head.cy += dy;
          for (const e of [n.eyes.left, n.eyes.right]) {
            e.x += dx;
            e.y += dy;
          }
          n.mouth.cx += dx;
          n.mouth.cy += dy;
          n.hair.bun.cx += dx;
          n.hair.bun.cy += dy;
          return n;
        },
      },
      {
        id: "head.radius",
        label: "Bán kính",
        kind: "size",
        get: (r) => ({ x: r.head.cx + r.head.r, y: r.head.cy }),
        set: (r, p) => setPath(r, "head.r", round(Math.max(10, Math.hypot(p.x - r.head.cx, p.y - r.head.cy)))),
      },
    ],
    fields: [
      { label: "Tâm X", path: "head.cx", type: "number", step: 0.5 },
      { label: "Tâm Y", path: "head.cy", type: "number", step: 0.5 },
      { label: "Bán kính", path: "head.r", type: "number", min: 10, max: 90, step: 0.5 },
      { label: "Độ lệch khi quay đầu", path: "head.turnShift", type: "number", min: 0, max: 30, step: 0.5 },
      { label: "Nghiêng tối đa (°)", path: "head.maxTilt", type: "number", min: 0, max: 40, step: 1 },
    ],
  },
  {
    id: "hair",
    label: "Tóc",
    hint: "Búi tóc phía sau và mái phía trước (nhân vật nữ trong reel).",
    color: "#a855f7",
    handles: [
      {
        id: "bun.center",
        label: "Tâm búi",
        kind: "point",
        get: (r) => ({ x: r.hair.bun.cx, y: r.hair.bun.cy }),
        set: (r, p) => setPath(setPath(r, "hair.bun.cx", round(p.x)), "hair.bun.cy", round(p.y)),
      },
      {
        id: "bun.radius",
        label: "Cỡ búi",
        kind: "size",
        get: (r) => ({ x: r.hair.bun.cx - r.hair.bun.r, y: r.hair.bun.cy }),
        set: (r, p) => setPath(r, "hair.bun.r", round(Math.max(4, Math.hypot(p.x - r.hair.bun.cx, p.y - r.hair.bun.cy)))),
      },
      {
        id: "fringe.depth",
        label: "Độ dài mái",
        kind: "size",
        get: (r) => ({ x: r.head.cx - r.head.r * 0.35, y: r.head.cy - r.head.r + r.hair.fringe.depth }),
        set: (r, p) => setPath(r, "hair.fringe.depth", round(Math.max(0, p.y - (r.head.cy - r.head.r)))),
      },
    ],
    fields: [
      { label: "Có búi tóc", path: "hair.bun.enabled", type: "boolean" },
      { label: "Búi X", path: "hair.bun.cx", type: "number", step: 0.5 },
      { label: "Búi Y", path: "hair.bun.cy", type: "number", step: 0.5 },
      { label: "Cỡ búi", path: "hair.bun.r", type: "number", min: 4, max: 40, step: 0.5 },
      { label: "Có mái", path: "hair.fringe.enabled", type: "boolean" },
      { label: "Độ dài mái", path: "hair.fringe.depth", type: "number", min: 0, max: 80, step: 0.5 },
    ],
  },
  {
    id: "eyes",
    label: "Mắt",
    hint: "Hai vạch mắt. Kéo từng mắt; độ dài vạch chỉnh trong ô số.",
    color: "#0ea5e9",
    handles: [pointHandle("eye.left", "Mắt trái", "eyes.left"), pointHandle("eye.right", "Mắt phải", "eyes.right")],
    fields: [
      { label: "Trái X", path: "eyes.left.x", type: "number", step: 0.5 },
      { label: "Trái Y", path: "eyes.left.y", type: "number", step: 0.5 },
      { label: "Phải X", path: "eyes.right.x", type: "number", step: 0.5 },
      { label: "Phải Y", path: "eyes.right.y", type: "number", step: 0.5 },
      { label: "Độ dài vạch", path: "eyes.height", type: "number", min: 2, max: 30, step: 0.5 },
      { label: "Bán kính mắt tròn", path: "eyes.dotRadius", type: "number", min: 2, max: 16, step: 0.5 },
    ],
  },
  {
    id: "brows",
    label: "Lông mày",
    hint: "Luôn hiện khi bật, hoặc tự hiện ở biểu cảm liếc/sốc/cạn lời.",
    color: "#f97316",
    handles: [
      {
        id: "brow.offset",
        label: "Độ cao mày",
        kind: "size",
        get: (r) => ({ x: r.eyes.right.x, y: r.eyes.right.y - r.eyes.height / 2 + r.brows.offsetY }),
        set: (r, p) => setPath(r, "brows.offsetY", round(p.y - (r.eyes.right.y - r.eyes.height / 2))),
      },
      {
        id: "brow.width",
        label: "Độ dài mày",
        kind: "size",
        get: (r) => ({ x: r.eyes.right.x + r.brows.width / 2, y: r.eyes.right.y - r.eyes.height / 2 + r.brows.offsetY }),
        set: (r, p) => setPath(r, "brows.width", round(Math.max(2, (p.x - r.eyes.right.x) * 2))),
      },
    ],
    fields: [
      { label: "Luôn hiện", path: "brows.enabled", type: "boolean" },
      { label: "Độ cao", path: "brows.offsetY", type: "number", min: -30, max: 10, step: 0.5 },
      { label: "Độ dài", path: "brows.width", type: "number", min: 2, max: 30, step: 0.5 },
    ],
  },
  {
    id: "mouth",
    label: "Miệng",
    hint: "Kéo tâm, ô vuông bên phải = độ rộng, ô vuông dưới = độ há khi nói.",
    color: "#ef4444",
    handles: [
      {
        id: "mouth.center",
        label: "Tâm miệng",
        kind: "point",
        get: (r) => ({ x: r.mouth.cx, y: r.mouth.cy }),
        set: (r, p) => setPath(setPath(r, "mouth.cx", round(p.x)), "mouth.cy", round(p.y)),
      },
      {
        id: "mouth.width",
        label: "Độ rộng",
        kind: "size",
        get: (r) => ({ x: r.mouth.cx + r.mouth.width / 2, y: r.mouth.cy }),
        set: (r, p) => setPath(r, "mouth.width", round(Math.max(4, (p.x - r.mouth.cx) * 2))),
      },
      {
        id: "mouth.open",
        label: "Độ há",
        kind: "size",
        get: (r) => ({ x: r.mouth.cx, y: r.mouth.cy + r.mouth.openHeight }),
        set: (r, p) => setPath(r, "mouth.openHeight", round(Math.max(2, p.y - r.mouth.cy))),
      },
    ],
    fields: [
      { label: "Tâm X", path: "mouth.cx", type: "number", step: 0.5 },
      { label: "Tâm Y", path: "mouth.cy", type: "number", step: 0.5 },
      { label: "Độ rộng", path: "mouth.width", type: "number", min: 4, max: 50, step: 0.5 },
      { label: "Độ há", path: "mouth.openHeight", type: "number", min: 2, max: 40, step: 0.5 },
    ],
  },
  {
    id: "body",
    label: "Thân (Nửa Elip)",
    hint: "Thân hình nửa elip dạng vòm. Kéo tâm đáy để di chuyển, ô vuông đáy để chỉnh bề rộng (Rx), ô vuông đỉnh để chỉnh độ cao vòm (Ry).",
    color: "#eab308",
    handles: [
      {
        id: "body.center",
        label: "Tâm đáy thân",
        kind: "point",
        get: (r) => ({ x: r.body.cx ?? 80, y: r.body.bottomY ?? 210 }),
        set: (r, p) => {
          const cx = round(p.x);
          const bottomY = round(p.y);
          const rx = r.body.rx ?? 42;
          const ry = r.body.ry ?? 104;
          return {
            ...r,
            body: {
              ...r.body,
              cx,
              bottomY,
              rx,
              ry,
              footLeft: { x: cx - rx, y: bottomY },
              footRight: { x: cx + rx, y: bottomY },
            },
          };
        },
      },
      {
        id: "body.rx",
        label: "Bề rộng thân (Rx)",
        kind: "size",
        get: (r) => ({
          x: (r.body.cx ?? 80) + (r.body.rx ?? 42),
          y: r.body.bottomY ?? 210,
        }),
        set: (r, p) => {
          const cx = r.body.cx ?? 80;
          const rx = round(Math.max(10, Math.abs(p.x - cx)));
          const bottomY = r.body.bottomY ?? 210;
          return {
            ...r,
            body: {
              ...r.body,
              rx,
              footLeft: { x: cx - rx, y: bottomY },
              footRight: { x: cx + rx, y: bottomY },
            },
          };
        },
      },
      {
        id: "body.ry",
        label: "Độ cao vòm (Ry)",
        kind: "size",
        get: (r) => ({
          x: r.body.cx ?? 80,
          y: (r.body.bottomY ?? 210) - (r.body.ry ?? 104),
        }),
        set: (r, p) => {
          const bottomY = r.body.bottomY ?? 210;
          const ry = round(Math.max(20, bottomY - p.y));
          return {
            ...r,
            body: {
              ...r.body,
              ry,
            },
          };
        },
      },
    ],
    fields: [
      { label: "Tâm đáy X", path: "body.cx", type: "number", step: 0.5 },
      { label: "Đáy Y", path: "body.bottomY", type: "number", step: 0.5 },
      { label: "Bán kính ngang (Rx)", path: "body.rx", type: "number", min: 10, max: 90, step: 0.5 },
      { label: "Bán kính cao (Ry)", path: "body.ry", type: "number", min: 20, max: 150, step: 0.5 },
    ],
  },
  {
    id: "leftArm",
    label: "Tay trái",
    hint: "Tư thế tay xuôi (idle). Các tư thế khác tự tính từ vị trí vai.",
    color: "#14b8a6",
    handles: armHandles("left"),
    fields: armFields("left"),
  },
  {
    id: "rightArm",
    label: "Tay phải",
    hint: "Tư thế tay xuôi (idle). Các tư thế khác tự tính từ vị trí vai.",
    color: "#06b6d4",
    handles: armHandles("right"),
    fields: armFields("right"),
  },
  {
    id: "style",
    label: "Màu & nét",
    hint: "Màu sắc, độ dày nét vẽ, bóng đổ.",
    color: "#e4e4e7",
    handles: [],
    fields: [
      { label: "Màu nét", path: "style.stroke", type: "color" },
      { label: "Độ dày nét", path: "style.strokeWidth", type: "number", min: 1, max: 8, step: 0.1 },
      { label: "Màu da", path: "style.skin", type: "color" },
      { label: "Màu bóng", path: "style.shade", type: "color" },
      { label: "Độ đậm bóng", path: "style.shadeOpacity", type: "number", min: 0, max: 1, step: 0.05 },
      { label: "Màu áo", path: "style.shirt", type: "color" },
      { label: "Màu tóc", path: "style.hair", type: "color" },
      { label: "Cỡ bàn tay", path: "style.handRadius", type: "number", min: 1, max: 12, step: 0.5 },
      { label: "Bóng dưới chân", path: "style.groundShadow", type: "number", min: 0, max: 0.5, step: 0.01 },
    ],
  },
  {
    id: "motion",
    label: "Chuyển động",
    hint: "Biên độ nhún, thở, nhịp chớp mắt và tốc độ nhép miệng.",
    color: "#f43f5e",
    handles: [],
    fields: [
      { label: "Nhún (px)", path: "motion.bounce", type: "number", min: 0, max: 15, step: 0.5 },
      { label: "Thở (scale)", path: "motion.breathe", type: "number", min: 0, max: 0.08, step: 0.002 },
      { label: "Chớp mắt mỗi (frame)", path: "motion.blinkEveryFrames", type: "number", min: 0, max: 600, step: 10 },
      { label: "Thời gian chớp (frame)", path: "motion.blinkFrames", type: "number", min: 1, max: 20, step: 1 },
      { label: "Frame / khẩu hình", path: "motion.talkFramesPerShape", type: "number", min: 1, max: 20, step: 1 },
    ],
  },
];

/** partById looks up a part definition. */
export function partById(id: PartId): PartDef {
  return PARTS.find((p) => p.id === id) ?? PARTS[0];
}

/** partKeys returns the top-level rig keys affected by a part (used by "reset part"). */
export function partPaths(id: PartId): string[] {
  switch (id) {
    case "head":
      return ["head"];
    case "hair":
      return ["hair"];
    case "eyes":
      return ["eyes"];
    case "brows":
      return ["brows"];
    case "mouth":
      return ["mouth"];
    case "body":
      return ["body"];
    case "leftArm":
      return ["arms.left"];
    case "rightArm":
      return ["arms.right"];
    case "style":
      return ["style"];
    case "motion":
      return ["motion"];
  }
}
