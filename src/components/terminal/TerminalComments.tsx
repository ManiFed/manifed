import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Comment {
  id: string;
  userName: string;
  userUsername: string;
  userAvatarUrl?: string;
  content: any;
  text?: string;
  createdTime: number;
  likes: number;
}

interface TerminalCommentsProps {
  marketId: string;
}

export default function TerminalComments({ marketId }: TerminalCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    if (!marketId) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.manifold.markets/v0/comments?contractId=${marketId}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [marketId]);

  // Extract plain text from TipTap JSON content
  const extractText = (content: any): string => {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (content.text) return content.text;
    if (content.content && Array.isArray(content.content)) {
      return content.content
        .map((node: any) => {
          if (node.type === "text") return node.text || "";
          if (node.type === "paragraph" && node.content) {
            return node.content.map((c: any) => c.text || "").join("");
          }
          if (node.content) return extractText(node);
          return "";
        })
        .join(" ");
    }
    return "";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return "< 1h ago";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">Market Comments</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchComments}
          disabled={loading}
          className="h-6 w-6 p-0 text-gray-500 hover:text-white"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && comments.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-500 text-xs">
          No comments on this market
        </div>
      ) : (
        <ScrollArea className="h-[200px]">
          <div className="space-y-3 pr-2">
            {comments.map((comment) => {
              const commentText = comment.text || extractText(comment.content) || "";
              
              return (
                <div
                  key={comment.id}
                  className="p-2 rounded bg-gray-800/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {comment.userAvatarUrl && (
                        <img
                          src={comment.userAvatarUrl}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span className="text-emerald-400 font-medium">
                        @{comment.userUsername || comment.userName || "Anonymous"}
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {formatTime(comment.createdTime)}
                    </span>
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap line-clamp-4">
                    {commentText}
                  </div>
                  {comment.likes > 0 && (
                    <div className="text-gray-500 text-[10px]">
                      ❤️ {comment.likes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}
