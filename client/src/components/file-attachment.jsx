import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@radix-ui/react-progress";
import { Badge } from "@/components/ui/badge"
import api from "../api/axios";
import {
  Paperclip,
  X,
  Upload,
  ImageIcon,
  Video,
  Music,
  FileText,
  Archive,
  Send,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner";
// File type configurations
const ALLOWED_FILE_TYPES = {
  images: {
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: ImageIcon,
    color: "text-green-600",
  },
  videos: {
    extensions: [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"],
    mimeTypes: ["video/mp4", "video/avi", "video/quicktime", "video/x-ms-wmv", "video/x-flv", "video/webm"],
    maxSize: 100 * 1024 * 1024, // 100MB
    icon: Video,
    color: "text-purple-600",
  },
  audio: {
    extensions: [".mp3", ".wav", ".ogg", ".m4a", ".aac"],
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac"],
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: Music,
    color: "text-blue-600",
  },
  documents: {
    extensions: [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt"],
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/rtf",
      "application/vnd.oasis.opendocument.text",
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    icon: FileText,
    color: "text-red-600",
  },
  archives: {
    extensions: [".zip", ".rar", ".7z", ".tar", ".gz"],
    mimeTypes: [
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/x-tar",
      "application/gzip",
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: Archive,
    color: "text-orange-600",
  },
}

const MAX_FILES = 5
const TOTAL_MAX_SIZE = 200 * 1024 * 1024 // 200MB total

export function FileAttachment({ onFilesSent, disabled = false } ) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  

  // Format file size
  const formatFileSize = (bytes ) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Get file type info
  const getFileTypeInfo = (file) => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase()

    for (const [category, config] of Object.entries(ALLOWED_FILE_TYPES)) {
      if (config.extensions.includes(extension) || config.mimeTypes.includes(file.type)) {
        return { category, ...config }
      }
    }

    return {
      category: "other",
      extensions: [],
      mimeTypes: [],
      maxSize: 10 * 1024 * 1024,
      icon: ImageIcon,
      color: "text-gray-600",
    }
  }

  // Validate file
  const validateFile = useCallback((file)=> {
    const fileTypeInfo = getFileTypeInfo(file)

    // Check file type
    if (fileTypeInfo.category === "other") {
      return {
        isValid: false,
        error: `File type not supported. Allowed types: ${Object.values(ALLOWED_FILE_TYPES)
          .flatMap((t) => t.extensions)
          .join(", ")}`,
      }
    }

    // Check file size
    if (file.size > fileTypeInfo.maxSize) {
      return {
        isValid: false,
        error: `File too large. Maximum size for ${fileTypeInfo.category}: ${formatFileSize(fileTypeInfo.maxSize)}`,
      }
    }

    return { isValid: true }
  },[])

  

  // Create file preview
  const createFilePreview = useCallback((file) => {
    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(file)
      } else {
        resolve(undefined)
      }
    })
  }, [])



  const uploadFile = (fileToUpload) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", fileToUpload.file); // The key 'file' must match your multer config

      // Set initial uploading state
      setAttachedFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? { ...f, uploadStatus: "uploading", uploadProgress: 0 }
            : f
        )
      );

      // Make the API call using your axios instance
      api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setAttachedFiles((prev) =>
              prev.map((f) =>
                f.id === fileToUpload.id ? { ...f, uploadProgress: progress } : f
              )
            );
          },
        })
        .then((response) => {
          // Update status to success
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === fileToUpload.id ? { ...f, uploadStatus: "success" } : f
            )
          );
          resolve(response.data); // Resolve with the data from the backend
        })
        .catch((error) => {
          // console.error("Upload failed:", error);
          setAttachedFiles((prev) =>
            prev.map((f) =>
              f.id === fileToUpload.id
                ? { ...f, uploadStatus: "error", errorMessage: "Upload failed" }
                : f
            )
          );
          reject(error);
        });
    });
  };

  // --- MODIFIED: The logic for sending files is now simpler ---
  const handleSendFiles = async () => {
    if (isUploading) return;

    const filesToUpload = attachedFiles.filter(
      (f) => f.uploadStatus === "pending"
    );
    if (filesToUpload.length === 0) return;

    setIsUploading(true);

    const uploadPromises = filesToUpload.map((file) => uploadFile(file));

    try {
      const uploadedFilesData = await Promise.all(uploadPromises);
      const successfulUploads = uploadedFilesData.filter(Boolean);

      if (successfulUploads.length > 0) {
        // console.log(successfulUploads)
        onFilesSent(successfulUploads);
        toast.success(`${successfulUploads.length} file(s) sent successfully.`);
      }

      setAttachedFiles([]);
      setIsDialogOpen(false);
    } catch (error) {
      // console.log(error)
      toast.error("Some files failed to upload. Please try again.",error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelection = useCallback(
    async (files) => {
      const newFiles = []

      // Check total file count
      if (attachedFiles.length + files.length > MAX_FILES) {
        toast.error(`Too many files. Maximum ${MAX_FILES} files allowed`);
        return
      }

      // Check total size
      const currentTotalSize = attachedFiles.reduce((sum, f) => sum + f.size, 0)
      const newTotalSize = Array.from(files).reduce((sum, f) => sum + f.size, 0)

      if (currentTotalSize + newTotalSize > TOTAL_MAX_SIZE) {
        toast.error(`Files too large. Total size limit: ${formatFileSize(TOTAL_MAX_SIZE)}`);
        return
      }

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const validation = validateFile(file)

        if (!validation.isValid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue
        }

        const preview = await createFilePreview(file)

        const attachedFile = {
          id: Date.now().toString() + i,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview,
          uploadStatus: "pending",
          uploadProgress: 0,
        }

        newFiles.push(attachedFile)
      }

      if (newFiles.length > 0) {
        setAttachedFiles((prev) => [...prev, ...newFiles])
        setIsDialogOpen(true)

        toast.success(`${newFiles.length} file(s) ready to send`);
      }
    },
    [attachedFiles, createFilePreview,validateFile]
  )

  // Handle file input change
  const handleFileInputChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelection(files)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Handle drag and drop
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelection(files)
      }
    },
    [handleFileSelection],
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Remove file
  const removeFile = (fileId) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }



  // Get file icon
  const getFileIcon = (file) => {
    const typeInfo = getFileTypeInfo(file.file)
    const IconComponent = typeInfo.icon
    return <IconComponent className={cn("h-8 w-8", typeInfo.color)} />
  }

  const totalSize = attachedFiles.reduce((sum, f) => sum + f.size, 0)
  const canSend = attachedFiles.length > 0 && attachedFiles.every((f) => f.uploadStatus !== "uploading")

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Attach files"
      >
        <Paperclip className="h-5 w-5" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept={Object.values(ALLOWED_FILE_TYPES)
          .flatMap((t) => t.extensions)
          .join(",")}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Attach Files</span>
              <Badge variant="outline">
                {attachedFiles.length}/{MAX_FILES} files • {formatFileSize(totalSize)}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4",
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-blue-400",
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop files here, or click to select
              </p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Choose Files
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Max {MAX_FILES} files • {formatFileSize(TOTAL_MAX_SIZE)} total
              </p>
            </div>

            {/* File List */}
            {attachedFiles.length > 0 && (
              <div className="space-y-3">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {/* File Icon/Preview */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview || "/placeholder.svg"}
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-xs text-gray-500 mb-2">
                          {formatFileSize(file.size)} • {file.type}
                        </p>

                        {/* Upload Status */}
                        {file.uploadStatus === "pending" && (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Ready to upload</span>
                          </div>
                        )}

                        {file.uploadStatus === "uploading" && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-xs text-blue-600">
                                Uploading... {Math.round(file.uploadProgress || 0)}%
                              </span>
                            </div>
                            <Progress value={file.uploadProgress || 0} className="h-1" />
                          </div>
                        )}

                        {file.uploadStatus === "success" && (
                          <div className="flex items-center space-x-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Upload complete</span>
                          </div>
                        )}

                        {file.uploadStatus === "error" && (
                          <div className="flex items-center space-x-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{file.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {attachedFiles.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-500">
                {attachedFiles.filter((f) => f.uploadStatus === "success").length} of {attachedFiles.length} ready
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAttachedFiles([])
                    setIsDialogOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSendFiles} disabled={!canSend} className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>{isUploading ? "Uploading..." : "Send Files"}</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
