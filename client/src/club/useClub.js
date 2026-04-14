import { useContext } from "react";
import { ClubContext } from "./clubContext";

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used within ClubProvider");
  return ctx;
}

