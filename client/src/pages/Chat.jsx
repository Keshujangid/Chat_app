// Chat.jsx

import { useEffect, useState } from "react";
import api from "../api/axios";
import useAuth from "../hooks/useAuth";
import { useSocket } from "../contexts/SocketContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import { Users } from "lucide-react";
import { GroupCreation } from "../components/GroupCreation";
import { AddUser } from "../components/AddUser";
import { FriendRequests } from "../components/FriendRequests";
import { Profile } from "../components/profile";

export default function Chat() {
  const { user } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  //Add modal states
  const [view, setView] = useState("chat");

  // 1. Fetch initial list of conversations
  useEffect(() => {
    api.get("/conversations").then((res) => {
      setConversations(res.data);
    });
  }, []);
  

  // 5. Handle selecting a conversation from the sidebar
  const handleConversationSelect = async (id) => {
    // Handle special actions
    if (id === "create-group") {
      setView("create-group"); // Switch to the group creation view
    } else if (id === "add-user") {
      setView("add-user");
    } else if (id === "requests") {
      setView("requests");
    } else if (id === "profile") {
      setView("profile");
    } else {
      // Handle normal conversation selection
      try {
        const response = await api.get(`/conversations/${id}`);
        setActiveConversation(response.data);

        setView("chat");
      } catch (error) {
        // console.error("Failed to fetch conversation:", error);
      }
    }
  };

  // 6. Join the socket room for the active conversation
  useEffect(() => {
    const conversationId = activeConversation?.id;

    if (socket && conversationId) {
      socket.emit("conversation:join", conversationId);

      // Cleanup when the component unmounts or the ID changes
      return () => {
        socket.emit("conversation:leave", conversationId);
      };
    }
  }, [socket, activeConversation?.id]);

  // ✅ 3. Function to close the GroupCreation view
  const handleGroupCreationClose = () => {
    setView("chat"); // Switch back to the default chat view
  };

  if (!user) return null;

  if (view === "create-group") {
    return <GroupCreation onClose={handleGroupCreationClose} />;
  }

  if (view === "add-user")
    return <AddUser onClose={handleGroupCreationClose} />;
  if (view === "requests")
    return <FriendRequests onClose={handleGroupCreationClose} />;
  if (view === "profile") return <Profile onClose={handleGroupCreationClose} />;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        items={conversations}
        active={activeConversation}
        onSelect={handleConversationSelect}
      />

      {activeConversation ? (
        <ChatWindow conversation={activeConversation} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            {/* Placeholder UI */}
            <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-6 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select a conversation
            </h3>
            <p className="text-gray-500">
              Choose a chat from the sidebar to start messaging
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
