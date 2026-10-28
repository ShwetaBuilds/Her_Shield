import { type Request, type Response, type NextFunction } from "express";

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  const status = err instanceof Error && (err as any).status ? (err as any).status : 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ message });
};
