import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Footer from "./Footer";
import UploadQueueManager from "./UploadQueueManager";

export default function Layout() {
  return (
    <div className="zr-page">
      <TopBar />
      <div className="zr-greybar" aria-hidden="true" />
      {/* Public site: no site-wide login gate. Admin routes are
          protected individually via <AdminOnly>/<RequireAdmin> in App.jsx. */}
      <main className="zr-main">
        <Outlet />
      </main>
      <Footer />
      <UploadQueueManager />
    </div>
  );
}
