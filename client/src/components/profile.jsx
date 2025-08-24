import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Camera,
  LogOut,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import * as Dialog from "@radix-ui/react-dialog";
import api from "../api/axios";

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.8
    );
  });
};

export function Profile({ onClose }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [profile, setProfile] = useState({});
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false); // Add uploading state
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchMe = async () => {
      const response = await api.get("/users/me");
      setProfile(response.data);
    };
    fetchMe();
  }, []);

  const handleSave = async () => {
    if(isSaving) return //prevent multiple saves
    try {
      // Send updated profile to backend
      setIsSaving(true);
      await api.put("/users/me", {
        username: profile.username,
        email: profile.email,
        bio: profile.bio,
      });

      setShowSuccess(true);
      toast.success("Profile updated successfully!");
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      toast.error("Failed to update profile. Please try again.", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onLogout = () => {
    localStorage.removeItem("jwt");
    window.location.href = "/login";
  };

  const handleProfileUpdate = (field, value) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      [field]: value,
    }));
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 5MB limit
        toast.error("Image size should be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
        setShowAvatarEditor(true);
        setCrop({ x: 0, y: 0 });
        8;
        setZoom(1);
        setRotate(0);
      };
      reader.readAsDataURL(file);
    }
  };
  const onCropComplete = useCallback((creppedaArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveAvatar = async () => {
    if (isUploading) return; // Prevent multiple uploads

    try {
      if (!selectedImage || !croppedAreaPixels) return;
      setIsUploading(true);
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels);

      const formData = new FormData();
      formData.append("avatar", croppedBlob, "avatar.jpg");

      const response = await api.put("/users/me/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setProfile((prev) => ({
        ...prev,
        avatarUrl: response.data.avatarUrl,
      }));

      setShowAvatarEditor(false);
      setSelectedImage(null);
      toast.success("Avatar updated successfully!");
    } catch (error) {
      toast.error("Failed to update avatar. Please try again.",error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelAvatarEdit = () => {
    setShowAvatarEditor(false);
    setSelectedImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotate(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>
          <Button
            variant="outline"
            onClick={onLogout}
            className="text-red-600 hover:text-red-700 bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={
                      profile.avatarUrl
                        ? profile.avatarUrl
                        : "/placeholder.svg?height=96&width=96"
                    }
                  />
                  <AvatarFallback className="text-lg">
                    {profile.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the camera icon to update your profile picture
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.username}
                  onChange={(e) =>
                    handleProfileUpdate("username", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  value={profile.bio || "empty"}
                  onChange={(e) => handleProfileUpdate("bio", e.target.value)}
                  rows={3}
                  maxLength={50}
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              className="w-full"
              disabled={showSuccess}
            >
              {showSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved!
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Avatar Editor Dialog */}
      <Dialog.Root open={showAvatarEditor} onOpenChange={setShowAvatarEditor}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg z-50 shadow-lg">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Edit Profile Picture
            </Dialog.Title>

            <div className="space-y-4">
              {selectedImage && (
                <div className="relative h-64 w-full bg-gray-100 rounded-lg overflow-hidden">
                  <Cropper
                    image={selectedImage}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotate}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onRotationChange={setRotate}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>
              )}

              {/* Controls */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <ZoomOut className="h-4 w-4" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="flex-1"
                    disabled={isUploading}
                  />
                  <ZoomIn className="h-4 w-4" />
                </div>

                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotate((prev) => prev - 90)}
                    disabled={isUploading}
                  >
                    <RotateCw className="h-4 w-4 mr-2 scale-x-[-1]" />
                    Rotate Left
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotate((prev) => prev + 90)}
                    disabled={isUploading}
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    Rotate Right
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={handleCancelAvatarEdit} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleSaveAvatar} disabled={isUploading}>Save Avatar</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
