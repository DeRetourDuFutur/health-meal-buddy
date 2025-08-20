import React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AccessibleDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  idBase: string; // ex: "edit-aliment-123"
  title: string;
  description?: string;
  body?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
};

export function AccessibleDialog({
  open,
  onOpenChange,
  idBase,
  title,
  description,
  body,
  footer,
  children,
  trigger,
}: AccessibleDialogProps) {
  // Ids stables et réutilisés partout
  const titleId = `${idBase}-title`;
  const descId = `${idBase}-desc`;
  const descText = description ?? title ?? "Boîte de dialogue";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      {/* Fournit explicitement les liens ARIA pour éviter les warnings en dev */}
      <DialogContent aria-labelledby={titleId} aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
          {/* Toujours présent pour l’accessibilité; le masquer visuellement si description est vide */}
          <DialogDescription id={descId} className={description ? undefined : "sr-only"}>
            {descText}
          </DialogDescription>
        </DialogHeader>

        {body ?? children}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
