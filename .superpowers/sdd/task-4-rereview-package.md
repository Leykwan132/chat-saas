# Task 4 Re-review Package

```diff
diff --git a/src/components/inbox/InboxBookingDetailsCard.tsx b/src/components/inbox/InboxBookingDetailsCard.tsx
index a6555c17..16378d0d 100644
--- a/src/components/inbox/InboxBookingDetailsCard.tsx
+++ b/src/components/inbox/InboxBookingDetailsCard.tsx
@@ -1,8 +1,10 @@
 import { useState } from 'react';
+import { useMutation } from 'convex/react';
 import type { Id } from '../../../convex/_generated/dataModel';
 import {
   Calendar,
   Clock,
+  Hash,
   MessageSquare,
   Phone,
   User,
@@ -10,18 +12,32 @@ import {
 } from 'lucide-react';
 import {
   BookingDetailsPanel,
-  BOOKING_SHINE_COLORS,
-  formatCollectedFieldValue,
   type BookingDetailItem,
   type BookingDetailSection,
   type BookingDetailsPanelActions,
 } from '@/components/booking/BookingDetailsPanel';
+import { formatCollectedFieldValue } from '@/components/booking/bookingDetailFormatting';
+import { formatCompactBookingSchedule } from '@/components/booking/formatCompactBookingSchedule';
+import { BookingStatusTag } from '@/components/booking/BookingStatusTag';
+import type { AppointmentBookingDisplayStatus } from '@/lib/appointmentBookingStatusPresentation';
 import { cn } from '@/lib/utils';
 import { EditBookingDialog } from '../calendar/EditBookingDialog';
+import { api } from '../../../convex/_generated/api';
+import { toast } from 'sonner';
+import {
+  Dialog,
+  DialogContent,
+  DialogDescription,
+  DialogFooter,
+  DialogHeader,
+  DialogTitle,
+} from '@/components/ui/dialog';
+import { Button } from '@/components/ui/button';
 
 export type InboxBookingDetails = {
   bookingId: string;
-  status: string;
+  bookingReference?: string;
+  status: AppointmentBookingDisplayStatus;
   service: {
     name: string;
     fields: Array<{ key: string; label: string; type?: string }>;
@@ -29,6 +45,9 @@ export type InboxBookingDetails = {
   collectedFields: Record<string, string | number | boolean | null>;
   date: string;
   timeRange: string;
+  startAt: number;
+  endAt: number;
+  timeZone: string;
   teamMember?: string;
   remarks?: string;
 };
@@ -51,31 +70,57 @@ export function InboxBookingDetailsCard({
   className,
   canManage = false,
   agentId,
+  onOpenDetails,
 }: {
   booking: InboxBookingDetails;
   variant?: 'panel' | 'compact';
   className?: string;
   canManage?: boolean;
   agentId?: string;
+  onOpenDetails?: () => void;
 }) {
   const [editDialogOpen, setEditDialogOpen] = useState(false);
-  const [autoFocusRemarks, setAutoFocusRemarks] = useState(false);
+  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
+  const [completionBusy, setCompletionBusy] = useState(false);
+  const markBookingCompleted = useMutation(
+    api.appointmentBooking.completion.markBookingCompleted,
+  );
+  const canComplete = canManage && booking.status === 'booked';
 
   const handleEditBooking = () => {
-    setAutoFocusRemarks(false);
     setEditDialogOpen(true);
   };
 
-  const handleAddRemarks = () => {
-    setAutoFocusRemarks(true);
-    setEditDialogOpen(true);
+  const openCompletionConfirm = () => {
+    if (!editDialogOpen) {
+      setCompleteDialogOpen(true);
+      return;
+    }
+    setEditDialogOpen(false);
+    window.setTimeout(() => setCompleteDialogOpen(true), 0);
+  };
+
+  const handleMarkCompleted = async () => {
+    setCompletionBusy(true);
+    try {
+      await markBookingCompleted({
+        bookingId: booking.bookingId as Id<'calendarEvents'>,
+      });
+      toast.success('Booking marked as completed');
+      setCompleteDialogOpen(false);
+    } catch (error) {
+      if (!(error instanceof Error)) throw error;
+      toast.error(error.message);
+    } finally {
+      setCompletionBusy(false);
+    }
   };
 
   const actions: BookingDetailsPanelActions | undefined = canManage
     ? {
-        onAddRemarks: handleAddRemarks,
+        onMarkCompleted: canComplete ? openCompletionConfirm : undefined,
         onEditBooking: handleEditBooking,
-        disableAddRemarks: !agentId,
+        disableMarkCompleted: !agentId || completionBusy,
         disableEditBooking: !agentId,
       }
     : undefined;
@@ -83,7 +128,10 @@ export function InboxBookingDetailsCard({
   if (variant === 'compact') {
     const compactActions: BookingDetailsPanelActions | undefined = canManage
       ? {
+          onMarkCompleted: canComplete ? openCompletionConfirm : undefined,
           onEditBooking: handleEditBooking,
+          editBookingLabel: 'Edit',
+          disableMarkCompleted: !agentId || completionBusy,
           disableEditBooking: !agentId,
         }
       : undefined;
@@ -92,22 +140,37 @@ export function InboxBookingDetailsCard({
       <>
         <BookingDetailsPanel
           title={booking.service.name}
-          date={booking.date}
-          timeRange={booking.timeRange}
+          date={formatCompactBookingSchedule(
+            booking.startAt,
+            booking.endAt,
+            booking.timeZone,
+          )}
+          compactStatus={
+            <BookingStatusTag
+              status={booking.status}
+              onClick={canManage ? handleEditBooking : undefined}
+              contextLabel="Most recent"
+            />
+          }
           actions={compactActions}
-          shineColors={BOOKING_SHINE_COLORS}
           variant="compact"
           className={cn(className)}
         />
-        {editDialogOpen && agentId && (
+        {editDialogOpen && agentId ? (
           <EditBookingDialog
             eventId={booking.bookingId as Id<'calendarEvents'>}
             open={editDialogOpen}
             onOpenChange={setEditDialogOpen}
             agentId={agentId}
-            autoFocusRemarks={autoFocusRemarks}
+            onMarkCompleted={canComplete ? openCompletionConfirm : undefined}
           />
-        )}
+        ) : null}
+        <CompletionDialog
+          open={completeDialogOpen}
+          busy={completionBusy}
+          onOpenChange={setCompleteDialogOpen}
+          onConfirm={handleMarkCompleted}
+        />
       </>
     );
   }
@@ -122,6 +185,9 @@ export function InboxBookingDetailsCard({
     .filter((row) => row.value !== '—');
 
   const bookingDetailRows: BookingDetailItem[] = [];
+  if (booking.bookingReference) {
+    bookingDetailRows.push({ label: 'Booking reference', value: booking.bookingReference, icon: Hash });
+  }
   if (booking.date) {
     bookingDetailRows.push({ label: 'Date', value: booking.date, icon: Calendar });
   }
@@ -163,9 +229,7 @@ export function InboxBookingDetailsCard({
     <>
       <BookingDetailsPanel
         title={booking.service.name}
-        badge={booking.status === 'editing' ? 'Editing' : undefined}
         sections={sections}
-        variant="inline"
         className={cn(className)}
         actions={actions}
       />
@@ -175,9 +239,51 @@ export function InboxBookingDetailsCard({
           open={editDialogOpen}
           onOpenChange={setEditDialogOpen}
           agentId={agentId}
-          autoFocusRemarks={autoFocusRemarks}
+          onMarkCompleted={canComplete ? openCompletionConfirm : undefined}
         />
       )}
+      <CompletionDialog
+        open={completeDialogOpen}
+        busy={completionBusy}
+        onOpenChange={setCompleteDialogOpen}
+        onConfirm={handleMarkCompleted}
+      />
     </>
   );
 }
+
+function CompletionDialog({
+  open,
+  busy,
+  onOpenChange,
+  onConfirm,
+}: {
+  open: boolean;
+  busy: boolean;
+  onOpenChange: (open: boolean) => void;
+  onConfirm: () => Promise<void>;
+}) {
+  return (
+    <Dialog open={open} onOpenChange={onOpenChange}>
+      <DialogContent
+        className="z-[60] sm:max-w-md"
+        overlayClassName="z-[60]"
+      >
+        <DialogHeader>
+          <DialogTitle>Mark booking as completed?</DialogTitle>
+          <DialogDescription>
+            This booking will be removed from the active booking card and kept in calendar history.
+          </DialogDescription>
+        </DialogHeader>
+        <DialogFooter>
+          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
+            Cancel
+          </Button>
+          <Button type="button" disabled={busy} onClick={() => void onConfirm()}>
+            Mark as completed
+          </Button>
+        </DialogFooter>
+      </DialogContent>
+    </Dialog>
+  );
+}

```

