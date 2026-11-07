"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Promise-based replacement for `window.confirm`, rendered with the app's Dialog.
 *
 *   const [confirm, confirmDialog] = useConfirmDialog();
 *   if (!(await confirm({ title: "Xoá dự án?" }))) return;
 *   ...
 *   return <>{confirmDialog}...</>;
 */
export function useConfirmDialog(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolverRef.current?.(false);
    setOpts(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  const dialog = (
    <Dialog open={opts !== null} onOpenChange={(open) => !open && settle(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {opts?.destructive !== false && (
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
            )}
            {opts?.title}
          </DialogTitle>
          {opts?.description && <DialogDescription>{opts.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => settle(false)}>
            {opts?.cancelLabel ?? "Huỷ"}
          </Button>
          <Button
            variant={opts?.destructive === false ? "default" : "destructive"}
            onClick={() => settle(true)}
            autoFocus
          >
            {opts?.confirmLabel ?? "Xoá"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [confirm, dialog];
}

/** Standard copy for permanently deleting a project. */
export function deleteProjectConfirm(projectTitle: string): ConfirmOptions {
  return {
    title: "Xoá vĩnh viễn dự án?",
    description: (
      <>
        Dự án <strong className="text-foreground">“{projectTitle}”</strong> cùng giọng đọc, phụ đề
        và phân cảnh sẽ bị xoá. Không thể hoàn tác.
      </>
    ),
    confirmLabel: "Xoá dự án",
  };
}
