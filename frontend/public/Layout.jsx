import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="zr-page">
      <TopBar />
      <div className="zr-greybar" aria-hidden="true" />
      <main className="zr-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}