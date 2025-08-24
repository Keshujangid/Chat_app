import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../contexts/SocketContext";
import api from "../api/axios";
import useAuth from "../hooks/useAuth";
import { formatMessageTime } from "../utils/formattime";
import { FileAttachment } from "./file-attachment";
// import { toast } from "sonner";
import { MessageAttachments } from "./MessageAttachments";
import { EndOfMessagesIndicator, LoadingIndicator } from "./Indicator";
import { useOnlineUsers } from "../contexts/OnlineUsersContext";
import { toast } from "sonner";
/*
UI imports
*/

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreVertical, Users, Send } from "lucide-react";
import { cn } from "../lib/utils";

export default function ChatWindow({ conversation }) {
  const socket = useSocket();
  const { user } = useAuth();
  const { isUserOnline } = useOnlineUsers();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [nextCursor, setNextCursor] = useState();
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef();
  // const loader = useRef(null);

  // Refs for scroll management
  const messagesContainerRef = useRef();
  const scrollPositionRef = useRef(0);
  const isScrollingToBottomRef = useRef(false);

  const {
    id: conversationId,
    isGroup,
    avatarUrl,
    title,
    recipient,
    participants = [],
  } = conversation;

  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMore) return;

    setIsLoadingOlder(true);

    const container = messagesContainerRef.current;
    // FIX: Store the previous scrollHeight to calculate the new scroll position later.
    if (container) {
      scrollPositionRef.current = container.scrollHeight;
    }

    try {
      const endpoint = `/conversations/${conversationId}/messages?cursor=${nextCursor}`;
      const response = await api.get(endpoint);
      const { messages: olderMessages, nextCursor: newNextCursor } =
        response.data;

      if (olderMessages.length > 0) {
        setMessages((prev) => [...olderMessages, ...prev]);
        setNextCursor(newNextCursor);
        if (!newNextCursor) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      toast.error("Failed to load older messages:", error.message);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMore, conversationId, nextCursor]);

  // Initialize messages when chat changes
  useEffect(() => {
    // FIX: Reset state when the conversation ID changes to prevent showing old data.
    setMessages([]);
    setNextCursor(null);
    setHasMore(true);
    setIsInitialLoad(true);

    let isCancelled = false; // FIX: Flag to prevent race conditions

    const loadMessages = async () => {
      try {
        const response = await api.get(
          `/conversations/${conversationId}/messages`
        );

        // FIX: Check if the component is still mounted for this conversation
        if (isCancelled) return;

        const { messages: newMessages, nextCursor: newNextCursor } =
          response.data;

        // FIX: Replace the message state, don't append to the previous conversation's messages.
        setMessages(newMessages);
        setNextCursor(newNextCursor);
        if (!newNextCursor) {
          setHasMore(false);
        }
      } catch (error) {
        toast.error("Failed to load initial messages:", error.message);
      } finally {
        if (!isCancelled) {
          setIsInitialLoad(false);
        }
      }
    };

    loadMessages();

    // FIX: Cleanup function to run when the component unmounts or conversationId changes.
    return () => {
      isCancelled = true;
    };
  }, [conversationId]);

  // Add throttling ref
  const scrollTimeoutRef = useRef(null);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const container = messagesContainerRef.current;
      if (!container || isScrollingToBottomRef.current) return;

      const { scrollTop } = container;
      const scrolledToTop = scrollTop < 100;

      // Load older messages when scrolled near the top
      if (scrolledToTop && hasMore && !isLoadingOlder) {
        loadOlderMessages();
      }
    }, 100); // Throttle to 100ms
  }, [hasMore, isLoadingOlder, loadOlderMessages]);

  useEffect(() => {
    if (!isInitialLoad) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [isInitialLoad]);

  // Restore scroll position after loading older messages
  useEffect(() => {
    if (!isLoadingOlder && scrollPositionRef.current > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        const newScrollTop = container.scrollHeight - scrollPositionRef.current;
        container.scrollTop = newScrollTop;
        scrollPositionRef.current = 0;
      }
    }
  }, [isLoadingOlder]);

  // incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // ✅ Only add messages from OTHER users, not yourself
      // console.log(msg.conversationId, conversationId);
      if (msg.conversationId === conversationId) {
        // console.log(msg);
        setMessages((prevMessages) => [...prevMessages, msg]);
      }
    };

    const handleIncomingTyping = (data) => {
      // console.log("running", data.userId, data.conversationId);
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const handleIncomingStopTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setIsTyping(false);
      }
    };

   

    socket.on("message:new", handleNewMessage);
    socket.on("user:typing", handleIncomingTyping);
    socket.on("user:stop-typing", handleIncomingStopTyping);


    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("user:typing", handleIncomingTyping);
      socket.off("user:stop-typing", handleIncomingStopTyping);

    };
  }, [socket, conversationId, user.id, participants, isGroup, recipient]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("presence:request", { conversationId });
  }, [socket, conversationId]);



  // Handle sending messages
  const handleSendMessage = async () => {
    if (!message.trim() || !socket) return;

    // 1. Create a temporary message for optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      text: message.trim(),
      createdAt: new Date().toISOString(),
      senderId: user.id,
      sender: {
        // Make sure the sender object matches your data structure
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      status: "sending", // Add a status for UI feedback
    };

    // 2. Immediately add the optimistic message to the state
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessage(""); // Clear the input

    // 3. Emit the message to the server with an acknowledgment callback
    socket.emit(
      "message:send",
      {
        conversationId,
        text: message.trim(),
      },
      (response) => {
        // 4. Handle the server's response in the callback
        if (response.status === "ok") {
          // Find the temporary message and replace it with the final, saved message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...response.message, status: "sent" } : msg
            )
          );
        } else {
          // If sending failed, update the message status to show an error
          // console.error("Failed to send message:", response.message);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...msg, status: "failed" } : msg
            )
          );
        }
      }
    );
    // Scroll to bottom after sending message
    scrollToBottom()
  };

  const handleFilesSent = (uploadedFiles) => {
    if (!socket || uploadedFiles.length === 0) return;

    // 1. Create temporary messages for an instant UI update
    const tempId = `temp-${Date.now()}`;
    const attachments = uploadedFiles.map((file, index) => ({
      // Mimic the schema structure
      id: file.id || `temp-attachment-${Date.now()}-${index}`,
      url: file.url,
      name: file.name,
      fileSize: file.fileSize,
      type: file.type,
      mimeType: file.mimeType,
    }));
    const optimisticMessage = {
      id: tempId,
      sender: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      createdAt: new Date().toISOString(),
      text: message,
      status: "sending", // Add a status for UI feedback
      Attachment: attachments,
    };

    // console.log(optimisticMessage);
    // 2. Add the temporary messages to the state immediately
    setMessages((prev) => [...prev, optimisticMessage]);

    // 3. Send each file as a separate message to the server
    const payload = {
      conversationId,
      text: optimisticMessage.text,
      attachments: attachments,
      messageType: "FILE", // Specify this is a file message
    };

    socket.emit("message:send", payload, (response) => {
      // 4. Use the server's callback to update the temporary message
      if (response.status === "ok") {
        // Replace the temporary message with the final, saved message from the server
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...response.message, status: "sent" } : m
          )
        );
      } else {
        // If sending failed, update the UI to show an error
        // console.error("Failed to send file:", response.error);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
        );
      }
    });
    // Auto-scroll to bottom after sending files
    scrollToBottom()
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      const container = messagesContainerRef.current;
      if (container) {
        isScrollingToBottomRef.current = true;
        container.scrollTop = container.scrollHeight;
        setTimeout(() => {
          isScrollingToBottomRef.current = false;
        }, 100);
      }
    }, 50);
  };
  // Handle typing indicator
  // In ChatWindow.jsx
  const handleTyping = () => {
    if (socket && !isTypingRef.current) {
      socket.emit("user:typing", { conversationId });
      isTypingRef.current = true;

      // Stop typing after 3 seconds of no activity
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("user:stop-typing", { conversationId });
        isTypingRef.current = false;
      }, 3000);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar>
                <AvatarImage
                  src={
                    isGroup
                      ? avatarUrl
                      : recipient.avatarUrl || "/placeholder.svg"
                  }
                />
                <AvatarFallback>
                  {isGroup ? (
                    <Users className="h-4 w-4" />
                  ) : (
                    recipient.username
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                  )}
                </AvatarFallback>
              </Avatar>
              {!isGroup && isUserOnline(recipient.id) && (
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {isGroup ? title : recipient.username}
              </h2>
              <p className="text-sm text-gray-500">
                {isGroup
                  ? `${participants.length + 1} members`
                  : isUserOnline(recipient.id)
                    ? "Online"
                    : "Last seen recently"}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
        style={{
          scrollBehavior: isScrollingToBottomRef.current ? "smooth" : "auto",
        }}
      >
        {/* Loading indicator at top */}
        {isLoadingOlder && <LoadingIndicator />}

        {/* End of messages indicator */}
        {!hasMore && !isLoadingOlder && (
          <EndOfMessagesIndicator isGroup={isGroup} />
        )}

        {/* Messages */}
        {messages.map((msg) => {
          const showAvatar = isGroup && msg.sender.id !== user.id;

          const showSenderName =
            isGroup && msg.sender.id !== user.id && showAvatar;

          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.sender.id === user.id ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "flex max-w-xs lg:max-w-md",
                  msg.sender.id === user.id ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar for group chats - only show for others' messages when needed */}
                {showAvatar && (
                  <div
                    className={cn(
                      "flex-shrink-0",
                      msg.sender.id === user.id ? "ml-2" : "mr-2"
                    )}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={msg.sender.avatarUrl || "/placeholder.svg"}
                      />
                      <AvatarFallback className="text-xs">
                        {msg.sender.username
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Spacer when avatar is not shown but needed for alignment */}
                {isGroup && msg.sender.id !== user.id && !showAvatar && (
                  <div className="w-6 mr-2 flex-shrink-0" />
                )}

                <div className="flex flex-col">
                  {/* Sender name for group chats - only show when needed */}
                  {showSenderName && msg.sender.username && (
                    <p
                      className={cn(
                        "text-xs text-gray-600 dark:text-gray-400 mb-1",
                        msg.sender.id === user.id
                          ? "text-right mr-2"
                          : "text-left ml-2"
                      )}
                    >
                      {msg.sender.username}
                    </p>
                  )}

                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl",
                      msg.sender.id === user.id
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                    )}
                  >
                    <p className="text-sm">{msg.text}</p>
                    {/* File attachments */}
                    {msg.Attachment && msg.Attachment.length > 0 && (
                      <MessageAttachments
                        attachments={msg.Attachment}
                        sender={msg.sender.id}
                      />
                    )}
                    <p
                      className={cn(
                        "text-xs mt-1",
                        msg.sender.id === user.id
                          ? "text-blue-100"
                          : "text-gray-500"
                      )}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <FileAttachment onFilesSent={handleFilesSent} />
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
