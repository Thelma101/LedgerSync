import { createContext, useContext } from "react";

export const FieldIdContext = createContext<string | undefined>(undefined);

export function useFieldId(explicitId?: string) {
  const contextId = useContext(FieldIdContext);
  return explicitId ?? contextId;
}
