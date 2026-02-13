import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AdminNavRow({ style }) {
  const { pathname } = useLocation();

  const baseBtn = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    textDecoration: "none",
    color: "inherit",
    background: active ? "rgba(0,0,0,0.06)" : "#fff",
    fontWeight: 700,
    opacity: active ? 1 : 0.9,
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 14,
        ...style,
      }}
    >
      <Link
        to="/admin/register"
        className="zr-btn2 zr-btn2--ghost"
        style={baseBtn(pathname === "/admin/register")}
      >
        ➕ Register
      </Link>

      <Link
        to="/admin/search-update"
        className="zr-btn2 zr-btn2--ghost"
        style={baseBtn(pathname === "/admin/search-update")}
      >
        🔎 Search &amp; Update
      </Link>

      <Link
        to="/admin/sync-issues"
        className="zr-btn2 zr-btn2--ghost"
        style={baseBtn(pathname === "/admin/sync-issues")}
      >
        ⚠️ Sync Issues
      </Link>

      <Link
        to="/admin/barcodes"
        className="zr-btn2 zr-btn2--ghost"
        style={baseBtn(pathname === "/admin/barcodes")}
      >
        🏷️ Barcodes
      </Link>

      <Link
        to="/admin/barcodes"
        className="zr-btn2 zr-btn2--ghost"
        style={baseBtn(pathname === "/admin/barcodes")}
      >
        🏷️ Barcodes
      </Link>
    </div>
  );
}   