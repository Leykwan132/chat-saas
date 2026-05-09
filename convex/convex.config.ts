// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workpool from "@convex-dev/workpool/convex.config.js";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";

const app = defineApp();
app.use(agent);
app.use(workpool, { name: "cfUploadWorkpool" });
app.use(workpool, { name: "cfDeleteWorkpool" });
app.use(workpool, { name: "webScraperWorkpool" });
app.use(workpool, { name: "linkDiscovererWorkpool" });
app.use(workOSAuthKit);

export default app;