import {
  Users,
  Loader2,
} from "lucide-react";



// Loading indicator component
  const LoadingIndicator = () => (
    <div className="flex justify-center py-4">
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading older messages...</span>
      </div>
    </div>
  );

  // End of messages indicator
  const EndOfMessagesIndicator = (isGroup) => (
    <div className="flex justify-center py-4">
      <div className="text-center">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-3 mx-auto mb-2 w-12 h-12 flex items-center justify-center">
          <Users className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isGroup
            ? "This is the beginning of your group chat"
            : "This is the beginning of your conversation"}
        </p>
      </div>
    </div>
  );

  export {LoadingIndicator,EndOfMessagesIndicator}