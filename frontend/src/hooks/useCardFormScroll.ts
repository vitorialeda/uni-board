import { useEffect, useRef } from "react";

export function useCardFormScroll(
  isFormOpen: boolean,
  editingId: string | null,
) {
  const cardRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!isFormOpen || !editingId) return;

    const animationId = requestAnimationFrame(() => {
      const card = cardRef.current;
      const form = formRef.current;
      if (!card || !form) return;

      const cardRect = card.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const targetTop = card.scrollTop + (formRect.top - cardRect.top) - 8;

      card.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    });

    return () => cancelAnimationFrame(animationId);
  }, [isFormOpen, editingId]);

  return { cardRef, formRef };
}
