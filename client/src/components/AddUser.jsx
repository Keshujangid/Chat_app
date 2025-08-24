"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  UserPlus,
  MessageCircle,
  Clock,
  UserCheck
} from "lucide-react";
import api from "../api/axios";
import { useDebounce } from "../hooks/useDebounce";
import { toast } from "sonner";

export function AddUser({ onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchQuery, 1000);

  useEffect(() => {
    loadUsers(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Load all users or search users
  const loadUsers = async (query = "") => {
    try {
      setIsLoading(true);
      const endpoint = query
        ? `/users?q=${encodeURIComponent(query)}`
        : "/users";
      const response = await api.get(endpoint);
      setAvailableUsers(response.data);
    } catch (error) {
      toast.error("Failed to load users:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    loadUsers(debouncedSearchTerm);
  };

  const handleAddFriend = async (userId) => {
    try {
      // console.log(userId);
      await api.post("/friendship/", {
        addresseeId: userId,
      });
      // console.log(response);
      // Update the UI to reflect the new status
      setAvailableUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, friendshipStatus: "PENDING_SENT" } : user
        )
      );
      toast.success("Friend request sent successfully!");
    } catch (error) {
      // Optionally, show a success message or update UI here
      toast.error("Failed to add friend:", error.message);
      // toast.error("Failed to add friend. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4 mb-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Find People</h1>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-medium text-gray-900 dark:text-white">
              All Users ({availableUsers.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage
                          src={user.avatarUrl || "/placeholder.svg"}
                        />
                        <AvatarFallback>
                          {user.username
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${
                          user.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      ></div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {user.username}
                        </h3>
                        <Badge
                          variant={user.isOnline ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {user.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {user.friendshipStatus === "FRIENDS" ? (
                      <Badge
                        // color="green"
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Friends
                      </Badge>
                    ) : (user.friendshipStatus === "PENDING_SENT" || user.friendshipStatus === "PENDING_RECEIVED") ? (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => handleAddFriend(user.id)}
                        size="sm"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {availableUsers.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No users found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search terms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
