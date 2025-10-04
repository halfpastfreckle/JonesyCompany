// Reference: javascript_object_storage blueprint - public file uploading example
import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { storage } from "./storage";
import { insertSavedDesignSchema } from "@shared/schema";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  const objectStorageService = new ObjectStorageService();

  // Endpoint to serve private objects (uploaded images) publicly
  // This is for the fingerboard designer where all uploads are public
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Endpoint to get the upload URL for an object entity
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint to normalize and save the uploaded image path
  app.put("/api/images", async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );

      res.status(200).json({
        objectPath: objectPath,
        publicURL: `/objects/${objectPath}`,
      });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint to serve public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Design Management Routes
  
  // Save a new design
  app.post("/api/designs", async (req, res) => {
    try {
      const validatedData = insertSavedDesignSchema.parse({
        ...req.body,
        shareId: randomUUID(),
      });

      const design = await storage.saveDesign(validatedData);
      res.status(201).json(design);
    } catch (error) {
      console.error("Error saving design:", error);
      res.status(400).json({ error: "Invalid design data" });
    }
  });

  // Get all saved designs
  app.get("/api/designs", async (req, res) => {
    try {
      const designs = await storage.getAllDesigns();
      res.json(designs);
    } catch (error) {
      console.error("Error fetching designs:", error);
      res.status(500).json({ error: "Failed to fetch designs" });
    }
  });

  // Get design by share ID
  app.get("/api/designs/:shareId", async (req, res) => {
    try {
      const design = await storage.getDesignByShareId(req.params.shareId);
      if (!design) {
        return res.status(404).json({ error: "Design not found" });
      }
      res.json(design);
    } catch (error) {
      console.error("Error fetching design:", error);
      res.status(500).json({ error: "Failed to fetch design" });
    }
  });

  // Update design
  app.put("/api/designs/:shareId", async (req, res) => {
    try {
      const updates = insertSavedDesignSchema.partial().parse(req.body);
      const design = await storage.updateDesign(req.params.shareId, updates);
      
      if (!design) {
        return res.status(404).json({ error: "Design not found" });
      }
      
      res.json(design);
    } catch (error) {
      console.error("Error updating design:", error);
      res.status(400).json({ error: "Invalid design data" });
    }
  });

  // Delete design
  app.delete("/api/designs/:shareId", async (req, res) => {
    try {
      const deleted = await storage.deleteDesign(req.params.shareId);
      if (!deleted) {
        return res.status(404).json({ error: "Design not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting design:", error);
      res.status(500).json({ error: "Failed to delete design" });
    }
  });

  // Template Routes

  // Get all templates
  app.get("/api/templates", async (req, res) => {
    try {
      const { category } = req.query;
      const templates = category 
        ? await storage.getTemplatesByCategory(category as string)
        : await storage.getAllTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get template by ID
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplateById(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
