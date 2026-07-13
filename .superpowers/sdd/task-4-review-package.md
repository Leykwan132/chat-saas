# Task 4 Review Package

```diff
diff --git a/src/components/booking/BookingDetailsPanel.tsx b/src/components/booking/BookingDetailsPanel.tsx
index 24f03aef..88548422 100644
--- a/src/components/booking/BookingDetailsPanel.tsx
+++ b/src/components/booking/BookingDetailsPanel.tsx
@@ -1,12 +1,18 @@
+import type { ReactNode } from 'react';
 import type { LucideIcon } from 'lucide-react';
 import { Check } from 'lucide-react';
-import { ShineBorder } from '@/components/ui/shine-border';
-import { Skeleton } from '@/components/ui/skeleton';
-import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
-
-export const BOOKING_SHINE_COLORS = ['#059669', '#10B981', '#34D399'] as const;
-export const BOOKED_CHECK_BG_CLASS = 'bg-emerald-500';
+import {
+  BookingDetailsActionsBar,
+  type BookingDetailsPanelActions,
+} from './BookingDetailsActionsBar';
+import { BookingAccentBar } from './BookingAccentBar';
+import {
+  BOOKED_CHECK_BG_CLASS,
+  BOOKING_CARD_SURFACE_CLASS,
+} from './bookingDetailsStyles';
+
+export type { BookingDetailsPanelActions } from './BookingDetailsActionsBar';
 
 export function BookedCheckIcon({
   className,
@@ -72,59 +78,6 @@ export type BookingDetailSection = {
   rows: BookingDetailItem[];
 };
 
-export type BookingDetailsPanelActions = {
-  onAddRemarks?: () => void;
-  onEditBooking?: () => void;
-  addRemarksLabel?: string;
-  disableAddRemarks?: boolean;
-  disableEditBooking?: boolean;
-};
-
-function BookingDetailsActionsBar({
-  actions,
-  compact = false,
-}: {
-  actions: BookingDetailsPanelActions;
-  compact?: boolean;
-}) {
-  if (!actions.onAddRemarks && !actions.onEditBooking) {
-    return null;
-  }
-
-  return (
-    <div
-      className={cn(
-        'flex gap-2',
-        compact ? 'mt-3 flex-row justify-end' : 'mt-4 flex-col',
-      )}
-    >
-      {actions.onAddRemarks ? (
-        <Button
-          type="button"
-          size={compact ? 'sm' : 'default'}
-          className={compact ? undefined : 'w-full'}
-          disabled={actions.disableAddRemarks}
-          onClick={actions.onAddRemarks}
-        >
-          {actions.addRemarksLabel ?? 'Add remarks'}
-        </Button>
-      ) : null}
-      {actions.onEditBooking ? (
-        <Button
-          type="button"
-          variant="secondary"
-          size={compact ? 'sm' : 'default'}
-          className={compact ? undefined : 'w-full'}
-          disabled={actions.disableEditBooking}
-          onClick={actions.onEditBooking}
-        >
-          Edit booking
-        </Button>
-      ) : null}
-    </div>
-  );
-}
-
 function filterVisibleBookingRows(rows: BookingDetailItem[]) {
   return rows.filter((row) => row.value !== '—' && row.value.trim().length > 0);
 }
@@ -152,14 +105,6 @@ function BookingDetailSectionGroup({ title, rows }: BookingDetailSection) {
   );
 }
 
-export function formatCollectedFieldValue(
-  value: string | number | boolean | null | undefined,
-) {
-  if (value === null || value === undefined || value === '') return '—';
-  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
-  return String(value);
-}
-
 export function BookingDetailRow({
   label,
   value,
@@ -205,9 +150,9 @@ export function BookingDetailsPanel({
   sections,
   date,
   timeRange,
-  shineColors,
-  checkIconClassName,
   actions,
+  compactLabel,
+  compactStatus,
   variant = 'panel',
   className,
 }: {
@@ -217,9 +162,9 @@ export function BookingDetailsPanel({
   sections?: BookingDetailSection[];
   date?: string;
   timeRange?: string;
-  shineColors?: readonly string[];
-  checkIconClassName?: string;
   actions?: BookingDetailsPanelActions;
+  compactLabel?: string;
+  compactStatus?: ReactNode;
   variant?: 'panel' | 'compact' | 'inline';
   className?: string;
 }) {
@@ -230,31 +175,26 @@ export function BookingDetailsPanel({
     return (
       <div
         className={cn(
-          'relative min-w-0 rounded-lg border border-border bg-muted/40 p-3 shadow-none',
+          'flex w-full min-w-0 items-stretch gap-2.5 px-3 py-2.5',
+          BOOKING_CARD_SURFACE_CLASS,
           className,
         )}
       >
-        {shineColors ? <ShineBorder shineColor={[...shineColors]} /> : null}
-        <div className="flex min-w-0 items-center gap-3">
-          <BookedCheckIcon size="md" className={cn('shrink-0', checkIconClassName)} />
-          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
-            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
-            {schedule ? (
-              <p className="truncate text-xs text-muted-foreground">{schedule}</p>
+        <BookingAccentBar />
+        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
+          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
+            <span className="flex min-w-0 items-center justify-between gap-2">
+              {schedule ? (
+                <span className="truncate text-xs font-medium text-foreground">{schedule}</span>
+              ) : null}
+              {compactStatus}
+            </span>
+            <p className="truncate text-[11px] text-muted-foreground">{title}</p>
+            {compactLabel ? (
+              <p className="truncate text-[10px] text-muted-foreground/80">{compactLabel}</p>
             ) : null}
-          </div>
-          {actions?.onEditBooking ? (
-            <Button
-              type="button"
-              variant="secondary"
-              size="sm"
-              className="shrink-0"
-              disabled={actions.disableEditBooking}
-              onClick={actions.onEditBooking}
-            >
-              Edit booking
-            </Button>
-          ) : null}
+          </span>
+          {actions ? <BookingDetailsActionsBar actions={actions} compact /> : null}
         </div>
       </div>
     );
@@ -262,7 +202,7 @@ export function BookingDetailsPanel({
 
   const header = (
     <div className="flex gap-3">
-      <BookedCheckIcon size="lg" className={cn('mt-0.5', checkIconClassName)} />
+      <BookedCheckIcon size="lg" className="mt-0.5" />
       <div className="min-w-0 flex-1">
         <div className="flex flex-wrap items-center gap-2">
           <h3 className="text-base font-semibold leading-snug text-foreground">{title}</h3>
@@ -297,108 +237,19 @@ export function BookingDetailsPanel({
     ) : null;
 
   const isInline = variant === 'inline';
-  const useContainer = Boolean(actions);
-
-  const panelBody = (
-    <>
-      {header}
-      {detailContent}
-      {actions ? <BookingDetailsActionsBar actions={actions} /> : null}
-    </>
-  );
-
-  if (useContainer) {
-    return (
-      <div
-        className={cn(
-          'relative overflow-hidden rounded-lg border border-border bg-muted/40 p-4 shadow-none',
-          className,
-        )}
-      >
-        <ShineBorder shineColor={[...BOOKING_SHINE_COLORS]} />
-        {panelBody}
-      </div>
-    );
-  }
 
   return (
     <div
       className={cn(
-        'relative overflow-hidden shadow-none',
-        isInline ? 'p-0' : 'rounded-lg border border-border bg-muted/40 p-4',
+        isInline
+          ? 'relative overflow-hidden p-0 shadow-none'
+          : cn('p-4', BOOKING_CARD_SURFACE_CLASS),
         className,
       )}
     >
-      {!isInline && shineColors ? <ShineBorder shineColor={[...shineColors]} /> : null}
-      {panelBody}
-    </div>
-  );
-}
-
-function BookingDetailSectionSkeleton({ rowCount }: { rowCount: number }) {
-  return (
-    <div className="flex flex-col gap-2.5">
-      <Skeleton className="h-3 w-24 rounded-md" />
-      <div className="flex flex-col gap-3">
-        {Array.from({ length: rowCount }, (_, index) => (
-          <div key={index} className="flex items-start gap-3">
-            <Skeleton className="mt-0.5 size-4 shrink-0 rounded-md" />
-            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
-              <Skeleton className="h-3 w-16 rounded-md" />
-              <Skeleton className="h-4 w-4/5 max-w-xs rounded-md" />
-            </div>
-          </div>
-        ))}
-      </div>
-    </div>
-  );
-}
-
-export function BookingDetailsPanelSkeleton({
-  variant = 'inline',
-  className,
-}: {
-  variant?: 'panel' | 'compact' | 'inline';
-  className?: string;
-}) {
-  if (variant === 'compact') {
-    return (
-      <div
-        className={cn(
-          'relative min-w-0 rounded-lg border border-border bg-muted/40 p-3 shadow-none',
-          className,
-        )}
-      >
-        <div className="flex min-w-0 gap-3">
-          <Skeleton className="size-5 shrink-0 rounded-full" />
-          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
-            <Skeleton className="h-4 w-3/5 rounded-md" />
-            <Skeleton className="h-3 w-2/5 rounded-md" />
-          </div>
-        </div>
-      </div>
-    );
-  }
-
-  const isInline = variant === 'inline';
-
-  return (
-    <div
-      className={cn(
-        'relative overflow-hidden shadow-none',
-        isInline ? 'p-0' : 'rounded-lg border border-border bg-muted/40 p-4',
-        className,
-      )}
-    >
-      <div className="flex gap-3">
-        <Skeleton className="size-6 shrink-0 rounded-full" />
-        <Skeleton className="h-5 w-40 max-w-full rounded-md" />
-      </div>
-      <div className="mt-4 flex flex-col gap-4">
-        <BookingDetailSectionSkeleton rowCount={4} />
-        <BookingDetailSectionSkeleton rowCount={2} />
-        <BookingDetailSectionSkeleton rowCount={1} />
-      </div>
+      {header}
+      {detailContent}
+      {actions ? <BookingDetailsActionsBar actions={actions} /> : null}
     </div>
   );
 }
diff --git a/src/components/inbox/InboxBookingDetailsCard.tsx b/src/components/inbox/InboxBookingDetailsCard.tsx
index a6555c17..34c690dd 100644
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
@@ -10,17 +12,31 @@ import {
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
+  bookingReference?: string;
   status: string;
   service: {
     name: string;
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
@@ -51,31 +70,56 @@ export function InboxBookingDetailsCard({
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
+    // ponytail: closing edit and opening confirm in the same click dismisses the new dialog; defer past dismiss
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
+      toast.error(error instanceof Error ? error.message : 'Could not complete booking');
+    } finally {
+      setCompletionBusy(false);
+    }
   };
 
   const actions: BookingDetailsPanelActions | undefined = canManage
     ? {
-        onAddRemarks: handleAddRemarks,
+        onMarkCompleted: openCompletionConfirm,
         onEditBooking: handleEditBooking,
-        disableAddRemarks: !agentId,
+        disableMarkCompleted: !agentId || completionBusy,
         disableEditBooking: !agentId,
       }
     : undefined;
@@ -83,7 +127,10 @@ export function InboxBookingDetailsCard({
   if (variant === 'compact') {
     const compactActions: BookingDetailsPanelActions | undefined = canManage
       ? {
+          onMarkCompleted: openCompletionConfirm,
           onEditBooking: handleEditBooking,
+          editBookingLabel: 'Edit',
+          disableMarkCompleted: !agentId || completionBusy,
           disableEditBooking: !agentId,
         }
       : undefined;
@@ -92,22 +139,37 @@ export function InboxBookingDetailsCard({
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
+              status={booking.status as AppointmentBookingDisplayStatus}
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
+            onMarkCompleted={openCompletionConfirm}
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
@@ -122,6 +184,9 @@ export function InboxBookingDetailsCard({
     .filter((row) => row.value !== '—');
 
   const bookingDetailRows: BookingDetailItem[] = [];
+  if (booking.bookingReference) {
+    bookingDetailRows.push({ label: 'Booking reference', value: booking.bookingReference, icon: Hash });
+  }
   if (booking.date) {
     bookingDetailRows.push({ label: 'Date', value: booking.date, icon: Calendar });
   }
@@ -165,7 +230,6 @@ export function InboxBookingDetailsCard({
         title={booking.service.name}
         badge={booking.status === 'editing' ? 'Editing' : undefined}
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
+          onMarkCompleted={openCompletionConfirm}
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
diff --git a/src/pages/ChatsPage.tsx b/src/pages/ChatsPage.tsx
index 9aed5302..7fd28dd4 100644
--- a/src/pages/ChatsPage.tsx
+++ b/src/pages/ChatsPage.tsx
@@ -90,6 +90,13 @@ import {
 import {
   InboxBookingDetailsCard,
 } from '@/components/inbox/InboxBookingDetailsCard';
+import { InboxCustomerBookingsSection } from '@/components/inbox/InboxCustomerBookingsSection';
+import { CreateCustomerBookingDialog } from '@/components/inbox/CreateCustomerBookingDialog';
+import { InboxCustomerBookingDetailsDialog } from '@/components/inbox/InboxCustomerBookingDetailsDialog';
+import {
+  getMostRecentCustomerBooking,
+  type CustomerBookingHistoryItem,
+} from '@/components/inbox/customerBookingsModel';
 import { BookedCheckIcon } from '@/components/booking/BookingDetailsPanel';
 import {
   InboxFilterSidebar,
@@ -603,6 +610,9 @@ export default function ChatsPage() {
   const [summaryError, setSummaryError] = useState<string | null>(null);
   const [tagsSectionOpen, setTagsSectionOpen] = useState(false);
   const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
+  const [bookingsOpen, setBookingsOpen] = useState(false);
+  const [createBookingOpen, setCreateBookingOpen] = useState(false);
+  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
   const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
   const [logSectionOpen, setLogSectionOpen] = useState(false);
   const ensureAssignedAgent = useMutation(api.conversations.ensureAssignedAgent);
@@ -637,10 +647,12 @@ export default function ChatsPage() {
     selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
   );
 
-  const conversationBooking = useQuery(
-    api.appointmentBooking.currentBooking.getCurrentBookingForConversation,
+  const customerBookings = useQuery(
+    api.appointmentBooking.customerBookings.listForConversation,
     selectedConversationId ? { conversationId: selectedConversationId } : 'skip',
-  );
+  ) as CustomerBookingHistoryItem[] | undefined;
+  const mostRecentBooking = getMostRecentCustomerBooking(customerBookings ?? []);
+  const selectedBooking = customerBookings?.find((booking) => booking.bookingId === selectedBookingId) ?? null;
 
   const conversationLogs = useQuery(
     api.conversationLogs.listByConversation,
@@ -1453,7 +1465,7 @@ export default function ChatsPage() {
                 </div>
                 <div className="flex shrink-0 items-center gap-2.5">
                   {selectedConversation ? (
-                    <div className="inline-flex h-8 w-fit shrink-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 shadow-none">
+                    <div className="inline-flex h-8 w-fit shrink-0 items-center gap-2 rounded-md bg-background px-2.5 shadow-none">
                       <label
                         htmlFor="ai-replies-switch-chat"
                         className={cn(
@@ -1473,18 +1485,6 @@ export default function ChatsPage() {
                       />
                     </div>
                   ) : null}
-                  {selectedConversation?.service === 'whatsapp' &&
-                    selectedConversation.channelId &&
-                    agentId ? (
-                    <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-normal" asChild>
-                      <Link
-                        to={`/dashboard/${agentId}/channels/${selectedConversation.channelId}/templates`}
-                      >
-                        <FileText className="size-3.5" />
-                        Message templates
-                      </Link>
-                    </Button>
-                  ) : null}
                 </div>
               </div>
 
@@ -1506,12 +1506,19 @@ export default function ChatsPage() {
 
               {/* Chat Input — pinned to bottom of the chat column */}
               <div className="row-start-3 flex w-full min-w-0 flex-col gap-3 border-t border-border bg-background p-4">
-                {conversationBooking ? (
+                {mostRecentBooking ? (
                   <InboxBookingDetailsCard
-                    booking={conversationBooking}
+                    booking={{
+                      ...mostRecentBooking,
+                      service: {
+                        name: mostRecentBooking.service.name,
+                        fields: mostRecentBooking.service.fields ?? [],
+                      },
+                    }}
                     variant="compact"
                     canManage={can(Permission.CALENDAR_MANAGE)}
                     agentId={agentId}
+                    onOpenDetails={() => setSelectedBookingId(mostRecentBooking.bookingId)}
                   />
                 ) : null}
                 {selectedConversation?.escalation && (
@@ -1655,7 +1662,7 @@ export default function ChatsPage() {
                   icon={Clock}
                   onClick={() => handleExpandDetailsSection('log')}
                 />
-                {conversationBooking ? (
+                {mostRecentBooking ? (
                   <DetailsPanelRailButton
                     label="Booked"
                     marker
@@ -1955,7 +1962,17 @@ export default function ChatsPage() {
                       ) : null}
                     </div>
 
+                    <Separator />
 
+                    <InboxCustomerBookingsSection
+                      bookings={customerBookings ?? []}
+                      loading={customerBookings === undefined}
+                      open={bookingsOpen}
+                      onOpenChange={setBookingsOpen}
+                      canManage={can(Permission.CALENDAR_MANAGE)}
+                      onCreate={() => setCreateBookingOpen(true)}
+                      onSelect={(booking) => setSelectedBookingId(booking.bookingId)}
+                    />
 
                     <Separator />
 
@@ -2285,16 +2302,6 @@ export default function ChatsPage() {
                       ) : null}
                     </div>
 
-                    {conversationBooking ? (
-                      <div className="mt-5 px-4 pb-3">
-                        <InboxBookingDetailsCard
-                          booking={conversationBooking}
-                          canManage={can(Permission.CALENDAR_MANAGE)}
-                          agentId={agentId}
-                        />
-                      </div>
-                    ) : null}
-
                   </div>
                 )
               )}
@@ -2303,6 +2310,23 @@ export default function ChatsPage() {
           </div>
         )}
 
+      {selectedConversationId ? (
+        <CreateCustomerBookingDialog
+          open={createBookingOpen}
+          onOpenChange={setCreateBookingOpen}
+          conversationId={selectedConversationId}
+        />
+      ) : null}
+      <InboxCustomerBookingDetailsDialog
+        booking={selectedBooking}
+        open={selectedBookingId !== null}
+        onOpenChange={(open) => {
+          if (!open) setSelectedBookingId(null);
+        }}
+        canManage={can(Permission.CALENDAR_MANAGE)}
+        agentId={agentId}
+      />
+
       <Dialog open={resolveConfirmOpen} onOpenChange={setResolveConfirmOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>

```

