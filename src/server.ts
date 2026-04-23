import { buildApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

const app = buildApp();

app.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
});
