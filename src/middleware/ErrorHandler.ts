import { Request, Response, NextFunction } from "express";

const ErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.statusCode || 500;
    const message = err.message || "Something went wrong";
    res.status(status).json({
        success: false,
        status,
        message,
        stack: process.env.PROD_ENV !== "development" ? {} : err.stack,
    })
}

export default ErrorHandler;