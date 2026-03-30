/**
 * Responsibility: Validates and stores uploaded product images for admin catalog management.
 */
import { mkdirSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

import type { RequestHandler } from "express";
import multer from "multer";

import { AppError } from "../lib/app-error";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "products");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

mkdirSync(uploadDirectory, { recursive: true });

export const productImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, uploadDirectory);
    },
    filename: (_request, file, callback) => {
      const extension = extensionByMimeType[file.mimetype] ?? path.extname(file.originalname);
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError("Only JPEG, PNG, and WEBP images are allowed for product uploads.", 400),
      );
      return;
    }

    callback(null, true);
  },
});

export const requireUploadedImage: RequestHandler = (request, _response, next) => {
  if (!request.file) {
    next(new AppError("A product image file is required.", 400));
    return;
  }

  next();
};

