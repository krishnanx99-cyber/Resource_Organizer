import type { Request, Response, NextFunction } from "express";
import { resourceService } from "./service.ts";
import { createResourceSchema, updateResourceSchema } from "./validator.ts";

export const resourceController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createResourceSchema.parse(req.body);
      const resource = await resourceService.create(req.user!.userId, input);
      res.status(201).json(resource);
    } catch (err) {
      next(err);
    }
  },

  async findAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const resources = await resourceService.findAllByOwner(_req.user!.userId);
      res.json(resources);
    } catch (err) {
      next(err);
    }
  },

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const resource = await resourceService.findById(req.params.id, req.user!.userId);
      res.json(resource);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateResourceSchema.parse(req.body);
      const resource = await resourceService.update(req.params.id, req.user!.userId, input);
      res.json(resource);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await resourceService.delete(req.params.id, req.user!.userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
