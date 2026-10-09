import { useEffect, useState } from "react";
import { checkPhysCode } from "../api/books";
import { formatPhysCode } from "./pageNumPos";

// Live-Prüfung beim Eintippen: Gibt es die Buch-Nummer schon (exakt) oder
// ein sehr ähnliches Buch (gleiche Seiten/Position/Kapitel, Maße ±2 mm)?
// -> { checking, taken, book, similar }
export default function usePhysCodeCheck(code, excludeId) {
  const [state, setState] = useState({ checking: false, taken: false, book: null, similar: [] });

  useEffect(() => {
    if (!code) {
      setState({ checking: false, taken: false, book: null, similar: [] });
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, checking: true }));
    const t = setTimeout(async () => {
      try {
        const r = await checkPhysCode(code, { exclude: excludeId || undefined, signal: ctrl.signal });
        setState({
          checking: false,
          taken: !!r?.exact,
          book: r?.exact || null,
          similar: Array.isArray(r?.similar) ? r.similar : [],
        });
      } catch (e) {
        if (e?.name !== "AbortError") setState({ checking: false, taken: false, book: null, similar: [] });
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [code, excludeId]);

  return state;
}

export function bookShortText(book) {
  const who = [book?.title_display, book?.author_name_display].filter(Boolean).join(" – ");
  return `${who || "Buch"}${book?.barcode ? ` (${book.barcode})` : ""}`;
}

export function physCodeTakenText(code, book) {
  return `Nr ${formatPhysCode(code)} ist schon vergeben: ${bookShortText(book)}`;
}

function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

export function similarText(similar) {
  if (!similar?.length) return "";
  return (
    "Ähnlich: " +
    similar
      .slice(0, 3)
      .map((s) => {
        const d = [];
        if (s.diff?.width_mm) d.push(`Breite ${signed(s.diff.width_mm)} mm`);
        if (s.diff?.height_mm) d.push(`Höhe ${signed(s.diff.height_mm)} mm`);
        return `${bookShortText(s.book)}${d.length ? ` [${d.join(", ")}]` : ""}`;
      })
      .join(" · ")
  );
}
