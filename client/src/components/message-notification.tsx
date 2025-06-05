import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Bell, Send, X } from "lucide-react";

interface MessageNotificationProps {
  className?: string;
}

export function MessageNotification({ className = "" }: MessageNotificationProps) {
  const { toast } = useToast();
  const [showMessageForm, setShowMessageForm] = useState(false);

  // Fetch unread message count
  const { data: messageMetrics } = useQuery({
    queryKey: ["/api/messages/metrics"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch staff members for recipient selection
  const { data: staffMembers = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/metrics"] });
      setShowMessageForm(false);
      toast({ title: "Message sent successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to send message", 
        description: "Please try again",
        variant: "destructive" 
      });
    },
  });

  const unreadCount = Array.isArray(messageMetrics) && messageMetrics[0] 
    ? messageMetrics[0].unreadMessages || 0 
    : 0;
  const actionRequiredCount = Array.isArray(messageMetrics) && messageMetrics[0] 
    ? messageMetrics[0].actionRequired || 0 
    : 0;

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {/* Notification Bell */}
        <div className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {(unreadCount > 0 || actionRequiredCount > 0) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount + actionRequiredCount}
            </Badge>
          )}
        </div>

        {/* New Message Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMessageForm(true)}
          className="flex items-center space-x-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span>New Message</span>
        </Button>
      </div>

      {/* Message Form Modal */}
      {showMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Send New Message</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMessageForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const selectedRecipients = formData.get('recipients');
              const recipientIds = selectedRecipients === 'all' 
                ? (staffMembers as any[]).map((staff: any) => staff.id)
                : [parseInt(selectedRecipients as string)];
              
              createMessageMutation.mutate({
                messageType: formData.get('messageType'),
                subject: formData.get('subject'),
                content: formData.get('content'),
                priority: formData.get('priority'),
                recipientIds,
                actionRequired: formData.get('actionRequired') === 'on',
              });
            }}>
              <div className="space-y-4">
                <Select name="messageType" defaultValue="announcement" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Message Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="request">Request</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select name="recipients" defaultValue="all" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Send to" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Send to All Staff</SelectItem>
                    {(staffMembers as any[]).map((staff: any) => (
                      <SelectItem key={staff.id} value={staff.id.toString()}>
                        {staff.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input name="subject" placeholder="Subject" required />
                <Textarea 
                  name="content" 
                  placeholder="Message content" 
                  required 
                  rows={4}
                />
                
                <Select name="priority" defaultValue="normal" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                
                <label className="flex items-center space-x-2">
                  <input type="checkbox" name="actionRequired" />
                  <span className="text-sm">Action Required</span>
                </label>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowMessageForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMessageMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {createMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}