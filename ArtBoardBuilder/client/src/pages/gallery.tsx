import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { SavedDesign } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Eye, Search } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Gallery() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all designs
  const { data: designs = [], isLoading } = useQuery<SavedDesign[]>({
    queryKey: ["/api/designs"],
  });

  // Delete design mutation
  const deleteMutation = useMutation({
    mutationFn: async (shareId: string) => {
      await apiRequest("DELETE", `/api/designs/${shareId}`);
    },
    onSuccess: () => {
      toast({
        title: "Design deleted",
        description: "Your design has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/designs"] });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter designs by search query
  const filteredDesigns = designs.filter((design) =>
    design.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading gallery...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Design Gallery</h1>
            <p className="text-muted-foreground mt-1">Browse and manage your saved designs</p>
          </div>
          <Button onClick={() => setLocation("/")} data-testid="button-new-design">
            New Design
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search designs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {filteredDesigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-no-designs">
              {searchQuery ? "No designs found matching your search." : "No designs yet. Create your first design!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDesigns.map((design) => (
              <Card
                key={design.shareId}
                className="overflow-hidden hover-elevate transition-all"
                data-testid={`card-design-${design.shareId}`}
              >
                <div className="aspect-[32/105] bg-accent relative">
                  <svg
                    viewBox="0 0 32 105"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <clipPath id={`shape-${design.shareId}`}>
                        <path d="M 0 16 Q 0 0, 16 0 L 16 0 Q 32 0, 32 16 L 32 89 Q 32 105, 16 105 L 16 105 Q 0 105, 0 89 Z" />
                      </clipPath>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width="32"
                      height="105"
                      fill={design.config.backgroundColor || "#ffffff"}
                      clipPath={`url(#shape-${design.shareId})`}
                    />
                  </svg>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold truncate" data-testid={`text-design-name-${design.shareId}`}>
                    {design.name}
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => setLocation(`/?design=${design.shareId}`)}
                      data-testid={`button-view-${design.shareId}`}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(design.shareId)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${design.shareId}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
