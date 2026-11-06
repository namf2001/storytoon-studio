"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Cpu,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AvatarRivePlaygroundPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Badge variant="secondary">Phương án 2</Badge>
            <span className="text-xs text-muted-foreground">Rive & WebGL Mesh Engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Rive Runtime & Mesh Avatar Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Khảo sát và kiến trúc tích hợp file hoạt hình Rive (.riv) hoặc lưới biến dạng 2D Mesh WebGL.
          </p>
        </div>

        <Link href="/tools/avatar-svg">
          <Button variant="outline" size="sm" className="gap-2">
            Xem Phương án 1 (SVG Rig) <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Rive Card */}
        <Card className="border-zinc-800/80 bg-zinc-950/60 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-sky-500/40 text-sky-400">
                Chuẩn gốc của Duolingo
              </Badge>
              <span className="text-[11px] font-mono text-muted-foreground">.riv format</span>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-2">
              Rive Runtime Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Thiết kế xương (skeletal rig) và State Machine trên Rive Editor, xuất file nhị phân siêu nhẹ (.riv).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Animation siêu mượt:</strong> Hỗ trợ inverse kinematics (IK), state machine chuyển đổi mượt mà giữa các animation.
                </span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Độ phân giải vector:</strong> Không vỡ nét khi zoom cận cảnh trong video 4K.
                </span>
              </div>
              <div className="flex items-start gap-2 text-amber-300/90">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Thách thức với Remotion:</strong> Cần sử dụng Canvas WebGL và scrub timeline thủ công theo từng frame để tránh lệch sync khi render headless.
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">// Tích hợp qua @rive-app/canvas</span>
              <pre className="text-zinc-300">{`import { Rive } from "@rive-app/canvas";

// Điều khiển state machine:
const rive = new Rive({
  src: "/characters/duo_mc.riv",
  stateMachines: "MC_StateMachine",
  autoplay: false, // điều khiển frame theo Remotion
});`}</pre>
            </div>
          </CardContent>
        </Card>

        {/* Mesh Avatar Card */}
        <Card className="border-zinc-800/80 bg-zinc-950/60 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-purple-500/40 text-purple-400">
                Dựa trên mesh-avatar-studio
              </Badge>
              <span className="text-[11px] font-mono text-muted-foreground">WebGL 2D Mesh</span>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-2">
              2D Mesh Deformation Engine
            </CardTitle>
            <CardDescription className="text-xs">
              Kỹ thuật Live2D rút gọn: cắt ảnh PNG thành nhiều lớp (layers) và bẻ cong lưới tam giác WebGL.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Tận dụng ảnh vẽ tay:</strong> Có thể lấy bất kỳ ảnh vẽ anime hoặc tranh chân dung tĩnh làm nhân vật.
                </span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Có sẵn Editor:</strong> `mesh-avatar-studio` có sẵn visual tool để kéo điểm neo và xem trước.
                </span>
              </div>
              <div className="flex items-start gap-2 text-amber-300/90">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Không tối ưu cho phong cách Duolingo:</strong> Ảnh bị co giãn dẻo kiểu thạch (jelly), khó làm các cử chỉ tay dứt khoát hay đổi nét vẽ mắt/miệng đặc trưng hoạt hình.
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5 font-mono text-[11px]">
              <span className="text-muted-foreground">// Tích hợp runtime từ mesh-avatar</span>
              <pre className="text-zinc-300">{`import { createMeshAvatar } from "mesh-avatar";

const avatar = createMeshAvatar({
  canvas,
  packageUrl: "/projects/duo.avatar",
});
avatar.setExpression({ turnX, turnY, mouthOpen });`}</pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decision Summary Table */}
      <Card className="border-zinc-800/80 bg-zinc-950/60">
        <CardHeader className="border-b border-zinc-800/60 py-3.5 px-5">
          <CardTitle className="text-sm font-semibold text-foreground">
            Bảng so sánh tổng kết cho bài toán Virtual MC trong Storytoon
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800/60 bg-zinc-900/50 text-muted-foreground">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Tiêu chí</th>
                  <th className="py-2.5 px-4 font-semibold text-emerald-400">Phương án 1 (SVG Rig)</th>
                  <th className="py-2.5 px-4 font-semibold text-sky-400">Phương án 2A (Rive .riv)</th>
                  <th className="py-2.5 px-4 font-semibold text-purple-400">Phương án 2B (Mesh Avatar)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                <tr>
                  <td className="py-2.5 px-4 font-medium text-foreground">Độ khớp phong cách Duolingo</td>
                  <td className="py-2.5 px-4 text-emerald-400">★★★★★ Rất cao</td>
                  <td className="py-2.5 px-4 text-sky-400">★★★★★ Chuẩn gốc</td>
                  <td className="py-2.5 px-4 text-zinc-500">★★★☆☆ (Hợp Anime hơn)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-foreground">Tự động hóa Lip-sync (Whisper)</td>
                  <td className="py-2.5 px-4 text-emerald-400">Cực kỳ đơn giản (khớp ms)</td>
                  <td className="py-2.5 px-4 text-zinc-400">Trung bình (map timeline)</td>
                  <td className="py-2.5 px-4 text-zinc-400">Trung bình (map param 0..1)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-foreground">Độ ổn định khi Remotion Render</td>
                  <td className="py-2.5 px-4 text-emerald-400">100% (DOM Vector)</td>
                  <td className="py-2.5 px-4 text-amber-400">Cần sync WebGL canvas</td>
                  <td className="py-2.5 px-4 text-amber-400">Có thể lỗi WebGL context</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-medium text-foreground">Tùy biến trang phục (Skin / Outfit)</td>
                  <td className="py-2.5 px-4 text-emerald-400">Rất linh hoạt (thay component)</td>
                  <td className="py-2.5 px-4 text-zinc-400">Cần sửa file .riv</td>
                  <td className="py-2.5 px-4 text-zinc-400">Cần tạo lại bộ layer PNG</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
