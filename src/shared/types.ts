export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModel {
  width: number;
  height: number;
  margin: BoxSpacing;
  padding: BoxSpacing;
  border: BoxSpacing;
}

export interface DomBreadcrumbNode {
  selector: string;
  label: string;
  isCurrent?: boolean;
}

export interface ContrastInfo {
  foreground: string;
  background: string;
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

export interface ElementSnapshot {
  selector: string;
  tagName: string;
  id: string;
  classes: string[];
  textPreview: string;
  boxModel: BoxModel;
  computed: Record<string, string>;
  inlineOverrides: Record<string, string>;
  breadcrumbs: DomBreadcrumbNode[];
  children: DomBreadcrumbNode[];
  contrast: ContrastInfo | null;
}

export interface ColorToken {
  value: string;
  hex: string;
  count: number;
  usages: ('text' | 'background' | 'border')[];
}

export interface FontToken {
  family: string;
  weights: string[];
  sizes: string[];
  count: number;
}

export interface PageTokens {
  url: string;
  title: string;
  colors: ColorToken[];
  fonts: FontToken[];
  spacing: string[];
  radii: string[];
  shadows: string[];
  cssVariables: Array<{ name: string; value: string }>;
}

export type AssetKind = 'image' | 'svg' | 'video' | 'audio' | 'background';

export interface ExtractedAsset {
  id: string;
  kind: AssetKind;
  url: string;
  svgMarkup?: string;
  width?: number;
  height?: number;
  label: string;
}

export type CodeExportFormat = 'html-css' | 'tailwind' | 'react-tailwind';

export interface CodeExportResult {
  format: CodeExportFormat;
  code: string;
  css?: string;
  previewHtml: string;
  viewportWidth?: number;
}

export interface PageSectionInfo {
  selector: string;
  tagName: string;
  label: string;
  textPreview: string;
  width: number;
  height: number;
  childCount: number;
}

export interface ContrastIssue {
  selector: string;
  label: string;
  ratio: number;
  foreground: string;
  background: string;
}

export interface FullPageScanResult {
  url: string;
  title: string;
  totalElements: number;
  sections: PageSectionInfo[];
  tokens: PageTokens;
  assets: ExtractedAsset[];
  contrastIssues: ContrastIssue[];
}

export interface InspectorStateResponse {
  inspecting: boolean;
  snapshot: ElementSnapshot | null;
  canUndo: boolean;
  overrideCount: number;
}

export type ExtensionMessage =
  | { type: 'SET_INSPECTING'; tabId?: number; enabled: boolean }
  | { type: 'GET_STATE'; tabId?: number }
  | { type: 'SELECT_BY_SELECTOR'; tabId?: number; selector: string }
  | { type: 'HIGHLIGHT_SELECTOR'; tabId?: number; selector: string | null }
  | { type: 'APPLY_STYLE'; tabId?: number; selector: string; property: string; value: string }
  | { type: 'UNDO_STYLE'; tabId?: number }
  | { type: 'RESET_STYLES'; tabId?: number; selector?: string }
  | { type: 'EXTRACT_TOKENS'; tabId?: number }
  | { type: 'EXTRACT_ASSETS'; tabId?: number }
  | { type: 'SCAN_FULL_PAGE'; tabId?: number }
  | { type: 'EXPORT_CODE'; tabId?: number; selector?: string; format: CodeExportFormat }
  | { type: 'DOWNLOAD_ASSET'; url: string; filename: string }
  | {
      type: 'INSPECTOR_STATUS_CHANGED';
      tabId?: number;
      inspecting: boolean;
      canUndo: boolean;
      overrideCount: number;
    }
  | {
      type: 'ELEMENT_SELECTED';
      tabId?: number;
      snapshot: ElementSnapshot | null;
      canUndo: boolean;
      overrideCount: number;
    };
