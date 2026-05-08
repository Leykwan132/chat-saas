// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workpool from "@convex-dev/workpool/convex.config.js";

const app = defineApp();
app.use(agent);
app.use(workpool, { name: "cfUploadWorkpool" });
app.use(workpool, { name: "cfDeleteWorkpool" });
app.use(workpool, { name: "webScraperWorkpool" });
app.use(workpool, { name: "linkDiscovererWorkpool" });

export default app;