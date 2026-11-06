import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BeVietnamPro } from "./load-font";

export interface ProductCalloutProps {
  tag?: string; // Dòng 1: phông mảnh, nét thanh (ví dụ: "Thiết kế")
  text?: string; // Dòng 2: phông đậm, cỡ to (ví dụ: "vung nồi 2 lớp")
  position?: "top_center" | "top_left" | "top_right";
  theme?: "dark" | "light" | "glass";
  durationInFrames: number;
}

/**
 * ProductCallout - Hiển thị cụm chữ mô tả điểm nhấn sản phẩm (Callout)
 * Thiết kế chuẩn quảng cáo sản phẩm TikTok/Shopee/E-commerce:
 * Dòng 1: Nhãn tính năng / Phân nhóm (Font thanh thoát, weight 400, size vừa)
 * Dòng 2: Ý chính cốt lõi (Font cực đậm, weight 800, size to, bắt mắt)
 */
export const ProductCallout: React.FC<ProductCalloutProps> = ({
  tag,
  text,
  position = "top_center",
  theme = "dark",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (!tag && !text) return null;

  // Hiệu ứng vào mượt mà: Fade + Slide xuống nhẹ, Fade out 6 frame cuối cảnh
  const enterOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(
    frame,
    [Math.max(0, durationInFrames - 6), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = enterOpacity * exitOpacity;

  const translateY = interpolate(frame, [0, 14], [-22, 0], {
    extrapolateRight: "clamp",
  });

  const portrait = height > width;

  // Vị trí container
  const containerStyle: React.CSSProperties = {
    position: "absolute",
    top: portrait ? 180 : 80,
    zIndex: 28,
    pointerEvents: "none",
    opacity,
    transform: `translateY(${translateY}px)`,
    display: "flex",
    flexDirection: "column",
    gap: portrait ? 6 : 4,
    maxWidth: portrait ? "86%" : "60%",
    boxSizing: "border-box",
  };

  let alignStyle: React.CSSProperties = {
    alignItems: "center",
    textAlign: "center",
  };

  if (position === "top_left") {
    containerStyle.left = portrait ? 72 : 50;
    alignStyle = { alignItems: "flex-start", textAlign: "left" };
  } else if (position === "top_right") {
    containerStyle.right = portrait ? 72 : 50;
    alignStyle = { alignItems: "flex-end", textAlign: "right" };
  } else {
    // top_center
    containerStyle.left = "50%";
    containerStyle.transform = `translateX(-50%) translateY(${translateY}px)`;
    alignStyle = { alignItems: "center", textAlign: "center" };
  }

  // Tone màu & typography theo mẫu:
  // - Dark: Chữ than đậm #2B2B2E với viền sáng mờ nhẹ để nổi bật trên mọi khung hình
  // - Light: Chữ trắng sáng #FFFFFF với bóng đen đổ
  // - Glass: Viên nang kính mờ cao cấp
  const isDark = theme === "dark";
  const tagColor = isDark ? "#3A3A3C" : "#E2E8F0";
  const headlineColor = isDark ? "#1C1C1E" : "#FFFFFF";
  const textShadow = isDark
    ? "0 2px 14px rgba(255, 255, 255, 0.95), 0 0 20px rgba(255, 255, 255, 0.9), 0 1px 2px rgba(255, 255, 255, 0.8)"
    : "0 2px 14px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 0, 0, 0.7)";

  return (
    <div style={{ ...containerStyle, ...alignStyle }}>
      {theme === "glass" ? (
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(8px)",
            padding: portrait ? "12px 28px" : "8px 20px",
            borderRadius: 24,
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.4)",
            display: "flex",
            flexDirection: "column",
            ...alignStyle,
          }}
        >
          {tag && (
            <div
              style={{
                fontFamily: `${BeVietnamPro}, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`,
                fontSize: portrait ? 40 : 28,
                fontWeight: 400,
                color: "#E2E8F0",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {tag}
            </div>
          )}
          {text && (
            <div
              style={{
                fontFamily: `${BeVietnamPro}, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`,
                fontSize: portrait ? 64 : 46,
                fontWeight: 900,
                color: "#FFD60A",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginTop: 2,
              }}
            >
              {text}
            </div>
          )}
        </div>
      ) : (
        <>
          {tag && (
            <div
              style={{
                fontFamily: `${BeVietnamPro}, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`,
                fontSize: portrait ? 44 : 32,
                fontWeight: 400,
                color: tagColor,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                textShadow,
              }}
            >
              {tag}
            </div>
          )}
          {text && (
            <div
              style={{
                fontFamily: `${BeVietnamPro}, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif`,
                fontSize: portrait ? 68 : 48,
                fontWeight: 800,
                color: headlineColor,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                textShadow,
              }}
            >
              {text}
            </div>
          )}
        </>
      )}
    </div>
  );
};
