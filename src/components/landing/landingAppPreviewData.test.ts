import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  getLandingPreviewSection,
  landingPreviewAgentName,
  landingPreviewSections,
  landingPreviewWorkspaceName,
} from './landingAppPreviewData';
import {
  getLandingPreviewNavTarget,
  landingPreviewNavItems,
  landingPreviewSidebarCta,
} from './landingAppPreviewNav';
import {
  landingPreviewSidebarCtaCardClass,
  landingPreviewSidebarCtaInnerClass,
  landingPreviewSidebarCtaWrapperClass,
} from './landingAppPreviewSidebarStyles';
import { splitTickerText } from './landingTickerTextSegments';
import { createLandingWorkflowGraph } from './landingWorkflowMockGraph';

const readComponentSource = (fileName: string) =>
  readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8');

test('landing preview includes an interactive workflow section with mocked graph data', () => {
  const workflow = getLandingPreviewSection('workflow');

  expect(landingPreviewSections.map((section) => section.id)).toContain('workflow');
  expect(workflow.title).toBe('Workflow');
  expect(workflow.workflow.nodes).toHaveLength(3);
  expect(workflow.workflow.nodes.map((node) => node.title)).toEqual([
    'Message enters',
    'Qualify buyer intent',
    'Book showroom visit',
  ]);
  expect(workflow.workflow.edges).toEqual([
    { id: 'entry-qualify', source: 'entry', target: 'qualify', label: 'New inbound lead' },
    { id: 'entry-booking', source: 'entry', target: 'booking', label: 'Ready to visit' },
  ]);
});

test('landing preview section lookup fails for missing mock sections', () => {
  expect(() => getLandingPreviewSection('missing')).toThrow('Unknown landing preview section: missing');
});

test('landing preview routes only overview, agent setup, and workflow to mocked sections', () => {
  expect(landingPreviewNavItems.map((item) => item.label)).toEqual([
    'Overview',
    'Agent Setup',
    'Workflow',
  ]);
  expect(landingPreviewNavItems).toHaveLength(3);
  expect(landingPreviewSections.map((section) => section.id)).not.toContain('channels');

  expect(getLandingPreviewNavTarget('overview')).toBe('overview');
  expect(getLandingPreviewNavTarget('agentSetup')).toBe('agentSetup');
  expect(getLandingPreviewNavTarget('workflow')).toBe('workflow');

  expect(getLandingPreviewSection('overview')).toMatchObject({
    title: 'Overview',
    subtitle: '',
  });
  expect(getLandingPreviewSection('overview').metrics.map((metric) => metric.value)).toEqual([
    '1,460',
    '27,781 credits',
    '224',
    '18',
  ]);
  expect(getLandingPreviewSection('overview').metrics.map((metric) => metric.detail)).toEqual([
    '3,920 customer messages handled',
    '19.0 credits / conversation',
    '15.3% booking conversion',
    '1.2% needed human help',
  ]);
  expect(getLandingPreviewSection('overview').metrics.map((metric) => metric.trend)).toEqual([
    [72, 78, 84, 80, 95, 102, 98, 112, 121, 117, 126, 138, 132, 149, 156, 165],
    [1320, 1498, 1588, 1512, 1805, 1922, 1856, 2134, 2297, 2214, 2396, 2610, 2492, 2778, 2894, 3070],
    [8, 10, 11, 9, 13, 15, 14, 16, 18, 17, 20, 21, 19, 23, 24, 26],
    [3, 2, 4, 3, 5, 4, 3, 4, 2, 3, 2, 4, 3, 2, 1, 2],
  ]);
  expect(getLandingPreviewSection('agentSetup')).toMatchObject({
    title: 'Configuration',
    agentSetup: {
      name: landingPreviewAgentName,
      model: 'DeepSeek V4 Flash',
      responseLength: 'Brief',
      replyMode: 'Automatic',
    },
  });
  expect(landingPreviewWorkspaceName).toBe('Arden Heights');
  expect(landingPreviewAgentName).toBe('Sales Concierge');
  expect(JSON.stringify(landingPreviewSections)).not.toContain('Sena Residence');
});

test('landing preview breadcrumb uses real demo workspace and agent names', () => {
  const previewSource = readComponentSource('LandingAppPreview.tsx');

  expect(previewSource).toContain('Building2');
  expect(previewSource).toContain('<Building2 className="size-4" />');
  expect(previewSource).toContain('landingPreviewWorkspaceName');
  expect(previewSource).toContain('landingPreviewAgentName');
  expect(previewSource).not.toContain('<span>Personal</span>');
  expect(previewSource).not.toContain('<span>TTT</span>');
});

