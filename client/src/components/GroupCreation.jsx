import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Check, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../api/axios";
import { useDebounce } from "../hooks/useDebounce";
import {Spinner} from "@radix-ui/themes"

export function GroupCreation({ onClose }) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // Array of user objects
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  // ✅ Single toggle function for user selection
  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedUsers.length < 2) {
      toast.error("Please select at least 2 member for the group");
      return;
    }

    try {
      setIsCreating(true);
      await api.post("/conversations/group", {
        name: groupName.trim(),
        participantIds: selectedUsers.map((user) => user.id),
      });

      // onGroupCreated(response.data);
      onClose();
    } catch (error) {
      // console.error("Failed to create group:", error);
      toast.error("Failed to create group. Please try again.",error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800  border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Create Group</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Group Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Group Information</span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Member Selection */}
        <Card>
          <CardHeader>
            <CardTitle>
              Select Members ({selectedUsers.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>
            {/* Users List */}
            <div className="space-y-3">
            <Spinner size={3} loading={isLoading}/>
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Checkbox
                    id={user.id}
                    checked={selectedUsers.some((u) => u.id === user.id)}
                    onCheckedChange={() => toggleUserSelection(user)}
                  />
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl || "/placeholder.svg"} />
                      <AvatarFallback>
                        {user.username?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 ${
                        user.isOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                  {selectedUsers.includes(user.id) && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create Button */}
        <Button
          onClick={handleCreateGroup}
          className="w-full"
          size="lg"
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Group...
            </>
          ) : (
            <>
              <Users className="h-4 w-4 mr-2" />
              Create Group
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
