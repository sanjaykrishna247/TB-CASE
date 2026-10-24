import { Fragment } from 'react';

/** Renders **bold**, *italic* and ***bold italic*** inline markup from answers.js */
export function parseRich(text) {
  const out = [];
  const re = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={i++}>{text.slice(last, m.index)}</Fragment>);
    const tok = m[0];
    if (tok.startsWith('***')) out.push(<strong key={i++} className="font-semibold"><em>{tok.slice(3, -3)}</em></strong>);
    else if (tok.startsWith('**')) out.push(<strong key={i++} className="font-semibold">{tok.slice(2, -2)}</strong>);
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return out;
}

export default function RichText({ text, as: Tag = 'span', className = '' }) {
  return <Tag className={className}>{parseRich(text)}</Tag>;
}
