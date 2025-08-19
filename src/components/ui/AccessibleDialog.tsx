import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type AccessibleDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** base unique et stable pour les ids, ex: "edit-aliment-<id>" */
  idBase: string;
  title: string;
  /** phrase courte ; si absent => pas d’aria-describedby */
  description?: string;
  /** contenu principal */
  body?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode; // alternative à body
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
}: AccessibleDialogProps) {
  const descId = `${idBase}-desc`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={description ? descId : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {description ? (
          <DialogDescription id={descId} className="sr-only">
            {description}
          </DialogDescription>
        ) : null}

        {body ?? children}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
