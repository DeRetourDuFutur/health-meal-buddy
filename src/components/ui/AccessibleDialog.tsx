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
  /** base unique et stable pour les ids, ex: "edit-aliment-<id>" */
  idBase: string;
  title: string;
  /** phrase courte ; si absent => pas d’aria-describedby */
  description?: string;
  /** contenu principal */
  body?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode; // alternative à body
  /** bouton ou élément déclencheur optionnel */
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
  const descId = `${idBase}-desc`;
  const descText = description ?? title ?? "Boîte de dialogue";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent aria-describedby={descId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription id={descId} className="sr-only">
          {descText}
        </DialogDescription>

        {body ?? children}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
