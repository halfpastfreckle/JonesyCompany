import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DesignConfig, SavedDesign, DesignTemplate } from "@shared/schema";
import { Upload, RotateCw, Download, ShoppingCart, Save, Images, Sparkles, Package, Plus, Trash2, ChevronUp, ChevronDown, Crosshair, ExternalLink } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import JSZip from "jszip";
import logoImage from "@assets/isla_100x100.79537958_74x5hrks_1759557516643.webp";

interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  strokeWidth: number;
  strokeColor?: string;
  layer: number;
}

interface LayerElement {
  type: "image" | "text";
  layer: number;
  data?: TextElement;
}

export default function FingerboardDesigner() {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Design state
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [showGuides, setShowGuides] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [imageScale, setImageScale] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageOpacity, setImageOpacity] = useState(100);
  const [imageFlipped, setImageFlipped] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 8, y: 20 });
  const [imageLayer, setImageLayer] = useState(0);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  
  // Text state
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [textSize, setTextSize] = useState(6);
  const [textColor, setTextColor] = useState("#0f172a");
  const [fontFamily, setFontFamily] = useState("Impact");
  const [textStroke, setTextStroke] = useState<"none" | "thin" | "thick">("none");


  // Dragging state
  const [dragging, setDragging] = useState<{ type: "image" | "text"; id?: string } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Save/load state
  const [designName, setDesignName] = useState("");
  const [currentShareId, setCurrentShareId] = useState<string | null>(null);
  const search = useSearch();
  const [, setLocation] = useLocation();

  // Batch export state
  const [batchExportOpen, setBatchExportOpen] = useState(false);
  const [batchColors, setBatchColors] = useState<string[]>([backgroundColor]);
  const [batchExporting, setBatchExporting] = useState(false);

  const selectedText = textElements.find(t => t.id === selectedTextId);

  // Fetch templates
  const { data: templates = [] } = useQuery<DesignTemplate[]>({
    queryKey: ["/api/templates"],
  });

  // Apply template
  const applyTemplate = useCallback((template: DesignTemplate) => {
    const config = template.config as DesignConfig;
    setBackgroundColor(config.backgroundColor || "#ffffff");
    toast({
      title: "Template applied!",
      description: `"${template.name}" has been applied to your board.`,
    });
  }, [toast]);

  // Add new text box
  const addTextBox = useCallback(() => {
    // Find the highest layer number and add 1
    const maxLayer = textElements.length > 0 ? Math.max(...textElements.map(t => t.layer)) : -1;
    const newText: TextElement = {
      id: Date.now().toString(),
      content: "New Text",
      x: 16,
      y: 50,
      fontSize: 6,
      color: textColor,
      fontFamily,
      strokeWidth: textStroke === "none" ? 0 : textStroke === "thin" ? 0.5 : 1,
      strokeColor: textStroke === "none" ? undefined : "#ffffff",
      layer: maxLayer + 1,
    };
    setTextElements([...textElements, newText]);
    setSelectedTextId(newText.id);
    setTextInput(newText.content);
  }, [textElements, textColor, fontFamily, textStroke]);

  // Delete text box
  const deleteTextBox = useCallback((id: string) => {
    setTextElements(textElements.filter(t => t.id !== id));
    if (selectedTextId === id) {
      setSelectedTextId(null);
      setTextInput("");
    }
  }, [textElements, selectedTextId]);

  // Move element layer up (increases z-index, moves forward)
  const moveLayerUp = useCallback((id: string) => {
    setTextElements(prev => {
      const element = prev.find(t => t.id === id);
      if (!element) return prev;
      
      // Find all layers including image
      const allElementLayers = [...prev.map(t => ({ id: t.id, layer: t.layer, type: 'text' })), { id: 'image', layer: imageLayer, type: 'image' }];
      
      // Find the next higher layer
      const higherLayers = allElementLayers.filter(e => e.layer > element.layer).sort((a, b) => a.layer - b.layer);
      if (higherLayers.length === 0) return prev;
      
      const nextHigher = higherLayers[0];
      const targetLayer = nextHigher.layer;
      
      // Swap layers: move this element to target layer, move target element(s) down
      if (nextHigher.type === 'image') {
        setImageLayer(element.layer);
      }
      
      return prev.map(t => {
        if (t.id === id) return { ...t, layer: targetLayer };
        if (t.layer === targetLayer && t.id !== id) return { ...t, layer: element.layer };
        return t;
      });
    });
  }, [imageLayer, setImageLayer]);

  // Move element layer down (decreases z-index, moves backward)
  const moveLayerDown = useCallback((id: string) => {
    setTextElements(prev => {
      const element = prev.find(t => t.id === id);
      if (!element) return prev;
      
      // Find all layers including image
      const allElementLayers = [...prev.map(t => ({ id: t.id, layer: t.layer, type: 'text' })), { id: 'image', layer: imageLayer, type: 'image' }];
      
      // Find the next lower layer
      const lowerLayers = allElementLayers.filter(e => e.layer < element.layer).sort((a, b) => b.layer - a.layer);
      if (lowerLayers.length === 0) return prev;
      
      const nextLower = lowerLayers[0];
      const targetLayer = nextLower.layer;
      
      // Swap layers: move this element to target layer, move target element(s) up
      if (nextLower.type === 'image') {
        setImageLayer(element.layer);
      }
      
      return prev.map(t => {
        if (t.id === id) return { ...t, layer: targetLayer };
        if (t.layer === targetLayer && t.id !== id) return { ...t, layer: element.layer };
        return t;
      });
    });
  }, [imageLayer, setImageLayer]);

  // Center image
  const centerImage = useCallback(() => {
    setImagePosition({ x: 8, y: 20 });
    toast({
      title: "Image centered",
      description: "The image has been repositioned to the center.",
    });
  }, [toast]);

  // Move image layer up
  const moveImageLayerUp = useCallback(() => {
    // Find all element layers
    const allElementLayers = textElements.map(t => ({ id: t.id, layer: t.layer }));
    
    // Find the next higher layer
    const higherLayers = allElementLayers.filter(e => e.layer > imageLayer).sort((a, b) => a.layer - b.layer);
    if (higherLayers.length === 0) return;
    
    const nextHigher = higherLayers[0];
    const targetLayer = nextHigher.layer;
    const oldImageLayer = imageLayer;
    
    // Update both states
    setImageLayer(targetLayer);
    setTextElements(prev => prev.map(t => 
      t.id === nextHigher.id ? { ...t, layer: oldImageLayer } : t
    ));
  }, [imageLayer, textElements]);

  // Move image layer down
  const moveImageLayerDown = useCallback(() => {
    // Find all element layers
    const allElementLayers = textElements.map(t => ({ id: t.id, layer: t.layer }));
    
    // Find the next lower layer
    const lowerLayers = allElementLayers.filter(e => e.layer < imageLayer).sort((a, b) => b.layer - a.layer);
    if (lowerLayers.length === 0) return;
    
    const nextLower = lowerLayers[0];
    const targetLayer = nextLower.layer;
    const oldImageLayer = imageLayer;
    
    // Update both states
    setImageLayer(targetLayer);
    setTextElements(prev => prev.map(t => 
      t.id === nextLower.id ? { ...t, layer: oldImageLayer } : t
    ));
  }, [imageLayer, textElements]);

  // Helper to get current design config
  const getCurrentConfig = useCallback((): DesignConfig => ({
    backgroundColor,
    showGuides,
    imageUrl,
    imageScale: imageScale / 100,
    imageRotation,
    imageOpacity: imageOpacity / 100,
    imageFlipped,
    imageX: imagePosition.x,
    imageY: imagePosition.y,
    imageLayer,
    textElements,
  }), [
    backgroundColor, showGuides, imageUrl, imageScale, imageRotation,
    imageOpacity, imageFlipped, imagePosition, imageLayer, textElements
  ]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Get upload URL
      const uploadRes = await apiRequest("POST", "/api/objects/upload", {});
      const { uploadURL } = await uploadRes.json();

      // Upload file to storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Get public URL
      const publicRes = await apiRequest("PUT", "/api/images", {
        imageURL: uploadURL,
      });
      const { publicURL } = await publicRes.json();

      return publicURL;
    },
    onSuccess: (publicURL) => {
      setImageUrl(publicURL);
      toast({
        title: "Image uploaded!",
        description: "Your artwork has been added to the board.",
      });
    },
    onError: (error, file) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "Using local preview instead.",
        variant: "destructive",
      });
      
      // Fallback to local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please choose a file under 5MB.",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG or JPG image file.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  }, [toast, uploadMutation]);

  // Add text element
  const addTextElement = useCallback(() => {
    if (!textInput.trim()) {
      toast({
        title: "Enter some text",
        description: "Please enter text before adding it to the board.",
        variant: "destructive",
      });
      return;
    }

    const maxLayer = textElements.length > 0 ? Math.max(...textElements.map(t => t.layer)) : -1;
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      content: textInput,
      x: 16,
      y: 52.5,
      fontSize: textSize,
      color: textColor,
      fontFamily,
      strokeWidth: textStroke === "none" ? 0 : textStroke === "thin" ? 0.3 : 0.6,
      strokeColor: textColor === "#ffffff" ? "#000000" : "#ffffff",
      layer: maxLayer + 1,
    };

    setTextElements([...textElements, newElement]);
    setSelectedTextId(newElement.id);
    setTextInput("");
  }, [textInput, textSize, textColor, fontFamily, textStroke, textElements, toast]);

  // Update selected text
  useEffect(() => {
    if (selectedTextId && selectedText) {
      setTextElements(textElements.map(t =>
        t.id === selectedTextId
          ? {
              ...t,
              content: textInput || t.content,
              fontSize: textSize,
              color: textColor,
              fontFamily,
              strokeWidth: textStroke === "none" ? 0 : textStroke === "thin" ? 0.3 : 0.6,
              strokeColor: textColor === "#ffffff" ? "#000000" : "#ffffff",
            }
          : t
      ));
    }
  }, [textSize, textColor, fontFamily, textStroke]);

  // SVG coordinate conversion
  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }, []);

  // Mouse/touch handlers for dragging
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, type: "image" | "text", id?: string) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const point = getSVGPoint(clientX, clientY);
    
    setDragging({ type, id });
    setDragStart(point);
    
    if (type === "text" && id) {
      setSelectedTextId(id);
      const text = textElements.find(t => t.id === id);
      if (text) {
        setTextInput(text.content);
      }
    }
  }, [getSVGPoint, textElements]);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const point = getSVGPoint(clientX, clientY);
    const dx = point.x - dragStart.x;
    const dy = point.y - dragStart.y;

    if (dragging.type === "image") {
      setImagePosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (dragging.type === "text" && dragging.id) {
      setTextElements(prev => prev.map(t =>
        t.id === dragging.id ? { ...t, x: t.x + dx, y: t.y + dy } : t
      ));
    }
    
    setDragStart(point);
  }, [dragging, dragStart, getSVGPoint]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove);
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }
  }, [dragging, handleDragMove, handleDragEnd]);

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!svgRef.current) throw new Error("No SVG to export");

      // Temporarily hide guides for export
      const originalShowGuides = showGuides;
      setShowGuides(false);
      
      // Wait for next frame to ensure render without guides
      await new Promise(resolve => requestAnimationFrame(resolve));

      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      
      // Restore original guides state
      setShowGuides(originalShowGuides);
      
      return new Promise<Blob>((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        canvas.width = 800;
        canvas.height = 2625;

        img.onload = () => {
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create blob"));
            }
          });
        };

        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
      });
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fingerboard-design-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Design exported!",
        description: "Your fingerboard design has been downloaded.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Batch export function
  const handleBatchExport = async () => {
    if (!svgRef.current || batchColors.length === 0) return;
    
    setBatchExporting(true);
    const zip = new JSZip();
    const originalColor = backgroundColor;
    const originalShowGuides = showGuides;
    
    // Hide guides for batch export
    setShowGuides(false);
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
      for (let i = 0; i < batchColors.length; i++) {
        const color = batchColors[i];
        
        // Update the background color
        setBackgroundColor(color);
        
        // Wait for next frame to ensure render
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!svgRef.current) continue;

        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        
        // Convert to PNG
        const blob = await new Promise<Blob>((resolve, reject) => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const img = new Image();

          canvas.width = 800;
          canvas.height = 2625;

          img.onload = () => {
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to create blob"));
              }
            });
          };

          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        });

        // Add to zip
        const colorName = color.replace('#', '');
        zip.file(`${designName || 'design'}-${colorName}.png`, blob);
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${designName || 'fingerboard-designs'}-batch.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Batch export complete!",
        description: `${batchColors.length} designs exported.`,
      });

      setBatchExportOpen(false);
    } catch (error) {
      toast({
        title: "Batch export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBackgroundColor(originalColor);
      setShowGuides(originalShowGuides);
      setBatchExporting(false);
    }
  };

  // Save design mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!designName.trim()) {
        throw new Error("Please enter a design name");
      }

      const config = getCurrentConfig();
      
      if (currentShareId) {
        // Update existing design
        const res = await apiRequest("PUT", `/api/designs/${currentShareId}`, {
          name: designName,
          config,
        });
        return await res.json();
      } else {
        // Create new design
        const res = await apiRequest("POST", "/api/designs", {
          name: designName,
          config,
        });
        return await res.json();
      }
    },
    onSuccess: (design: SavedDesign) => {
      setCurrentShareId(design.shareId);
      setLocation(`/?design=${design.shareId}`);
      toast({
        title: "Design saved!",
        description: `Your design "${design.name}" has been saved.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/designs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load design from URL parameter
  const shareIdFromUrl = new URLSearchParams(search).get("design");
  
  // Reset currentShareId if URL shareId changes
  useEffect(() => {
    if (shareIdFromUrl && currentShareId && shareIdFromUrl !== currentShareId) {
      setCurrentShareId(null);
    }
  }, [shareIdFromUrl, currentShareId]);
  
  const loadedDesignQuery = useQuery({
    queryKey: ["/api/designs", shareIdFromUrl],
    enabled: !!shareIdFromUrl && !currentShareId,
  });

  // Handle design loading when query succeeds
  useEffect(() => {
    if (loadedDesignQuery.data && !currentShareId) {
      const design = loadedDesignQuery.data as SavedDesign;
      const config = design.config as DesignConfig;
      
      setBackgroundColor(config.backgroundColor || "#ffffff");
      setShowGuides(config.showGuides ?? true);
      setImageUrl(config.imageUrl || "");
      setImageScale((config.imageScale || 1) * 100);
      setImageRotation(config.imageRotation || 0);
      setImageOpacity((config.imageOpacity || 1) * 100);
      setImageFlipped(config.imageFlipped || false);
      setImagePosition({ x: config.imageX || 8, y: config.imageY || 20 });
      setImageLayer(config.imageLayer || 0);
      setTextElements((config.textElements || []).map((t, index) => ({
        ...t,
        layer: t.layer ?? index,
      })));
      setDesignName(design.name);
      setCurrentShareId(design.shareId);
      
      toast({
        title: "Design loaded!",
        description: `Loaded "${design.name}"`,
      });
    }
  }, [loadedDesignQuery.data, currentShareId]);

  // Reset design
  const handleReset = useCallback(() => {
    setBackgroundColor("#ffffff");
    setImageUrl("");
    setImageScale(100);
    setImageRotation(0);
    setImageOpacity(100);
    setImageFlipped(false);
    setImagePosition({ x: 8, y: 20 });
    setTextElements([]);
    setSelectedTextId(null);
    setTextInput("");
    setDesignName("");
    setCurrentShareId(null);
    setLocation("/");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [setLocation]);

  // Calculate image position to keep center fixed when scaling
  const imageWidth = 16 * (imageScale / 100);
  const imageHeight = 40 * (imageScale / 100);
  const imageCenterX = imagePosition.x;
  const imageCenterY = imagePosition.y;
  const imageX = imageCenterX - (imageWidth / 2);
  const imageY = imageCenterY - (imageHeight / 2);
  
  const imageTransform = `translate(${imageX} ${imageY}) rotate(${imageRotation} ${imageWidth / 2} ${imageHeight / 2}) scale(1 ${imageFlipped ? -1 : 1})`;

  // Create combined layer array for rendering order
  const layerElements: LayerElement[] = [];
  
  if (imageUrl) {
    layerElements.push({ type: "image", layer: imageLayer });
  }
  
  textElements.forEach(text => {
    layerElements.push({ type: "text", layer: text.layer, data: text });
  });
  
  // Sort by layer (lower layers render first, appear behind)
  layerElements.sort((a, b) => a.layer - b.layer);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="Jonesy Company" className="h-12 w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/gallery")}
                  className="gap-2"
                  data-testid="button-gallery"
                >
                  <Images className="w-4 h-4" />
                  Gallery
                </Button>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted rounded-md">
                  Live Preview
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap justify-center mb-4">
              <div className="px-3 py-1.5 text-xs bg-foreground/85 text-background rounded-full border border-background/20" data-testid="chip-drag-hint">
                Drag elements to move
              </div>
              <div className="px-3 py-1.5 text-xs bg-foreground/85 text-background rounded-full border border-background/20" data-testid="chip-customize-hint">
                Customize with controls
              </div>
            </div>

            <div className="flex items-center justify-center min-h-[600px] bg-gradient-to-br from-background to-accent p-6">
              <svg
                ref={svgRef}
                className="w-full max-w-[200px] md:max-w-[250px] rounded-xl shadow-2xl"
                viewBox="0 0 32 105"
                style={{ aspectRatio: "32/105", userSelect: "none", touchAction: "none" }}
                data-testid="svg-canvas"
              >
                <defs>
                  <clipPath id="deckClip">
                    <rect x="0" y="0" width="32" height="105" rx="16" ry="16" />
                  </clipPath>
                  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.25" />
                  </filter>
                  <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#000" floodOpacity="0.4" />
                  </filter>
                </defs>

                <g filter="url(#softShadow)">
                  <rect x="0" y="0" width="32" height="105" rx="16" ry="16" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.5" />
                </g>

                <rect x="0" y="0" width="32" height="105" rx="16" ry="16" fill={backgroundColor} clipPath="url(#deckClip)" />

                {layerElements.map((element, index) => {
                  if (element.type === "image") {
                    return (
                      <image
                        key="board-image"
                        href={imageUrl}
                        width={16 * (imageScale / 100)}
                        height={40 * (imageScale / 100)}
                        opacity={imageOpacity / 100}
                        transform={imageTransform}
                        style={{ cursor: dragging?.type === "image" ? "grabbing" : "grab" }}
                        onMouseDown={(e) => handleDragStart(e, "image")}
                        onTouchStart={(e) => handleDragStart(e, "image")}
                        data-testid="board-image"
                      />
                    );
                  } else if (element.data) {
                    const text = element.data;
                    return (
                      <text
                        key={text.id}
                        x={text.x}
                        y={text.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={text.fontSize}
                        fill={text.color}
                        fontFamily={text.fontFamily}
                        stroke={text.strokeWidth > 0 ? text.strokeColor : undefined}
                        strokeWidth={text.strokeWidth}
                        filter="url(#textShadow)"
                        style={{ cursor: dragging?.id === text.id ? "grabbing" : "grab" }}
                        onMouseDown={(e) => handleDragStart(e, "text", text.id)}
                        onTouchStart={(e) => handleDragStart(e, "text", text.id)}
                        data-testid={`text-${text.id}`}
                      >
                        {text.content}
                      </text>
                    );
                  }
                  return null;
                })}

                {showGuides && (
                  <g pointerEvents="none" opacity="0.2">
                    <rect x="0" y="1.5" width="32" height="102" rx="16" ry="16" fill="none" stroke="#ef4444" strokeWidth="0.3" strokeDasharray="1 1" />
                    <rect x="0" y="24" width="32" height="8" fill="none" stroke="#ef4444" strokeWidth="0.3" />
                    <rect x="0" y="73" width="32" height="8" fill="none" stroke="#ef4444" strokeWidth="0.3" />
                    <text x="16" y="14" textAnchor="middle" fontSize="2" fill="#ef4444" opacity="0.7">SAFE AREA</text>
                    <text x="16" y="28" textAnchor="middle" fontSize="1.5" fill="#ef4444" opacity="0.7">TRUCK</text>
                    <text x="16" y="77" textAnchor="middle" fontSize="1.5" fill="#ef4444" opacity="0.7">TRUCK</text>
                  </g>
                )}
              </svg>
            </div>
          </Card>

          {/* Controls Section */}
          <Card className="p-6 overflow-y-auto max-h-[calc(100vh-2rem)]" data-testid="card-controls">
            <h2 className="text-lg font-bold mb-4" data-testid="heading-customize">Customize Your Board</h2>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="space-y-2">
                <Label htmlFor="bg-color" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Background Color
                </Label>
                <input
                  id="bg-color"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input cursor-pointer"
                  data-testid="input-bg-color"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guides" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Design Guides
                </Label>
                <Select value={showGuides ? "on" : "off"} onValueChange={(v) => setShowGuides(v === "on")}>
                  <SelectTrigger id="guides" data-testid="select-guides">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on" data-testid="select-guides-show">Show guides</SelectItem>
                    <SelectItem value="off" data-testid="select-guides-hide">Hide guides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {templates.length > 0 && (
                <Collapsible
                  open={templatesOpen}
                  onOpenChange={setTemplatesOpen}
                  className="col-span-2 space-y-2 pt-3 border-t border-border"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 h-auto hover:bg-transparent"
                      data-testid="button-toggle-templates"
                    >
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2 cursor-pointer">
                        <Sparkles className="w-3 h-3" />
                        Quick Templates
                      </Label>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${templatesOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {templates.slice(0, 6).map((template) => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="flex flex-col items-center gap-1 p-2 rounded-md hover-elevate active-elevate-2 border border-border"
                          data-testid={`button-template-${template.id}`}
                        >
                          <div 
                            className="w-full h-12 rounded border border-border"
                            style={{ backgroundColor: (template.config as DesignConfig).backgroundColor || "#ffffff" }}
                          />
                          <span className="text-[10px] text-center text-muted-foreground truncate w-full">
                            {template.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <div className="col-span-2 space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Text Boxes ({textElements.length})
                  </Label>
                  <Button
                    size="sm"
                    onClick={addTextBox}
                    className="gap-1 h-7"
                    data-testid="button-add-text"
                  >
                    <Plus className="w-3 h-3" />
                    Add Text
                  </Button>
                </div>

                {textElements.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto p-2 border border-border rounded-md">
                    {textElements.map((text, index) => {
                      // Calculate disabled states based on actual layer values
                      const allLayers = [...textElements.map(t => t.layer), imageLayer];
                      const maxLayer = Math.max(...allLayers);
                      const minLayer = Math.min(...allLayers);
                      const canMoveUp = text.layer < maxLayer;
                      const canMoveDown = text.layer > minLayer;
                      
                      return (
                        <div
                          key={text.id}
                          className={`flex items-center gap-2 p-2 rounded border ${selectedTextId === text.id ? 'border-primary bg-accent' : 'border-border'} hover-elevate cursor-pointer`}
                          onClick={() => {
                            setSelectedTextId(text.id);
                            setTextInput(text.content);
                          }}
                          data-testid={`text-box-${index}`}
                        >
                          <span className="flex-1 text-sm truncate">{text.content || "Empty"}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveLayerUp(text.id);
                              }}
                              disabled={!canMoveUp}
                              data-testid={`button-layer-up-${index}`}
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveLayerDown(text.id);
                              }}
                              disabled={!canMoveDown}
                              data-testid={`button-layer-down-${index}`}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTextBox(text.id);
                              }}
                              data-testid={`button-delete-${index}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedTextId && (
                  <>
                    <Input
                      value={textInput}
                      onChange={(e) => {
                        setTextInput(e.target.value);
                        setTextElements(textElements.map(t =>
                          t.id === selectedTextId ? { ...t, content: e.target.value } : t
                        ));
                      }}
                      placeholder="Edit selected text..."
                      maxLength={30}
                      data-testid="input-text"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Size</Label>
                        <input
                          type="range"
                          min="3"
                          max="16"
                          value={selectedText?.fontSize || textSize}
                          onChange={(e) => {
                            const size = Number(e.target.value);
                            setTextSize(size);
                            setTextElements(textElements.map(t =>
                              t.id === selectedTextId ? { ...t, fontSize: size } : t
                            ));
                          }}
                          className="w-full h-1.5 rounded-full bg-accent cursor-pointer"
                          data-testid="slider-text-size"
                        />
                        <div className="text-xs text-center font-semibold text-muted-foreground">{selectedText?.fontSize || textSize}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Color</Label>
                        <input
                          type="color"
                          value={selectedText?.color || textColor}
                          onChange={(e) => {
                            const color = e.target.value;
                            setTextColor(color);
                            setTextElements(textElements.map(t =>
                              t.id === selectedTextId ? { ...t, color } : t
                            ));
                          }}
                          className="w-full h-11 rounded-lg border border-input cursor-pointer"
                          data-testid="input-text-color"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="image" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Upload Artwork (PNG/JPG, max 5MB)
                </Label>
                <input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  disabled={uploadMutation.isPending}
                  className="w-full px-2 py-2 text-sm border-2 border-dashed border-input rounded-lg bg-accent/50 cursor-pointer file:mr-2 file:px-3 file:py-1 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="input-image"
                />
                {uploadMutation.isPending && (
                  <div className="text-xs text-muted-foreground text-center" data-testid="text-uploading">
                    Uploading image...
                  </div>
                )}
              </div>

              {imageUrl && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="img-scale" className="text-xs uppercase tracking-wide text-muted-foreground">
                      Image Size
                    </Label>
                    <input
                      id="img-scale"
                      type="range"
                      min="10"
                      max="1000"
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full bg-accent cursor-pointer"
                      data-testid="slider-image-scale"
                    />
                    <div className="text-xs text-center font-semibold text-muted-foreground">{imageScale}%</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="img-rotate" className="text-xs uppercase tracking-wide text-muted-foreground">
                      Image Rotation
                    </Label>
                    <input
                      id="img-rotate"
                      type="range"
                      min="-180"
                      max="180"
                      value={imageRotation}
                      onChange={(e) => setImageRotation(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full bg-accent cursor-pointer"
                      data-testid="slider-image-rotation"
                    />
                    <div className="text-xs text-center font-semibold text-muted-foreground">{imageRotation}°</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="img-opacity" className="text-xs uppercase tracking-wide text-muted-foreground">
                      Image Opacity
                    </Label>
                    <input
                      id="img-opacity"
                      type="range"
                      min="10"
                      max="100"
                      value={imageOpacity}
                      onChange={(e) => setImageOpacity(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full bg-accent cursor-pointer"
                      data-testid="slider-image-opacity"
                    />
                    <div className="text-xs text-center font-semibold text-muted-foreground">{imageOpacity}%</div>
                  </div>

                  <div className="col-span-2">
                    <Button
                      variant="outline"
                      onClick={centerImage}
                      className="gap-2 w-full"
                      data-testid="button-center-image"
                    >
                      <Crosshair className="w-4 h-4" />
                      Center Image
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="col-span-2 space-y-2 pt-4 border-t border-border">
              <Label htmlFor="design-name" className="text-xs uppercase tracking-wide text-muted-foreground">
                Design Name
              </Label>
              <div className="flex gap-2">
                <Input
                  id="design-name"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder="My Custom Board..."
                  className="flex-1"
                  data-testid="input-design-name"
                />
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !designName.trim()}
                  className="gap-2"
                  data-testid="button-save"
                >
                  <Save className="w-4 h-4" />
                  {saveMutation.isPending ? "Saving..." : currentShareId ? "Update" : "Save"}
                </Button>
              </div>
              {currentShareId && (
                <p className="text-xs text-muted-foreground" data-testid="text-share-url">
                  Share URL: <a href={`/?design=${currentShareId}`} className="text-primary hover:underline">{window.location.origin}/?design={currentShareId}</a>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-full bg-gradient-to-br from-background to-accent" data-testid="price-display">
                  <span className="text-sm">Price:</span>
                  <span className="text-lg font-bold text-primary" data-testid="text-price">$25</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1" data-testid="text-shipping">+ shipping</div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2"
                  data-testid="button-reset"
                >
                  <RotateCw className="w-4 h-4" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  className="gap-2"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4" />
                  {exportMutation.isPending ? "Exporting..." : "Export"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBatchColors([backgroundColor]);
                    setBatchExportOpen(true);
                  }}
                  className="gap-2"
                  data-testid="button-batch-export"
                >
                  <Package className="w-4 h-4" />
                  Batch Export
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      if (!svgRef.current) {
                        toast({
                          title: "Please create a design first",
                          description: "Add your custom design before ordering.",
                          variant: "destructive",
                        });
                        return;
                      }

                      // Export design as PNG
                      const svgData = new XMLSerializer().serializeToString(svgRef.current);
                      const blob = await new Promise<Blob>((resolve, reject) => {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const img = new Image();

                        canvas.width = 800;
                        canvas.height = 2625;

                        img.onload = () => {
                          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                          canvas.toBlob((blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error("Failed to create blob"));
                          });
                        };

                        img.onerror = () => reject(new Error("Failed to load image"));
                        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                      });

                      // Download the design
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${designName || 'fingerboard-design'}-for-order.png`;
                      a.click();
                      
                      setTimeout(() => URL.revokeObjectURL(url), 100);

                      // Open Etsy listing
                      window.open('https://www.etsy.com/listing/1854254519/custom-handmade-wooden-fingerboard-built?ref=shop_home_feat_1&bes=1&sts=1&logging_key=6688a8daf971ee216605e029f66f51ae79c9c50f%3A1854254519', '_blank');
                      
                      toast({
                        title: "Design downloaded!",
                        description: "Your design has been saved. Upload it when ordering on Etsy.",
                      });
                    } catch (error) {
                      toast({
                        title: "Export failed",
                        description: "Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="gap-2"
                  data-testid="button-order"
                >
                  <ExternalLink className="w-4 h-4" />
                  Order on Etsy
                </Button>
              </div>
            </div>

            <div className="mt-4 p-3 text-xs text-muted-foreground bg-accent/50 rounded-lg border-l-4 border-primary" data-testid="disclaimer">
              <strong>Fingerboard Specs:</strong> 32×105mm wooden deck with 16mm rounded corners.
              Design is automatically fitted to board shape. Red guides show safe printing areas and truck mounting zones.
              <br /><br />
              <strong>Best Results:</strong> Upload high-resolution images (300+ DPI) for crisp printing quality.
            </div>
          </Card>
        </div>
      </div>

      {/* Batch Export Dialog */}
      <Dialog open={batchExportOpen} onOpenChange={setBatchExportOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-batch-export">
          <DialogHeader>
            <DialogTitle data-testid="heading-batch-export">Batch Export</DialogTitle>
            <DialogDescription>
              Export your design in multiple color variations. Add colors below and download as a ZIP file.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch-color-input">Add Color Variations</Label>
              <div className="flex gap-2">
                <input
                  id="batch-color-input"
                  type="color"
                  className="h-10 w-16 rounded-md border border-input cursor-pointer"
                  data-testid="input-batch-color"
                  onChange={(e) => {
                    if (!batchColors.includes(e.target.value)) {
                      setBatchColors([...batchColors, e.target.value]);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                    if (!batchColors.includes(color)) {
                      setBatchColors([...batchColors, color]);
                    }
                  }}
                  data-testid="button-random-color"
                >
                  Add Random
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selected Colors ({batchColors.length})</Label>
              <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-md">
                {batchColors.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setBatchColors(batchColors.filter((_, idx) => idx !== i))}
                    className="group relative h-12 rounded-md border border-border hover-elevate active-elevate-2"
                    style={{ backgroundColor: color }}
                    data-testid={`button-color-${i}`}
                    title={`Remove ${color}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-md transition-opacity">
                      <span className="text-white text-xs">×</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchExportOpen(false)}
              disabled={batchExporting}
              data-testid="button-cancel-batch"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchExport}
              disabled={batchExporting || batchColors.length === 0}
              data-testid="button-export-batch"
            >
              <Package className="w-4 h-4 mr-2" />
              {batchExporting ? `Exporting ${batchColors.length}...` : `Export ${batchColors.length} Designs`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
