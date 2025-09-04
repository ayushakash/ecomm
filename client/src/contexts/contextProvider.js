import { createContext, useState } from "react";

export const MyContext = createContext();

export const MyProvider = ({ children }) => {
  const [user, setUser] = useState({ name: "Ayush", age: 27 });

  const value = { user, setUser };

  // Expose context for debugging
  if (typeof window !== "undefined") {
    window.__MY_CONTEXT__ = value;
  }

  return (
    <MyContext.Provider value={value}>
      {children}
    </MyContext.Provider>
  );
};