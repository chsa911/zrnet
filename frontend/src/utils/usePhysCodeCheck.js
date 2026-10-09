import { useEffect, useState } from "react";
import { checkPhysCode } from "../api/books";
import { formatPhysCode } from "./pageNumPos";

// Live-Prüfung beim Eintippen: Gibt es die Buch-Nummer schon (exakt) oder
// ein sehr ähnliches Buch (gleiche Seiten/Position/Kapitel, Maße ±2 mm)?
// Die Nummer darf mehrfach vorkommen (gleiches Exemplar, mehrere Einträge) –
// "known" ist nur ein Hinweis, nichts wird gesperrt.
// -> { checking, known: [book], book, similar }
export default function usePhysCodeCheck(code, excludeId) {
  const [state, setState] = useState({ checking: false, known: [], book: null, similar: [] });

  useEffect(() => {
    if (!code) {
      setState({ checking: false, known: [], book: null, similar: [] });
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, checking: true }));
    const t = setTimeout(async () => {
      try {
        const r = await checkPhysCode(code, { exclude: excludeId || undefined, signal: ctrl.signal });
        setState({
          checking: false,
          known: Array.isArray(r?.exact_all) ? r.exact_all : r?.exact ? [r.exact] : [],
          book: r?.exact || null,
          similar: Array.isArray(r?.similar) ? r.similar : [],
        });
      } catch (e) {
        if (e?.name !== "AbortError") setState({ checking: false, known: [], book: null, similar: [] });
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

const STATUS_DE = {
  in_progress: "liest gerade",
  in_stock: "im Bestand",
  finished: "gelesen",
  abandoned: "abgebrochen",
  wishlist: "Wunschliste",
};

// Hinweis (keine Sperre): Nummer gibt es schon in N Einträgen
export function physCodeKnownText(code, books) {
  const list = (books || []).filter(Boolean);
  if (!list.length) return "";
  const items = list
    .slice(0, 3)
    .map((b) => `${bookShortText(b)}${STATUS_DE[b.reading_status] ? `, ${STATUS_DE[b.reading_status]}` : ""}`)
    .join(" · ");
  const more = list.length > 3 ? ` · +${list.length - 3}` : "";
  return `Nr ${formatPhysCode(code)} schon ${list.length}× erfasst: ${items}${more}`;
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
