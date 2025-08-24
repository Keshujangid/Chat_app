import { downloadFile } from "../utils/downloadFile";
import { cn } from "../lib/utils";
import { formatFileSize } from "../utils/formatFileSize";
import useAuth from "../hooks/useAuth";
import {
  ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";


// File attachment component for messages
const MessageAttachments = ({ attachments, sender }) => {
  const { user } = useAuth();

  const getFileIcon = (file) => {
    if (file.type.startsWith("IMAGE")) {
      return <ImageIcon className="h-5 w-5 text-green-600" />;
    } else if (file.type.startsWith("video/")) {
      return <Video className="h-5 w-5 text-purple-600" />;
    } else if (file.type.startsWith("audio/")) {
      return <Music className="h-5 w-5 text-blue-600" />;
    } else if (
      file.type === "application/pdf" ||
      file.type.includes("document")
    ) {
      return <FileText className="h-5 w-5 text-red-600" />;
    } else if (file.type.includes("zip") || file.type.includes("archive")) {
      return <Archive className="h-5 w-5 text-orange-600" />;
    }
    return <Eye className="h-5 w-5 text-gray-400" />;
  };

  const handlePreviewFile = (file) => {
    if (file.url) {
      // Open file in new tab for preview
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  };
  
  return (
    <div className="mt-2 space-y-2">
      {attachments.map((file) => (
        <div
          key={file.id}
          className={cn(
            "rounded-lg p-3 border transition-colors cursor-pointer",
            sender === user.id
              ? "bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
              : "bg-gray-50 dark:bg-gray-600 border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500"
          )}
          onClick={() => handlePreviewFile(file)}
        >
          <div className="flex items-center space-x-3">
            {file.preview ? (
              <div className="relative">
                <img
                  src={file.preview || "/placeholder.svg"}
                  alt={file.name}
                  className={cn(
                    "w-12 h-12 object-cover rounded",
                    sender === user.id
                      ? "border-2 border-white/30"
                      : "border-2 border-gray-300 dark:border-gray-400"
                  )}
                />
                <div
                  className={cn(
                    "absolute -top-1 -right-1 rounded-full p-1",
                    sender === user.id ? "bg-green-400" : "bg-green-500"
                  )}
                >
                  <ImageIcon className="h-3 w-3 text-white" />
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "w-12 h-12 rounded flex items-center justify-center border-2",
                  sender === user.id
                    ? "bg-white/20 border-white/30"
                    : "bg-gray-100 dark:bg-gray-500 border-gray-300 dark:border-gray-400"
                )}
              >
                {getFileIcon(file)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  sender === user.id
                    ? "text-white"
                    : "text-gray-900 dark:text-white"
                )}
              >
                {file.name}
              </p>
              <p
                className={cn(
                  "text-xs",
                  sender === user.id
                    ? "text-white/70"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {formatFileSize(file.fileSize)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                sender === user.id
                  ? "hover:bg-white/20 text-white/80 hover:text-white"
                  : "hover:bg-gray-200 dark:hover:bg-gray-400 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              )}
              title="Download file"
              onClick={(e) => {
                e.stopPropagation(); // Prevent any parent click handlers
                downloadFile(file);
              }}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export { MessageAttachments };
