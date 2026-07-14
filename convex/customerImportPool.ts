import { v } from "convex/values";
import { Workpool } from "@convex-dev/workpool";
import { components } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthContext, resolveChannelOrgId } from "./authUtils";
import { customerSearchText } from "./customerSearch";

// ─── Workpool instance ─────────────────────────────────────
export const customerImportPool = new Workpool(
  components.customerImportWorkpool,
  { maxParallelism: 5 },
);

/** Number of CSV rows per batch document / mutation call. */
const ROWS_PER_BATCH = 25;

// ─── Public: start an import job ───────────────────────────
export const createImportSession = mutation({
  args: {
    fileName: v.string(),
    totalRows: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const now = Date.now();

    return await ctx.db.insert("customerImports", {
      orgId: resolvedOrgId,
      status: "processing",
      fileName: args.fileName,
      totalRows: args.totalRows,
      processedRows: 0,
      failedRows: 0,
      skippedRows: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const startImport = mutation({
  args: {
    importId: v.id("customerImports"),
    fileName: v.string(),
    /** Array of raw row objects (header → value). Already parsed on the client. */
    rows: v.array(v.record(v.string(), v.string())),
    /** Maps our field key (name/email/phone/notes) → CSV column header */
    fieldMapping: v.record(v.string(), v.string()),
    tags: v.array(v.string()),
    leadTemperature: v.optional(
      v.union(v.literal("Hot"), v.literal("Warm"), v.literal("Cold")),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const now = Date.now();

    // Create the job row
    const jobId = await ctx.db.insert("customerImportJobs", {
      importId: args.importId,
      orgId: resolvedOrgId,
      status: "processing",
      fileName: args.fileName,
      totalRows: args.rows.length,
      processedRows: 0,
      failedRows: 0,
      skippedRows: 0,
      fieldMapping: args.fieldMapping,
      tags: args.tags,
      leadTemperature: args.leadTemperature,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Split rows into batches and enqueue each
    for (let i = 0; i < args.rows.length; i += ROWS_PER_BATCH) {
      const batchRows = args.rows.slice(i, i + ROWS_PER_BATCH);
      const batchIndex = Math.floor(i / ROWS_PER_BATCH);

      const batchId = await ctx.db.insert("customerImportRows", {
        jobId,
        batchIndex,
        rows: batchRows,
        status: "pending",
        processedCount: 0,
        failedCount: 0,
        skippedCount: 0,
      });

      await customerImportPool.enqueueMutation(
        ctx,
        internal.customerImportPool.importBatchWorker,
        { batchId },
        {
          onComplete: internal.customerImportPool.importBatchComplete,
          context: { batchId, jobId },
        },
      );
    }

    return jobId;
  },
});

// ─── Internal: process one batch of rows ───────────────────
export const importBatchWorker = internalMutation({
  args: {
    batchId: v.id("customerImportRows"),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (batch === null) {
      throw new Error(`Batch ${args.batchId} not found`);
    }

    const job = await ctx.db.get(batch.jobId);
    if (job === null) {
      throw new Error(`Job ${batch.jobId} not found`);
    }

    // Mark batch as processing
    await ctx.db.patch(args.batchId, { status: "processing" });

    const orgId = job.orgId;
    const fieldMapping = job.fieldMapping;
    const now = Date.now();

    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const rowIssues: { rowNumber: number; name: string; reason: string; type: "skipped" | "failed" }[] = [];
    const startRowNumber = batch.batchIndex * ROWS_PER_BATCH + 2; // 1-indexed, headers are row 1, data starts at row 2

    let rowIndex = 0;
    for (const rawRow of batch.rows) {
      const rowNumber = startRowNumber + rowIndex;
      rowIndex++;
      try {
        // Extract mapped fields
        const name = fieldMapping.name
          ? (rawRow[fieldMapping.name] ?? "").trim()
          : "";
        const email = fieldMapping.email
          ? (rawRow[fieldMapping.email] ?? "").trim()
          : "";
        const phone = fieldMapping.phone
          ? (rawRow[fieldMapping.phone] ?? "").trim()
          : "";
        const notes = fieldMapping.notes
          ? (rawRow[fieldMapping.notes] ?? "").trim()
          : "";

        // Extract custom fields (any key in fieldMapping that isn't standard name/email/phone/notes)
        const customFields: Record<string, string> = {};
        for (const [fieldKey, csvColumn] of Object.entries(fieldMapping)) {
          if (!["name", "email", "phone", "notes"].includes(fieldKey)) {
            const val = (rawRow[csvColumn] ?? "").trim();
            if (val) {
              customFields[fieldKey] = val;
            }
          }
        }

        // Skip rows with no name
        if (!name) {
          skippedCount++;
          rowIssues.push({
            rowNumber,
            name: "Unnamed Row",
            reason: "Missing name",
            type: "skipped",
          });
          continue;
        }

        // Derive a contact address for dedup.
        // Prefer phone, then email, then name-based fallback.
        const contactAddress = phone || email || `manual-import:${name.toLowerCase()}`;

        // Check for duplicates
        const existing = await ctx.db
          .query("customers")
          .withIndex("by_orgId_and_service_and_contactAddress", (q) =>
            q
              .eq("orgId", orgId)
              .eq("service", "manual")
              .eq("contactAddress", contactAddress),
          )
          .unique();

        if (existing !== null) {
          skippedCount++;
          rowIssues.push({
            rowNumber,
            name,
            reason: "Duplicate contact (phone or email already exists)",
            type: "skipped",
          });
          continue;
        }

        // Insert the customer
        await ctx.db.insert("customers", {
          orgId,
          service: "manual",
          contactAddress,
          name,
          email: email || undefined,
          phone: phone || undefined,
          searchText: customerSearchText({
            name,
            email: email || undefined,
            phone: phone || undefined,
            contactAddress,
          }),
          notes: notes || undefined,
          customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
          tags: [...job.tags],
          leadTemperature: job.leadTemperature,
          source: "manual",
          firstSeenAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        });

        processedCount++;
      } catch (err) {
        console.error("Failed to import row:", err);
        failedCount++;
        const name = fieldMapping.name ? (rawRow[fieldMapping.name] ?? "").trim() : "";
        rowIssues.push({
          rowNumber,
          name: name || "Unknown Row",
          reason: err instanceof Error ? err.message : "Failed to import row",
          type: "failed",
        });
      }
    }

    // Update batch status
    await ctx.db.patch(args.batchId, {
      status: "completed",
      processedCount,
      failedCount,
      skippedCount,
      rowIssues: rowIssues.length > 0 ? rowIssues : undefined,
    });

    return { processedCount, failedCount, skippedCount };
  },
});

// ─── Internal: onComplete callback for each batch ──────────
export const importBatchComplete = internalMutation({
  args: {
    workId: v.string(),
    context: v.object({
      batchId: v.id("customerImportRows"),
      jobId: v.id("customerImportJobs"),
    }),
    result: v.union(
      v.object({ kind: v.literal("success"), returnValue: v.any() }),
      v.object({ kind: v.literal("failed"), error: v.string() }),
      v.object({ kind: v.literal("canceled") }),
    ),
  },
  handler: async (ctx, args) => {
    const { jobId, batchId } = args.context;

    const job = await ctx.db.get(jobId);
    if (job === null) return;

    const batch = await ctx.db.get(batchId);

    let batchProcessed = 0;
    let batchFailed = 0;
    let batchSkipped = 0;

    if (args.result.kind === "success" && batch) {
      batchProcessed = batch.processedCount;
      batchFailed = batch.failedCount;
      batchSkipped = batch.skippedCount;
    } else if (args.result.kind === "failed") {
      // If the whole batch failed, mark all rows as failed
      if (batch) {
        batchFailed = batch.rows.length;
        await ctx.db.patch(batchId, {
          status: "failed",
          errorMessage: args.result.error,
          failedCount: batchFailed,
        });
      }
    } else if (args.result.kind === "canceled" && batch) {
      batchFailed = batch.rows.length;
      await ctx.db.patch(batchId, {
        status: "failed",
        errorMessage: "Canceled",
        failedCount: batchFailed,
      });
    }

    // Update parent job counters
    const newProcessed = job.processedRows + batchProcessed;
    const newFailed = job.failedRows + batchFailed;
    const newSkipped = job.skippedRows + batchSkipped;
    const totalDone = newProcessed + newFailed + newSkipped;

    const patch: Record<string, unknown> = {
      processedRows: newProcessed,
      failedRows: newFailed,
      skippedRows: newSkipped,
      updatedAt: Date.now(),
    };

    if (totalDone >= job.totalRows) {
      patch.status = "completed";
    }

    await ctx.db.patch(jobId, patch);

    // Update aggregate import session counters if linked
    if (job.importId) {
      const parentImport = await ctx.db.get(job.importId);
      if (parentImport) {
        const parentProcessed = parentImport.processedRows + batchProcessed;
        const parentFailed = parentImport.failedRows + batchFailed;
        const parentSkipped = parentImport.skippedRows + batchSkipped;
        const parentTotalDone = parentProcessed + parentFailed + parentSkipped;

        const parentPatch: Record<string, unknown> = {
          processedRows: parentProcessed,
          failedRows: parentFailed,
          skippedRows: parentSkipped,
          updatedAt: Date.now(),
        };

        if (parentTotalDone >= parentImport.totalRows) {
          parentPatch.status = "completed";
        }

        await ctx.db.patch(job.importId, parentPatch);
      }
    }
  },
});

// ─── Public queries for UI ─────────────────────────────────

/** Get a single import job's status (for the progress screen). */
export const getImportJobStatus = query({
  args: { importId: v.id("customerImports") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);
    const parentImport = await ctx.db.get(args.importId);
    if (parentImport === null || parentImport.orgId !== resolvedOrgId) {
      return null;
    }

    // Get all jobs linked to this import
    const jobs = await ctx.db
      .query("customerImportJobs")
      .withIndex("by_importId", (q) => q.eq("importId", args.importId))
      .collect();

    const issues: { rowNumber: number; name: string; reason: string; type: "skipped" | "failed" }[] = [];
    for (const job of jobs) {
      if (job.status === "completed" || job.status === "failed" || job.status === "processing") {
        const batches = await ctx.db
          .query("customerImportRows")
          .withIndex("by_jobId", (q) => q.eq("jobId", job._id))
          .collect();
        for (const batch of batches) {
          if (batch.rowIssues) {
            issues.push(...batch.rowIssues);
          }
          if (batch.status === "failed" && batch.errorMessage) {
            issues.push({
              rowNumber: batch.batchIndex * ROWS_PER_BATCH + 2,
              name: "Batch Failure",
              reason: batch.errorMessage,
              type: "failed",
            });
          }
        }
      }
    }

    // Sort issues by row number
    issues.sort((a, b) => a.rowNumber - b.rowNumber);

    return {
      _id: parentImport._id,
      status: parentImport.status,
      fileName: parentImport.fileName,
      totalRows: parentImport.totalRows,
      processedRows: parentImport.processedRows,
      failedRows: parentImport.failedRows,
      skippedRows: parentImport.skippedRows,
      createdAt: parentImport.createdAt,
      issues,
    };
  },
});

/** List active (non-completed) import jobs for the current org. */
export const listActiveImports = query({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getAuthContext(ctx);
    const resolvedOrgId = resolveChannelOrgId(orgId, userId);

    const processing = await ctx.db
      .query("customerImports")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", resolvedOrgId).eq("status", "processing"),
      )
      .take(5);

    return processing.map((job) => ({
      _id: job._id,
      status: job.status,
      fileName: job.fileName,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      failedRows: job.failedRows,
      skippedRows: job.skippedRows,
      createdAt: job.createdAt,
    }));
  },
});
