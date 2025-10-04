// Reference: javascript_object_storage blueprint
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    return paths;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    
    for (const searchPath of searchPaths) {
      const parts = searchPath.split("/").filter((p) => p);
      if (parts.length < 2) continue;
      
      const bucketName = parts[0];
      const prefix = parts.slice(1).join("/");
      const fullPath = prefix ? `${prefix}/${filePath}` : filePath;
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(fullPath);
      const [exists] = await file.exists();
      
      if (exists) {
        return file;
      }
    }
    
    return null;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    const cleanPath = objectPath.startsWith("/objects/")
      ? objectPath.substring("/objects/".length)
      : objectPath;
    
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not configured");
    }
    
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(cleanPath);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    
    return file;
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not configured");
    }

    const objectId = randomUUID();
    const privateDir = process.env.PRIVATE_OBJECT_DIR || ".private";
    
    const cleanPrivateDir = privateDir.startsWith("/") 
      ? privateDir.substring(1) 
      : privateDir;
    
    const dirParts = cleanPrivateDir.split("/");
    const objectKey = dirParts.length > 1 
      ? `${dirParts.slice(1).join("/")}/${objectId}`
      : `.private/${objectId}`;
    
    const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/signurl`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_id: bucketId,
        key: objectKey,
        method: "PUT",
        duration_sec: 3600,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Signurl error:", response.status, errorText);
      throw new Error("Failed to get upload URL");
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  normalizeObjectEntityPath(uploadURL: string): string {
    try {
      const url = new URL(uploadURL);
      const pathParts = url.pathname.split("/").filter((p) => p);
      
      if (pathParts.length >= 2) {
        return pathParts.slice(1).join("/");
      }
      
      return uploadURL;
    } catch {
      return uploadURL;
    }
  }

  downloadObject(file: File, res: Response): void {
    const stream = file.createReadStream();
    
    stream.on("error", (error) => {
      console.error("Error streaming file:", error);
      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    });

    file.getMetadata().then(([metadata]) => {
      if (metadata.contentType) {
        res.setHeader("Content-Type", metadata.contentType);
      }
      if (metadata.size) {
        res.setHeader("Content-Length", metadata.size);
      }
      stream.pipe(res);
    }).catch((error) => {
      console.error("Error getting file metadata:", error);
      if (!res.headersSent) {
        res.status(500).send("Error downloading file");
      }
    });
  }
}
