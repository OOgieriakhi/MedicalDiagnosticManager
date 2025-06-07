import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  MessageSquare, 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Eye,
  MoreHorizontal 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InternalMessage {
  id: number;
  messageType: string;
  subject: string;
  content: string;
  priority: string;
  status: string;
  senderId: number;
  senderName?: string;
  actionRequired: boolean;
  dueDate?: string;
  readBy?: any[];
  acknowledgedBy?: any[];
  createdAt: string;
}

interface DashboardMessagingProps {
  maxMessages?: number;
  showCompactView?: boolean;
  className?: string;
}

export default function DashboardMessaging({ 
  maxMessages = 5, 
  showCompactView = false,
  className = "" 
}: DashboardMessagingProps) {
  const { toast } = useToast();
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());

  // Fetch user's messages
  const { data: messages = [], isLoading } = useQuery<InternalMessage[]>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const response = await fetch("/api/messages");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message marked as read" });
    },
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}/acknowledge`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Message acknowledged" });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'alert': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'task': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'announcement': return <Bell className="h-4 w-4 text-green-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const isMessageRead = (message: InternalMessage, userId: number) => {
    return message.readBy?.some((read: any) => read.userId === userId);
  };

  const isMessageAcknowledged = (message: InternalMessage, userId: number) => {
    return message.acknowledgedBy?.some((ack: any) => ack.userId === userId);
  };

  const toggleMessageExpansion = (messageId: number) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  const unreadMessages = messages.filter(msg => !isMessageRead(msg, 1)); // TODO: Get actual user ID
  const urgentMessages = messages.filter(msg => msg.priority === 'urgent' || msg.priority === 'high');
  const actionRequiredMessages = messages.filter(msg => msg.actionRequired && !isMessageAcknowledged(msg, 1));

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Loading messages...</div>
        </CardContent>
      </Card>
    );
  }

  const displayMessages = messages.slice(0, maxMessages);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
            {unreadMessages.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadMessages.length} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {urgentMessages.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {urgentMessages.length} urgent
              </Badge>
            )}
            {actionRequiredMessages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {actionRequiredMessages.length} action needed
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No messages to display
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.map((message) => {
              const isRead = isMessageRead(message, 1); // TODO: Get actual user ID
              const isAcknowledged = isMessageAcknowledged(message, 1);
              const isExpanded = expandedMessages.has(message.id);
              
              return (
                <div
                  key={message.id}
                  className={`p-3 border rounded-lg transition-all ${
                    !isRead ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  } hover:shadow-sm`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getMessageTypeIcon(message.messageType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 
                            className={`font-medium text-sm truncate cursor-pointer ${
                              !isRead ? 'text-blue-900' : 'text-gray-900'
                            }`}
                            onClick={() => toggleMessageExpansion(message.id)}
                          >
                            {message.subject}
                          </h4>
                          <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                            {message.priority}
                          </Badge>
                          {message.actionRequired && !isAcknowledged && (
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-600">
                              Action Required
                            </Badge>
                          )}
                        </div>
                        
                        {showCompactView ? (
                          <p className="text-xs text-gray-600 truncate">
                            {message.content}
                          </p>
                        ) : (
                          <p 
                            className={`text-sm text-gray-600 cursor-pointer ${
                              !isExpanded ? 'line-clamp-2' : ''
                            }`}
                            onClick={() => toggleMessageExpansion(message.id)}
                          >
                            {message.content}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(message.createdAt).toLocaleDateString()}</span>
                          {message.senderName && <span>From: {message.senderName}</span>}
                          {message.dueDate && (
                            <span className="text-orange-600">
                              Due: {new Date(message.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isRead && (
                        <div title="Read">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      {isAcknowledged && (
                        <div title="Acknowledged">
                          <Eye className="h-4 w-4 text-blue-500" />
                        </div>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isRead && (
                            <DropdownMenuItem
                              onClick={() => markAsReadMutation.mutate(message.id)}
                            >
                              Mark as Read
                            </DropdownMenuItem>
                          )}
                          {message.actionRequired && !isAcknowledged && (
                            <DropdownMenuItem
                              onClick={() => acknowledgeMutation.mutate(message.id)}
                            >
                              Acknowledge
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => toggleMessageExpansion(message.id)}
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {messages.length > maxMessages && (
              <div className="text-center">
                <Button variant="outline" size="sm" className="text-xs">
                  View All Messages ({messages.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}