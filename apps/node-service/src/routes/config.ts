import { Router } from "express";
import { APP_CONFIG } from "../config/appConfig";

export const configRouter = Router();

configRouter.get("/", (_req, res) => {
  res.json(APP_CONFIG);
});
