import { createContext, useContext, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import useAuth from "../hooks/useAuth";


export const SocketContext = createContext();

export default function SocketProvider({ children }) {
  const { user } = useAuth();

  // memoize socket instance until logout
  const socket = useMemo(() => {
    if (!user) return null;
    return io(import.meta.env.VITE_WS_URL, {
      auth: { token: localStorage.getItem("jwt") },
      autoConnect: false,
    });
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.connect();
    return () => socket.disconnect();
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);