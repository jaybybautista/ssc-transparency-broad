import React, { useMemo } from 'react';
import { sanitizeHtml, toRichHtml } from './richText';
import './RichContent.css';

/**
 * Renders admin-authored rich text with the same styling used inside the editor.
 * Legacy plain-text records keep their line breaks.
 */
const RichContent = ({ html, className = '' }) => {
  const safeHtml = useMemo(() => sanitizeHtml(toRichHtml(html)), [html]);

  if (!safeHtml) return null;

  return <div className={`rich-content ${className}`.trim()} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
};

export default RichContent;
