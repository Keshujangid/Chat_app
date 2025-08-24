import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Check, X, Clock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import api from "../api/axios";
import { formatMessageTime } from "../utils/formattime";

export function FriendRequests({ onClose }) {
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  useEffect(() => {
    const fetchFriendreq = async () => {
      try {
        const response = await api.get("/friendship/");

        setIncomingRequests(response.data.incomingRequests);
        setOutgoingRequests(response.data.outgoingRequests);
      } catch (error) {
        toast.error(error);
      }
    };
    fetchFriendreq();
  }, []);

  const handleAcceptRequest = async (requesterId, addresseeId) => {
    try {
      await api.put("/friendship/", {
        requesterId,
        addresseeId,
        status: "ACCEPTED",
      });
      // Remove the accepted request from the incomingRequests state
      setIncomingRequests((prev) =>
        prev.filter(
          (req) =>
            !(
              req.requesterId === requesterId && req.addresseeId === addresseeId
            )
        )
      );
      toast.success("Friend request accepted!");
    } catch (error) {
      toast.error(error);
    }
  };

  const handleDeclineRequest = async (requesterId, addresseeId) => {
    try {
      // console.log(requesterId, addresseeId);
      // Frontend Call
      await api.delete(`/friendship/${requesterId}/${addresseeId}`);
      // Remove the accepted request from the incomingRequests state
      setIncomingRequests((prev) =>
        prev.filter(
          (req) =>
            !(
              req.requesterId === requesterId && req.addresseeId === addresseeId
            )
        )
      );
      toast.success("Friend request deletd!");
    } catch (error) {
      toast.error(error);
    }
  };

  const handleCancelRequest = async (requesterId, addresseeId) => {
    try {
      // Frontend Call
      await api.delete(`/friendship/${requesterId}/${addresseeId}`);
      // Remove the accepted request from the incomingRequests state
      setOutgoingRequests((prev) =>
        prev.filter(
          (req) =>
            !(
              req.requesterId === requesterId && req.addresseeId === addresseeId
            )
        )
      );
      toast.success("Friend request deletd!");
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <h1 className="text-xl font-semibold">Friend Requests</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incoming" className="relative">
              Incoming
              {incomingRequests.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {incomingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="relative">
              Sent
              {outgoingRequests.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {outgoingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Incoming Requests</span>
                  <Badge variant="outline">
                    {incomingRequests.length} pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
                      <UserPlus className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No pending requests
                    </h3>
                    <p className="text-gray-500">
                      You don't have any incoming friend requests at the moment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incomingRequests.map((request) => (
                      <div
                        key={request.requesterId}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={
                                  request.requester.avatarUrl ||
                                  "/placeholder.svg"
                                }
                              />
                              <AvatarFallback>
                                {request.requester.username
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {request.requester.username}
                                </h3>
                                <span className="text-sm text-gray-500">
                                  • {formatMessageTime(request.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {request.requester.email}
                              </p>
                              {/* {request.mutualFriends > 0 && (
                                <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                                  {request.mutualFriends} mutual friend
                                  {request.mutualFriends !== 1 ? "s" : ""}
                                </p>
                              )} */}
                              {/* {request.message && (
                                <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-3 mt-2">
                                  <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {request.message}
                                  </p>
                                </div>
                              )} */}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAcceptRequest(
                                  request.requesterId,
                                  request.addresseeId,
                                  request.status
                                )
                              }
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleDeclineRequest(
                                  request.requesterId,
                                  request.addresseeId
                                )
                              }
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outgoing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sent Requests</span>
                  <Badge variant="outline">
                    {outgoingRequests.length} pending
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {outgoingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 mx-auto mb-4 w-24 h-24 flex items-center justify-center">
                      <Clock className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No sent requests
                    </h3>
                    <p className="text-gray-500">
                      You haven't sent any friend requests recently.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {outgoingRequests.map((request) => (
                      <div
                        key={request.addresseeId}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={
                                  request.addressee.avatarUrl ||
                                  "/placeholder.svg"
                                }
                              />
                              <AvatarFallback>
                                {request.addressee.username
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-gray-900 dark:text-white">
                                  {request.addressee.username}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {request.addressee.email}
                              </p>
                              <p className="text-sm text-gray-500">
                                Sent {formatMessageTime(request.createdAt)}
                              </p>
                              {/* {request.mutualFriends > 0 && (
                                <p className="text-sm text-blue-600 dark:text-blue-400">
                                  {request.mutualFriends} mutual friend
                                  {request.mutualFriends !== 1 ? "s" : ""}
                                </p>
                              )} */}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleCancelRequest(
                                request.requesterId,
                                request.addresseeId
                              )
                            }
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
