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

      const scrollContainer =
        card.querySelector<HTMLElement>(".card-scroll") ?? card;

      const cardRect = scrollContainer.getBoundingClientRect();
      const formRect = form.getBoundingClientRect();
      const targetTop =
        scrollContainer.scrollTop + (formRect.top - cardRect.top) - 8;

      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(animationId);
  }, [isFormOpen, editingId]);

  return { cardRef, formRef };
}
