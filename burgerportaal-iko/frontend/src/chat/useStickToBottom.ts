import { useEffect, useLayoutEffect, useRef } from "react";

// "Stick to bottom"-gedrag zoals moderne LLM-chats: terwijl er content bijkomt
// blijft de scroll onderaan geplakt, maar zodra de gebruiker omhoog scrollt om
// terug te lezen laten we los (en springen niet meer mee). Stuurt de gebruiker
// een nieuw bericht of opent hij een ander gesprek (signal verandert), dan
// plakken we weer onderaan.
//
// Werkt op een element (widget: de scroll-container) of op het venster
// (chatpagina: page-scroll).

interface Opts {
  // Scroll-container voor het widget (bounded panel).
  ref?: React.RefObject<HTMLElement | null>;
  // Gebruik page-scroll (document) in plaats van een element.
  windowScroll?: boolean;
  // Alleen actief wanneer de chat zichtbaar is.
  active: boolean;
  // Verandert wanneer de gebruiker iets stuurt of van gesprek wisselt → weer plakken.
  signal: string;
}

function scrollerOf(opts: Opts): HTMLElement | null {
  if (opts.windowScroll) {
    return (document.scrollingElement as HTMLElement) || document.documentElement;
  }
  return opts.ref?.current ?? null;
}

export function useStickToBottom({ ref, windowScroll, active, signal }: Opts) {
  const stick = useRef(true);
  const prevSignal = useRef(signal);

  // Volg of de gebruiker (bijna) onderaan staat.
  useEffect(() => {
    if (!active) return undefined;
    const target: Window | HTMLElement | null = windowScroll
      ? window
      : (ref?.current ?? null);
    if (!target) return undefined;
    const onScroll = () => {
      const e = scrollerOf({ ref, windowScroll, active, signal });
      if (!e) return;
      stick.current = e.scrollHeight - e.scrollTop - e.clientHeight < 120;
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
    // active/windowScroll/ref zijn stabiel; signal bewust niet (anders re-attach per token).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, windowScroll, ref]);

  // Na elke render: onderaan blijven als we 'plakken'. Bij een nieuw bericht of
  // gespreksswitch (signal) forceren we het plakken weer aan.
  useLayoutEffect(() => {
    if (!active) return;
    if (signal !== prevSignal.current) {
      prevSignal.current = signal;
      stick.current = true;
    }
    const el = scrollerOf({ ref, windowScroll, active, signal });
    if (el && stick.current) {
      el.scrollTop = el.scrollHeight;
    }
  });
}
