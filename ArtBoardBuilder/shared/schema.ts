import { z } from "zod";
import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Design configuration schema for fingerboard customization
export const designConfigSchema = z.object({
  backgroundColor: z.string().default("#ffffff"),
  showGuides: z.boolean().default(true),
  imageUrl: z.string().optional(),
  imageScale: z.number().min(0.1).max(10).default(1),
  imageRotation: z.number().min(-180).max(180).default(0),
  imageOpacity: z.number().min(0.1).max(1).default(1),
  imageFlipped: z.boolean().default(false),
  imageX: z.number().default(8),
  imageY: z.number().default(20),
  imageLayer: z.number().default(0),
  textElements: z.array(z.object({
    id: z.string(),
    content: z.string(),
    x: z.number(),
    y: z.number(),
    fontSize: z.number().min(3).max(16),
    color: z.string(),
    fontFamily: z.string(),
    strokeWidth: z.number().min(0).max(1),
    strokeColor: z.string().optional(),
    layer: z.number(),
  })).default([]),
});

export type DesignConfig = z.infer<typeof designConfigSchema>;

// Export configuration schema
export const exportConfigSchema = z.object({
  format: z.enum(["svg", "png"]).default("svg"),
  svgData: z.string(),
});

export type ExportConfig = z.infer<typeof exportConfigSchema>;

// Database tables
export const savedDesigns = pgTable("saved_designs", {
  id: serial("id").primaryKey(),
  shareId: text("share_id").notNull().unique(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const designTemplates = pgTable("design_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  config: jsonb("config").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert and select schemas
export const insertSavedDesignSchema = createInsertSchema(savedDesigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDesignTemplateSchema = createInsertSchema(designTemplates).omit({
  id: true,
  createdAt: true,
});

export type SavedDesign = typeof savedDesigns.$inferSelect;
export type InsertSavedDesign = z.infer<typeof insertSavedDesignSchema>;
export type DesignTemplate = typeof designTemplates.$inferSelect;
export type InsertDesignTemplate = z.infer<typeof insertDesignTemplateSchema>;
