import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const headerUrl = new URL('./KnowledgeBaseHeader.tsx', import.meta.url);
const headerSource = existsSync(headerUrl) ? readFileSync(headerUrl, 'utf8') : '';
const pageSource = readFileSync(
  new URL('../../pages/KnowledgeBasePage.tsx', import.meta.url),
  'utf8',
);
const testLayoutUrl = new URL('./KnowledgeBaseTestLayout.tsx', import.meta.url);
const testLayoutSource = existsSync(testLayoutUrl)
  ? readFileSync(testLayoutUrl, 'utf8')
  : '';

describe('Knowledge Base header', () => {
  it('explains the page and offers agent testing', () => {
    expect(headerSource).toContain('title="Knowledge Base"');
    expect(headerSource).toContain(
      'description="Add the information your agent uses to answer customers."',
    );
    expect(headerSource).toContain('Test your agent');
    expect(headerSource).toContain('variant="outline"');
  });

  it('opens the shared test chat as its own in-page container', () => {
    expect(pageSource).toContain('const [isTestOpen, setIsTestOpen] = useState(false)');
    expect(pageSource).toContain('KnowledgeBaseTestLayout');
    expect(pageSource).toContain(
      'showTestPanel={isTestOpen && Boolean(selectedAgentId)}',
    );
    expect(pageSource).toContain('mode="inline"');
    expect(pageSource).not.toContain('mode="drawer"');
    expect(pageSource).toContain('open={isTestOpen}');
    expect(pageSource).toContain('onOpenChange={setIsTestOpen}');
    expect(pageSource).toContain('onTest={() => setIsTestOpen(true)}');
  });

  it('keeps Knowledge Base content intact beside the responsive test panel', () => {
    expect(testLayoutSource).toContain(
      "showTestPanel && 'xl:grid-cols-[minmax(0,1fr)_380px]'",
    );
    expect(testLayoutSource).toContain(
      '<div className="min-w-0">{children}</div>',
    );
    expect(testLayoutSource).toContain('{testPanel}');
  });
});
