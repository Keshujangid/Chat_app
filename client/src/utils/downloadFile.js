import { toast } from "sonner";

const downloadFile = async (file) => {
    try {
        if (!file.url) {
            toast.error("File URL not available");
            return;
        }

        // Create a temporary anchor element
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.name || "download";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Downloading ${file.name}`);
    } catch (error) {
        // console.error("Download failed:", error);
        toast.error("Failed to download file",error.message);
    }
};

export { downloadFile }