## src/components/booking/BookingStatusTag.tsx

```
import type { MouseEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  appointmentBookingStatusClass,
  appointmentBookingStatusLabel,
  type AppointmentBookingDisplayStatus,
} from '@/lib/appointmentBookingStatusPresentation';
import { cn } from '@/lib/utils';

export function BookingStatusTag({
  status,
  onClick,
  contextLabel,
}: {
  status: AppointmentBookingDisplayStatus;
  onClick?: () => void;
  contextLabel?: string;
}) {
  const label = appointmentBookingStatusLabel(status);
  const className = cn(
    'h-auto border-0 px-1.5 py-0.5 text-[10px] leading-none',
    appointmentBookingStatusClass(status),
  );

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {contextLabel ? (
        <span className="text-[10px] font-medium text-muted-foreground">{contextLabel}</span>
      ) : null}
      {onClick ? (
        <Badge asChild className={className}>
          <button type="button" onClick={handleClick} aria-label={`Edit booking status: ${label}`}>
            {label}
          </button>
        </Badge>
      ) : (
        <Badge className={className}>{label}</Badge>
      )}
    </span>
  );
}

```

## src/components/inbox/InboxBookingStatusInteraction.test.ts

```
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const cardSource = readFileSync(
  new URL('./InboxBookingDetailsCard.tsx', import.meta.url),
  'utf8',
);
const chatsSource = readFileSync(new URL('../../pages/ChatsPage.tsx', import.meta.url), 'utf8');
const rowSource = readFileSync(new URL('./InboxCustomerBookingRow.tsx', import.meta.url), 'utf8');
const tagSource = readFileSync(
  new URL('../booking/BookingStatusTag.tsx', import.meta.url),
  'utf8',
);

describe('inbox booking status interaction', () => {
  test('latest booking status opens the full editor for managers', () => {
    expect(cardSource).toContain('BookingStatusTag');
    expect(cardSource).toContain('onClick={canManage ? handleEditBooking : undefined}');
    expect(cardSource).toContain('contextLabel="Most recent"');
    expect(chatsSource).toContain('can(Permission.CALENDAR_MANAGE)');
    expect(chatsSource).not.toContain("mostRecentBooking.status === 'booked'");
  });

  test('history and compact cards share status presentation', () => {
    expect(rowSource).toContain('BookingStatusTag');
    expect(rowSource).not.toContain('STATUS_TAG_CLASSES');
    expect(tagSource).toContain('appointmentBookingStatusClass');
  });
});

```

