import { createContext } from "react";

// Value is a function: (message, options?) => Promise<boolean>
export const ConfirmContext = createContext(null);
