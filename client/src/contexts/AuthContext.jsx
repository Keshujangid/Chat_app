import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Restore session on mount */
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) return setLoading(false);

    api.get("/users/me")
       .then(({ data }) => setUser(data))
       .finally(() => setLoading(false));
  }, []);

  const login = (token, user) => {
    localStorage.setItem("jwt", token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("jwt");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}