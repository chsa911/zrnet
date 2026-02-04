import { useParams, useSearchParams } from "react-router-dom";

export default function StatsDetailPage() {
  const { type } = useParams();
  const [sp] = useSearchParams();
  const year = sp.get("year");

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>Stats: {type}</h2>
      <p>Year: {year}</p>
      <p>(Next: show list of books here)</p>
    </div>
  );
}