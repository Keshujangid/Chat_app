import "sonner";
import "./index.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

import App from "./App.jsx";

import React from "react";
import ReactDOM from "react-dom/client";
import AuthProvider from "./contexts/AuthContext";
import SocketProvider from "./contexts/SocketContext";
import { Toaster } from "@/components/ui/sonner";

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>
  <AuthProvider>
    <SocketProvider>
      <Theme>
        <App />
        <Toaster richColors position="top-right"/>
      </Theme>
    </SocketProvider>
  </AuthProvider>
  // </React.StrictMode>
);
