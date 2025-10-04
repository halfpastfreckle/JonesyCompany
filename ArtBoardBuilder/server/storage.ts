import { 
  savedDesigns, 
  designTemplates,
  type SavedDesign, 
  type InsertSavedDesign,
  type DesignTemplate,
  type InsertDesignTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Design operations
  saveDesign(design: InsertSavedDesign): Promise<SavedDesign>;
  getDesignByShareId(shareId: string): Promise<SavedDesign | undefined>;
  getAllDesigns(): Promise<SavedDesign[]>;
  updateDesign(shareId: string, design: Partial<InsertSavedDesign>): Promise<SavedDesign | undefined>;
  deleteDesign(shareId: string): Promise<boolean>;
  
  // Template operations
  getAllTemplates(): Promise<DesignTemplate[]>;
  getTemplateById(id: number): Promise<DesignTemplate | undefined>;
  getTemplatesByCategory(category: string): Promise<DesignTemplate[]>;
  createTemplate(template: InsertDesignTemplate): Promise<DesignTemplate>;
}

export class DatabaseStorage implements IStorage {
  // Design operations
  async saveDesign(insertDesign: InsertSavedDesign): Promise<SavedDesign> {
    const [design] = await db
      .insert(savedDesigns)
      .values(insertDesign)
      .returning();
    return design;
  }

  async getDesignByShareId(shareId: string): Promise<SavedDesign | undefined> {
    const [design] = await db
      .select()
      .from(savedDesigns)
      .where(eq(savedDesigns.shareId, shareId));
    return design || undefined;
  }

  async getAllDesigns(): Promise<SavedDesign[]> {
    return await db
      .select()
      .from(savedDesigns)
      .orderBy(desc(savedDesigns.createdAt));
  }

  async updateDesign(shareId: string, updates: Partial<InsertSavedDesign>): Promise<SavedDesign | undefined> {
    const [design] = await db
      .update(savedDesigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(savedDesigns.shareId, shareId))
      .returning();
    return design || undefined;
  }

  async deleteDesign(shareId: string): Promise<boolean> {
    const result = await db
      .delete(savedDesigns)
      .where(eq(savedDesigns.shareId, shareId))
      .returning();
    return result.length > 0;
  }

  // Template operations
  async getAllTemplates(): Promise<DesignTemplate[]> {
    return await db
      .select()
      .from(designTemplates)
      .where(eq(designTemplates.isActive, true))
      .orderBy(desc(designTemplates.createdAt));
  }

  async getTemplateById(id: number): Promise<DesignTemplate | undefined> {
    const [template] = await db
      .select()
      .from(designTemplates)
      .where(eq(designTemplates.id, id));
    return template || undefined;
  }

  async getTemplatesByCategory(category: string): Promise<DesignTemplate[]> {
    return await db
      .select()
      .from(designTemplates)
      .where(eq(designTemplates.category, category))
      .orderBy(desc(designTemplates.createdAt));
  }

  async createTemplate(insertTemplate: InsertDesignTemplate): Promise<DesignTemplate> {
    const [template] = await db
      .insert(designTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }
}

export const storage = new DatabaseStorage();
