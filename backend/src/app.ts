import express from "express";
import { requestLogger } from "./middlewares/requestLogger.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import { routes } from "./routes/index.ts";

const app = express();

app.use(express.json());
app.use(requestLogger);
app.use(routes);
app.use(errorHandler);

export { app };
