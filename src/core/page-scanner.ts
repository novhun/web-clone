import type { ContrastIssue, FullPageScanResult, PageSectionInfo } from '../shared/types';
import { buildUniqueSelector, formatElementLabel } from './selector';
import { extractPageAssets, extractPageTokens } from './token-and-asset-extractor';
import { computeElementContrast } from './wcag';

const LANDMARK_TAGS = new Set(['header', 'nav', 'main', 'section', 'article', 'aside', 'footer']);

function isIgnoredElement(el: Element): boolean {
  if (el.closest('#webscope-shadow-host')) return true;
  const tag = el.tagName.toLowerCase();
  return tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template';
}

function summarizeText(el: Element): string {
  const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return txt.length > 64 ? `${txt.slice(0, 64)}…` : txt;
}

/**
 * Discover semantic page landmarks (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`)
 * plus meaningful top-level `body > div` containers when landmarks are sparse.
 */
export function discoverPageSections(doc: Document = document): PageSectionInfo[] {
  const sections: PageSectionInfo[] = [];
  const seen = new Set<Element>();

  const pushSection = (el: Element) => {
    if (seen.has(el) || isIgnoredElement(el)) return;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    const rect = el.getBoundingClientRect();
    seen.add(el);
    sections.push({
      selector: buildUniqueSelector(el),
      tagName: el.tagName.toLowerCase(),
      label: formatElementLabel(el),
      textPreview: summarizeText(el),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      childCount: el.children.length,
    });
  };

  for (const el of Array.from(doc.querySelectorAll('header, nav, main, section, article, aside, footer'))) {
    pushSection(el);
  }

  // Fallback / supplement: include direct body block containers that aren't already landmarks
  if (doc.body) {
    for (const child of Array.from(doc.body.children)) {
      const tag = child.tagName.toLowerCase();
      if (!LANDMARK_TAGS.has(tag) && child.children.length > 0) {
        pushSection(child);
      }
    }
  }

  return sections;
}

function hasDirectText(el: Element): boolean {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Scan the entire page DOM for sections, design tokens, assets, and WCAG contrast issues.
 */
export function scanFullPage(doc: Document = document): FullPageScanResult {
  const allElements = Array.from(doc.querySelectorAll('*')).filter((el) => !isIgnoredElement(el));
  const sections = discoverPageSections(doc);
  const tokens = extractPageTokens(doc);
  const assets = extractPageAssets(doc);

  const contrastIssues: ContrastIssue[] = [];
  for (const el of allElements) {
    if (!hasDirectText(el)) continue;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const info = computeElementContrast(el);
    if (info && !info.aaNormal) {
      contrastIssues.push({
        selector: buildUniqueSelector(el),
        label: formatElementLabel(el),
        ratio: info.ratio,
        foreground: info.foreground,
        background: info.background,
      });
    }
  }

  return {
    url: doc.location?.href ?? '',
    title: doc.title ?? '',
    totalElements: allElements.length,
    sections,
    tokens,
    assets,
    contrastIssues,
  };
}
