import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FileUploadDropzoneContainer } from './FileUploadDropzoneContainer';

describe('FileUploadDropzoneContainer', () => {
  it('does not add a border or inset around the dashed upload target', () => {
    const markup = renderToStaticMarkup(
      <FileUploadDropzoneContainer>
        <div className="border-2 border-dashed">Upload files</div>
      </FileUploadDropzoneContainer>,
    );

    expect(markup).not.toContain('p-4');
    expect(markup).toContain('border-2 border-dashed');
  });
});
