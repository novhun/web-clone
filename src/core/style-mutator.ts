import { buildUniqueSelector } from './selector';

interface MutationRecordEntry {
  element: HTMLElement;
  selector: string;
  property: string;
  previousValue: string;
  previousPriority: string;
}

/**
 * Manages live inline CSS edits on page elements with an undo stack and per-element/global reset.
 */
export class StyleMutator {
  private originals = new WeakMap<HTMLElement, Map<string, { value: string; priority: string }>>();
  private currentOverrides = new WeakMap<HTMLElement, Map<string, string>>();
  private trackedElements = new Set<HTMLElement>();
  private undoStack: MutationRecordEntry[] = [];

  apply(element: HTMLElement, property: string, value: string): void {
    const normalizedProp = property.trim().toLowerCase();
    const trimmedVal = value.trim();

    let elOriginals = this.originals.get(element);
    if (!elOriginals) {
      elOriginals = new Map();
      this.originals.set(element, elOriginals);
    }

    const prevValue = element.style.getPropertyValue(normalizedProp);
    const prevPriority = element.style.getPropertyPriority(normalizedProp);

    if (!elOriginals.has(normalizedProp)) {
      elOriginals.set(normalizedProp, { value: prevValue, priority: prevPriority });
    }

    this.undoStack.push({
      element,
      selector: buildUniqueSelector(element),
      property: normalizedProp,
      previousValue: prevValue,
      previousPriority: prevPriority,
    });

    if (trimmedVal === '') {
      element.style.removeProperty(normalizedProp);
    } else {
      element.style.setProperty(normalizedProp, trimmedVal, 'important');
    }

    let overrides = this.currentOverrides.get(element);
    if (!overrides) {
      overrides = new Map();
      this.currentOverrides.set(element, overrides);
    }
    if (trimmedVal === '') {
      overrides.delete(normalizedProp);
    } else {
      overrides.set(normalizedProp, trimmedVal);
    }

    this.trackedElements.add(element);
  }

  undo(): HTMLElement | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;

    const { element, property, previousValue, previousPriority } = entry;
    if (previousValue === '') {
      element.style.removeProperty(property);
    } else {
      element.style.setProperty(property, previousValue, previousPriority);
    }

    const overrides = this.currentOverrides.get(element);
    const orig = this.originals.get(element)?.get(property);
    if (overrides) {
      if (orig && orig.value === previousValue && orig.priority === previousPriority) {
        overrides.delete(property);
      } else if (previousValue === '') {
        overrides.delete(property);
      } else {
        overrides.set(property, previousValue);
      }
    }

    return element;
  }

  resetElement(element: HTMLElement): void {
    const elOriginals = this.originals.get(element);
    if (elOriginals) {
      for (const [prop, orig] of elOriginals.entries()) {
        if (orig.value === '') {
          element.style.removeProperty(prop);
        } else {
          element.style.setProperty(prop, orig.value, orig.priority);
        }
      }
    }
    this.originals.delete(element);
    this.currentOverrides.delete(element);
    this.trackedElements.delete(element);
    this.undoStack = this.undoStack.filter((item) => item.element !== element);
  }

  resetAll(): void {
    for (const element of Array.from(this.trackedElements)) {
      this.resetElement(element);
    }
    this.undoStack = [];
  }

  getOverrides(element: HTMLElement): Record<string, string> {
    const overrides = this.currentOverrides.get(element);
    if (!overrides) return {};
    return Object.fromEntries(overrides.entries());
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get overrideCount(): number {
    let count = 0;
    for (const el of this.trackedElements) {
      if (!el.isConnected) continue;
      count += this.currentOverrides.get(el)?.size ?? 0;
    }
    return count;
  }
}
