import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  
  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  }
  
  if (isYesterday(messageDate)) {
    return 'Yesterday';
  }
  
  if (isThisWeek(messageDate)) {
    return format(messageDate, 'EEEE');
  }
  
  return format(messageDate, 'MMM d');
};