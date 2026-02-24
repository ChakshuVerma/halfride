import { createContext, useContext } from "react";

export type EntityModalParams = {
  type: "group" | "traveller";
  airportCode: string;
  entityId: string;
  /** Optional airport name for display/fetch; falls back to airportCode. */
  airportName?: string;
};

export type EntityModalContextValue = {
  openEntityModal: (params: EntityModalParams) => void;
  closeEntityModal: () => void;
};

export const EntityModalContext =
  createContext<EntityModalContextValue | null>(null);

export function useEntityModal() {
  const ctx = useContext(EntityModalContext);
  if (!ctx) {
    throw new Error("useEntityModal must be used within EntityModalProvider");
  }
  return ctx;
}

