import type { Request, Response, NextFunction } from "express";
import { clusterService } from "./service.ts";
import { suggestionService } from "./suggestion.service.ts";
import { createClusterSchema, updateClusterSchema, approveSuggestionParamSchema } from "./validator.ts";

export const clusterController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createClusterSchema.parse(req.body);
      const cluster = await clusterService.create(req.user!.userId, input);
      res.status(201).json(cluster);
    } catch (err) {
      next(err);
    }
  },

  async findAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const clusters = await clusterService.findAllByOwner(_req.user!.userId);
      res.json(clusters);
    } catch (err) {
      next(err);
    }
  },

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const cluster = await clusterService.findById(req.user!.userId, String(req.params.id));
      res.json(cluster);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateClusterSchema.parse(req.body);
      const cluster = await clusterService.update(req.user!.userId, String(req.params.id), input);
      res.json(cluster);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await clusterService.delete(req.user!.userId, String(req.params.id));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async addResource(req: Request, res: Response, next: NextFunction) {
    try {
      await clusterService.addResource(
        req.user!.userId,
        String(req.params.clusterId),
        String(req.params.resourceId),
      );
      res.status(201).end();
    } catch (err) {
      next(err);
    }
  },

  async removeResource(req: Request, res: Response, next: NextFunction) {
    try {
      await clusterService.removeResource(
        req.user!.userId,
        String(req.params.clusterId),
        String(req.params.resourceId),
      );
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async findResources(req: Request, res: Response, next: NextFunction) {
    try {
      const resources = await clusterService.findResources(
        req.user!.userId,
        String(req.params.clusterId),
      );
      res.json(resources);
    } catch (err) {
      next(err);
    }
  },

  async suggest(req: Request, res: Response, next: NextFunction) {
    try {
      const suggestions = await suggestionService.suggestForOwner(req.user!.userId);
      res.json({ suggestions });
    } catch (err) {
      next(err);
    }
  },

  async approveSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { suggestionId } = approveSuggestionParamSchema.parse(req.params);
      const { cluster, created } = await suggestionService.approve(req.user!.userId, suggestionId);
      res.status(created ? 201 : 200).json(cluster);
    } catch (err) {
      next(err);
    }
  },
};