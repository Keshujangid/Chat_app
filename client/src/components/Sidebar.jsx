import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useOnlineUsers } from "../contexts/OnlineUsersContext";

import { Search, User, Users, Plus, MoreVertical, UserPlus } from "lucide-react";
import { cn } from "../lib/utils";

export default function Sidebar({ items = [], active, onSelect }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { isUserOnline } = useOnlineUsers();


  useEffect(() => {
    if (active) {
      setSelectedChat(active.id);
    }
  }, [active]);

  const handleChatSelect = (chat) => {
    setSelectedChat(chat.id);
    if (onSelect) {
      onSelect(chat.id);
    }
  };

    const filteredChats = useMemo(() => {
    return items.filter((chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);



  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Messages</h1>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelect("add-user")}
              title="Find Users"
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelect("create-group")}
              title="Create Group"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelect("requests")}
              title="Friend Requests"
            >
              <UserPlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSelect("profile")}
              title="Profile"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleChatSelect(chat)}
              className={cn(
                "p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                selectedChat === chat.id &&
                  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={chat.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {chat.isGroup ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        chat.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {isUserOnline(chat.userId) && !chat.isGroup && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {chat.name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {chat.timestamp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {chat.lastMessage}
                    </p>
                    {chat.unread > 0 && (
                      <Badge
                        variant="default"
                        className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                      >
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
