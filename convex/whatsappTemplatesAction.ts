"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getPublicMediaUrl } from "./media/r2";

const DEFAULT_GRAPH_VERSION = "v22.0";

function graphBase(): string {
  const version = process.env.META_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION;
  return `https://graph.facebook.com/${version}`;
}

export const submitTemplateToMeta = internalAction({
  args: {
    templateId: v.id("whatsappTemplates"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch template from DB
    const template = await ctx.runQuery(internal.whatsappTemplates.internalGetTemplate, {
      templateId: args.templateId,
    });
    if (!template) {
      console.error(`Template not found: ${args.templateId}`);
      return;
    }

    try {
      // 2. Resolve access token & WABA details for the channel
      const channel = await ctx.runQuery(internal.whatsappTemplates.internalGetChannel, {
        channelId: template.channelId,
      });
      if (!channel) {
        throw new Error("WhatsApp channel not found");
      }
      
      const token = (channel.accessToken ?? "").trim();
      if (!token) {
        throw new Error("WhatsApp access token is missing");
      }
      
      const wabaId = channel.wabaId?.trim();
      if (!wabaId) {
        throw new Error("WABA ID is missing for this channel");
      }

      const appId = (process.env.META_APP_ID ?? "").trim();
      
      // Copy components to mutate
      let components = JSON.parse(JSON.stringify(template.components));
      
      // 3. Check for image/video headers and do Meta upload if present
      for (const comp of components) {
        if (comp.type === "HEADER" && (comp.format === "IMAGE" || comp.format === "VIDEO")) {
          // If there is a media R2 key stored on the component, e.g. comp.r2Key
          if (comp.r2Key) {
            console.log(`Uploading header media (${comp.format}) from R2 key: ${comp.r2Key}`);
            
            // Resolve R2 public URL
            const publicUrl = getPublicMediaUrl(comp.r2Key);
            
            // Fetch file blob from R2
            const response = await fetch(publicUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch media from R2: ${response.statusText}`);
            }
            const blob = await response.blob();
            
            // Determine filename & extension from content-type or r2Key
            const contentType = blob.type || (comp.format === "VIDEO" ? "video/mp4" : "image/png");
            const ext = contentType.split("/")[1] || (comp.format === "VIDEO" ? "mp4" : "png");
            const filename = `header_media.${ext}`;
            const fileLength = blob.size;
            
            // Resolve App ID
            let resolvedAppId = appId;
            if (!resolvedAppId) {
              // Fetch app info using the token
              console.log("META_APP_ID not set, querying app endpoint...");
              const appRes = await fetch(`${graphBase()}/app`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (appRes.ok) {
                const appData: any = await appRes.json();
                resolvedAppId = appData.id;
              }
            }
            if (!resolvedAppId) {
              throw new Error("Meta App ID could not be resolved. Please set META_APP_ID env var.");
            }
            
            // Step A: Initiate upload session
            const initRes = await fetch(
              `${graphBase()}/${resolvedAppId}/uploads?file_name=${encodeURIComponent(filename)}&file_length=${fileLength}&file_type=${encodeURIComponent(contentType)}`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!initRes.ok) {
              const errText = await initRes.text();
              throw new Error(`Meta initiate upload failed: ${errText}`);
            }
            const initData: any = await initRes.json();
            const sessionId = initData.id;
            
            // Step B: Upload file binary chunks
            const uploadRes = await fetch(`${graphBase()}/upload:${sessionId}`, {
              method: "POST",
              headers: {
                Authorization: `OAuth ${token}`,
                "file_offset": "0",
                "Content-Type": "application/octet-stream",
              },
              body: blob,
            });
            if (!uploadRes.ok) {
              const errText = await uploadRes.text();
              throw new Error(`Meta binary upload failed: ${errText}`);
            }
            const uploadData: any = await uploadRes.json();
            const headerHandle = uploadData.h; // The handle starts with "h:"
            
            // Update components to use the Meta handle
            comp.example = {
              header_handle: [headerHandle]
            };
            
            // Delete the temporary r2Key so it's not sent to Meta
            delete comp.r2Key;
          }
        }
      }

      // 4. Submit template to Meta
      console.log(`Submitting template ${template.name} to Meta...`);
      const metaRes = await fetch(`${graphBase()}/${wabaId}/message_templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: template.name.trim(),
          category: template.category,
          language: template.language.trim(),
          components,
        }),
      });
      
      const resText = await metaRes.text();
      let resBody: any = resText;
      try {
        resBody = JSON.parse(resText);
      } catch {}

      if (!metaRes.ok) {
        const formatted = typeof resBody === "string" ? resBody : JSON.stringify(resBody, null, 2);
        throw new Error(`Meta template creation failed: ${formatted}`);
      }

      // 5. Update status to submitted
      await ctx.runMutation(internal.whatsappTemplates.updateTemplateStatus, {
        templateId: args.templateId,
        status: "submitted",
      });
      console.log(`Template ${template.name} submitted successfully.`);
      
    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error submitting template ${template.name}:`, errMsg);
      
      // Update status to failed
      await ctx.runMutation(internal.whatsappTemplates.updateTemplateStatus, {
        templateId: args.templateId,
        status: "failed",
        error: errMsg,
      });
    }
  },
});