test('landing preview header keeps only a user-icon avatar on the right', () => {
  const previewSource = readComponentSource('LandingAppPreview.tsx');

  expect(previewSource).toContain('aria-label="Preview user profile"');
  expect(previewSource).toContain('<UserRound className="size-4" />');
  expect(previewSource).not.toContain('Toggle light mode');
  expect(previewSource).not.toContain('Toggle dark mode');
  expect(previewSource).not.toContain('<Sun');
  expect(previewSource).not.toContain('<Moon');
  expect(previewSource).not.toContain('LC');
});

test('landing preview agent setup header does not render action buttons', () => {
  const previewSource = readComponentSource('LandingAppPreview.tsx');

  expect(previewSource).not.toContain('Test your agent');
  expect(previewSource).not.toContain('Publish');
  expect(previewSource).not.toContain('hasSectionActions');
});

test('landing preview sidebar includes a full-version free CTA card', () => {
  expect(landingPreviewSidebarCta).toEqual({
    actionLabel: 'Start for free',
    description: 'Explore the full Kilobot workspace when you are ready.',
    title: 'Explore full version',
  });
});

test('landing preview sidebar CTA is bottom aligned, spacious, light bordered, and tall', () => {
  const sidebarSource = readComponentSource('LandingAppPreviewSidebar.tsx');

  expect(sidebarSource).toContain('text-[14px] font-semibold leading-5 text-zinc-950');
  expect(sidebarSource).not.toContain('text-[13px] font-semibold text-zinc-950');
  expect(landingPreviewSidebarCtaWrapperClass).toContain('mt-auto');
  expect(landingPreviewSidebarCtaWrapperClass).toContain('pt-8');
  expect(landingPreviewSidebarCtaWrapperClass).toContain('pb-1');
  expect(landingPreviewSidebarCtaCardClass).toContain('min-h-[168px]');
  expect(landingPreviewSidebarCtaCardClass).toContain('bg-[conic-gradient');
  expect(landingPreviewSidebarCtaCardClass).toContain('#67e8f9');
  expect(landingPreviewSidebarCtaCardClass).toContain('#f0abfc');
  expect(landingPreviewSidebarCtaCardClass).toContain('p-[1.5px]');
  expect(landingPreviewSidebarCtaCardClass).not.toContain('#22d3ee');
  expect(landingPreviewSidebarCtaCardClass).not.toContain('#f472b6');
  expect(landingPreviewSidebarCtaInnerClass).toContain('min-h-[166px]');
  expect(landingPreviewSidebarCtaInnerClass).toContain('justify-between');
});

test('landing preview workflow mock adapts to the real workflow graph shape', () => {
  const graph = createLandingWorkflowGraph(getLandingPreviewSection('workflow').workflow);

  expect(graph.workflow.name).toBe('Landing preview workflow');
  expect(graph.nodes.map((node) => node.kind)).toEqual([
    'start',
    'updateLeadsStatus',
    'bookAppointment',
  ]);
  expect(graph.nodes.map((node) => node._id)).toEqual([
    'landing-workflow-node-entry',
    'landing-workflow-node-qualify',
    'landing-workflow-node-booking',
  ]);
  expect(graph.edges[0]).toMatchObject({
    _id: 'landing-workflow-edge-entry-qualify',
    sourceNodeId: 'landing-workflow-node-entry',
    targetNodeId: 'landing-workflow-node-qualify',
    label: 'New inbound lead',
  });
});

test('landing preview workflow does not render a help prompt input', () => {
  const workflowSource = readComponentSource('LandingAppPreviewWorkflow.tsx');

  expect(workflowSource).not.toContain('Get help from Kilo');
});

test('landing preview workflow renders the real workflow canvas with no API calls', () => {
  const workflowSource = readComponentSource('LandingAppPreviewWorkflow.tsx');

  expect(workflowSource).toContain('WorkflowCanvas');
  expect(workflowSource).toContain('WorkflowInspector');
  expect(workflowSource).toContain('portalContainer={previewPortalContainer}');
  expect(workflowSource).toContain('overlayClassName="absolute inset-0 z-40');
  expect(workflowSource).toContain('contentClassName="!absolute');
  expect(workflowSource).toContain('workflowGraphToFlow');
  expect(workflowSource).toContain('addLandingPreviewWorkflowNode');
  expect(workflowSource).toContain('updateLandingPreviewWorkflowNode');
  expect(workflowSource).toContain('className="relative flex min-h-0 flex-1 overflow-hidden bg-background"');
  expect(workflowSource).not.toContain('rounded-lg border border-zinc-200');
  expect(workflowSource).not.toContain('<svg aria-hidden="true" className="absolute inset-0"');
  expect(workflowSource).not.toContain('useQuery');
  expect(workflowSource).not.toContain('useMutation');
  expect(workflowSource).not.toContain('api.');
});

