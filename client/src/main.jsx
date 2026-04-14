import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { ClubProvider } from "./club/ClubProvider.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ClubProvider>
        <App />
      </ClubProvider>
    </AuthProvider>
  </StrictMode>
);
