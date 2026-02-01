import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#95d4cf" }}>
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