test('landing preview workflow renders as a canvas without page header copy', () => {
  const appPreviewSource = readComponentSource('LandingAppPreview.tsx');

  expect(getLandingPreviewSection('workflow').subtitle).toBe('');
  expect(appPreviewSource).toContain("const showsSectionHeader = section.id !== 'workflow'");
});

test('landing preview overview cards use plain metric value text', () => {
  const contentSource = readComponentSource('LandingAppPreviewContent.tsx');

  expect(contentSource).toContain('selectedMetricIndex');
  expect(contentSource).toContain('buildSmoothChartPath');
  expect(contentSource).toContain("import { AnimatePresence, motion } from 'motion/react'");
  expect(contentSource).toContain('onSelectMetric');
  expect(contentSource).toContain('h-[104px]');
  expect(contentSource).toContain('{metric.value}');
  expect(contentSource).toContain('data-preview-metric-value');
  expect(contentSource).toContain('data-preview-overview-chart-path');
  expect(contentSource).toContain('<AnimatePresence mode="wait" initial={false}>');
  expect(contentSource).toContain('key={selectedMetric.label}');
  expect(contentSource).toContain('initial={{ opacity: 0, y: 10 }}');
  expect(contentSource).toContain('animate={{ opacity: 1, y: 0 }}');
  expect(contentSource).toContain('exit={{ opacity: 0, y: -10 }}');
  expect(contentSource).not.toContain("import { NumberTicker } from '@/components/motion/number-ticker'");
  expect(contentSource).not.toContain('getMetricValueParts(metric.value)');
  expect(contentSource).not.toContain('value={tickerValue}');
  expect(contentSource).not.toContain('format={(value) => value.toLocaleString()}');
  expect(contentSource).not.toContain('{tickerSuffix ? <span className="ml-1">{tickerSuffix}</span> : null}');
  expect(contentSource).not.toContain('{metric.detail}</div>');
  expect(contentSource).not.toContain('value={metric.detail}');
  expect(contentSource).not.toContain('suffix={tickerSuffix}');
  expect(contentSource).not.toContain('digitWidth=');
  expect(contentSource).not.toContain('className="mt-3 block text-[11px] font-medium text-zinc-500"');
  expect(contentSource).not.toContain('function Sparkline');
  expect(contentSource).not.toContain('<Sparkline');
  expect(contentSource).not.toContain('Billing period');
  expect(contentSource).not.toContain('Daily');
  expect(contentSource).not.toContain('<polyline');
});

test('landing ticker text splits mixed number strings for ticker rendering', () => {
  expect(splitTickerText('1,460')).toEqual([
    { kind: 'number', raw: '1,460', value: 1460, decimalPlaces: 0 },
  ]);
  expect(splitTickerText('76.5 credits / conversation')).toEqual([
    { kind: 'number', raw: '76.5', value: 76.5, decimalPlaces: 1 },
    { kind: 'text', text: ' credits / conversation' },
  ]);
  expect(splitTickerText('50% booking rate')).toEqual([
    { kind: 'number', raw: '50', value: 50, decimalPlaces: 0 },
    { kind: 'text', text: '% booking rate' },
  ]);
});

test('landing preview agent setup model controls use compact labels with roomier spacing', () => {
  const agentSetupSource = readComponentSource('LandingAppPreviewAgentSetup.tsx');

  expect(agentSetupSource).toContain('useState');
  expect(agentSetupSource).toContain('SelectTrigger');
  expect(agentSetupSource).toContain('SelectContent');
  expect(agentSetupSource).toContain('SelectItem');
  expect(agentSetupSource).toContain('focus:!bg-transparent');
  expect(agentSetupSource).toContain('data-[highlighted]:!bg-transparent');
  expect(agentSetupSource).toContain('previewControlOptions');
  expect(agentSetupSource).toContain('onValueChange={onValueChange}');
  expect(agentSetupSource).toContain('grid-cols-[minmax(0,1fr)_360px]');
  expect(agentSetupSource).toContain('space-y-4');
  expect(agentSetupSource).toContain('text-[13px] font-semibold');
  expect(agentSetupSource).toContain('text-[11px] leading-4');
  expect(agentSetupSource).toContain('!h-10');
  expect(agentSetupSource).not.toContain('className="flex h-9 w-full items-center justify-between');
  expect(agentSetupSource).not.toContain('space-y-2.5');
  expect(agentSetupSource).not.toContain('space-y-3.5');
  expect(agentSetupSource).not.toContain('h-7');
  expect(agentSetupSource).not.toContain('h-9 w-full justify-between');
  expect(agentSetupSource).not.toContain('text-sm font-semibold text-zinc-800');
  expect(agentSetupSource).not.toContain('Triggers');
});
