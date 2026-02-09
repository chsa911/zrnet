import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";

export default function Layout() {
  return (
    <div>
      <TopBar />
      <div className="zr-greybar" aria-hidden="true" />
      <main className="zr-main">
        <Outlet />
      </main>
    </div>
  );
}