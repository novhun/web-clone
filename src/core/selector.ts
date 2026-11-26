/**
 * Format a short human-readable label for an element (e.g. `button#submit.btn.primary`).
 */
export function formatElementLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const idPart = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList).slice(0, 2);
  const classPart = classes.length > 0 ? `.${classes.join('.')}` : '';
  return `${tag}${idPart}${classPart}`;
}

/**
 * Build a stable, unique CSS selector for `el` within its ownerDocument.
 */
export function buildUniqueSelector(el: Element): string {
  const doc = el.ownerDocument;
  if (el === doc.documentElement) return 'html';
  if (el === doc.body) return 'body';

  if (el.id) {
    const idSelector = `#${cssEscape(el.id)}`;
    if (safeQueryCount(doc, idSelector) === 1) {
      return idSelector;
    }
  }

  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current !== doc.documentElement) {
    if (current.id) {
      const idSelector = `#${cssEscape(current.id)}`;
      if (safeQueryCount(doc, idSelector) === 1) {
        segments.unshift(idSelector);
        break;
      }
    }

    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      segments.unshift(tag);
      break;
    }

    const sameTagSiblings = Array.from(parent.children).filter(
      (child) => child.tagName === current!.tagName,
    );
    const segment =
      sameTagSiblings.length > 1
        ? `${tag}:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`
        : tag;

    segments.unshift(segment);
    const candidate = segments.join(' > ');
    if (safeQueryCount(doc, candidate) === 1) {
      return candidate;
    }
    current = parent;
  }

  return segments.join(' > ');
}

export function resolveSelector(doc: Document, selector: string): Element | null {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

function safeQueryCount(doc: Document, selector: string): number {
  try {
    return doc.querySelectorAll(selector).length;
  } catch {
    return 0;
  }
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}
