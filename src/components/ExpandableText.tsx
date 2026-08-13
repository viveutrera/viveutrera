import { useLayoutEffect, useRef, useState } from 'react';

interface ExpandableTextProps {
  text: string;
  className?: string;
}

export function ExpandableText({ text, className }: ExpandableTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;
    setCanExpand(element.scrollHeight > element.clientHeight + 1);
  }, [text]);

  return (
    <div className="expandable-text-block">
      <p ref={textRef} className={`${className ?? ''} ${isExpanded ? '' : 'expandable-text-clamped'}`.trim()}>
        {text}
      </p>
      {canExpand ? (
        <button className="expandable-text-toggle" type="button" onClick={() => setExpanded((current) => !current)}>
          {isExpanded ? 'Ver menos' : 'Ver mas'}
        </button>
      ) : null}
    </div>
  );
}
