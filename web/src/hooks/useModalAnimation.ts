'use client';

import { useState, useEffect, useCallback } from 'react';

const ENTER_DELAY_MS = 20;
const EXIT_DURATION_MS = 200;

/**
 * Хук для плавного открытия/закрытия модалки.
 * Возвращает open (для анимации появления), closing (для анимации исчезновения)
 * и requestClose — вызывать при клике по overlay или кнопке «Отмена».
 */
export function useModalAnimation(isOpen: boolean, onClose: () => void) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setOpen(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpen(true));
      });
      return () => cancelAnimationFrame(id);
    }
    setOpen(false);
    setClosing(false);
  }, [isOpen]);

  const requestClose = useCallback(() => {
    setClosing(true);
    const t = setTimeout(() => {
      onClose();
      setClosing(false);
    }, EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, requestClose]);

  return { open, closing, requestClose };
}
