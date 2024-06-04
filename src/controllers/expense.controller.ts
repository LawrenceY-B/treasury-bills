import { NextFunction, Request, Response } from "express";
import { pdftoJson } from "../utils/ai_generator";

export const processFile = (req: Request, res: Response, next: NextFunction) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }
        const mimeType = file.mimetype;
        const fileData = file.buffer.toString("base64");
        const pdfToJson = new pdftoJson();
        pdfToJson.mimeType = mimeType;
        pdfToJson.fileData = fileData;
        pdfToJson.generateContent();
        res.status(200).json({ message: "File uploaded" });
    } catch (error) {
        next(error);
    }
}
