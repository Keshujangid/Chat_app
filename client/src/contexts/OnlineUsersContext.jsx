// contexts/OnlineUsersContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

const OnlineUsersContext = createContext();

export const OnlineUsersProvider = ({ children }) => {
  const socket = useSocket();
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!socket) return;

    // Event: 'users:online' - Receives the full list of online users when you first connect
    const handleInitialOnlineUsers = (userIds) => {
      // console.log("Initial online users:", userIds);
      setOnlineUsers(new Set(userIds));
    };

    // Event: 'user:online' - Fired when another user comes online
    const handleUserOnline = ({ userId }) => {
      // console.log("User came online:", userId);
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    // Event: 'user:offline' - Fired when a user goes offline
    const handleUserOffline = ({ userId }) => {
      // console.log("User went offline:", userId);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on("users:online", handleInitialOnlineUsers);
    socket.on("user:online", handleUserOnline);
    socket.on("user:offline", handleUserOffline);

    return () => {
      socket.off("users:online", handleInitialOnlineUsers);
      socket.off("user:online", handleUserOnline);
      socket.off("user:offline", handleUserOffline);
    };
  }, [socket]);

  const isUserOnline = (userId) => onlineUsers.has(userId);

  return (
    <OnlineUsersContext.Provider value={{ onlineUsers, isUserOnline }}>
      {children}
    </OnlineUsersContext.Provider>
  );
};

export const useOnlineUsers = () => {
  const context = useContext(OnlineUsersContext);
  if (!context) {
    throw new Error('useOnlineUsers must be used within OnlineUsersProvider');
  }
  return context;
};