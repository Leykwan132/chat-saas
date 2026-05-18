// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workpool from "@convex-dev/workpool/convex.config.js";
import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import crons from "@convex-dev/crons/convex.config.js";
import r2 from "@convex-dev/r2/convex.config.js";

const app = defineApp();
app.use(r2);
app.use(agent);
app.use(workpool, { name: "cfUploadWorkpool" });
app.use(workpool, { name: "cfDeleteWorkpool" });
app.use(workpool, { name: "webScraperWorkpool" });
app.use(workpool, { name: "linkDiscovererWorkpool" });
app.use(workpool, { name: "instagramSyncWorkpool" });
app.use(workpool, { name: "messengerSyncWorkpool" });
app.use(workpool, { name: "inboxAiReplyWorkpool" });
app.use(workOSAuthKit);
app.use(crons);
export default app;