import { z } from 'zod';

const maxDocumentDepth = 12;
const maxDocumentNodes = 2000;
const maxCaptionLength = 240;
const maxTextLength = 10_000;

const nodeTypes = [
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'keyImage'
] as const;

const nodeTypeSet = new Set<string>(nodeTypes);

export class ReportDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportDocumentError';
  }
}

export type ReportNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ReportNode[];
  text?: string;
  marks?: Array<{ type: string }>;
};

type ParsedReportDocument = {
  content: ReportNode;
  imageIds: string[];
  hasText: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const allowedKeys = new Set(['type', 'attrs', 'content', 'text', 'marks']);

const assertKeys = (node: Record<string, unknown>) => {
  for (const key of Object.keys(node)) {
    if (!allowedKeys.has(key)) {
      throw new ReportDocumentError(`Report nodes cannot include "${key}".`);
    }
  }
};

const assertAttrs = (node: Record<string, unknown>, allowed: string[]) => {
  if (node.attrs === undefined) {
    return;
  }

  if (!isRecord(node.attrs)) {
    throw new ReportDocumentError('Node attributes must be an object.');
  }

  const allowedSet = new Set(allowed);
  for (const key of Object.keys(node.attrs)) {
    if (!allowedSet.has(key)) {
      throw new ReportDocumentError(`Unexpected attribute "${key}".`);
    }
  }
};

const readKeyImage = (node: Record<string, unknown>, imageIds: string[], seen: Set<string>) => {
  assertAttrs(node, ['imageId', 'caption']);
  const attrs = node.attrs;
  if (!isRecord(attrs)) {
    throw new ReportDocumentError('A key image needs an image id.');
  }

  const imageId = z.string().uuid().safeParse(attrs.imageId);
  if (!imageId.success) {
    throw new ReportDocumentError('A key image needs a valid image id.');
  }

  const caption = attrs.caption ?? '';
  if (typeof caption !== 'string' || caption.length > maxCaptionLength) {
    throw new ReportDocumentError(
      `A key image caption must be ${maxCaptionLength} characters or fewer.`
    );
  }

  if (seen.has(imageId.data)) {
    throw new ReportDocumentError('The same image can only be placed once in a report.');
  }

  seen.add(imageId.data);
  imageIds.push(imageId.data);

  if (node.content !== undefined) {
    throw new ReportDocumentError('A key image cannot contain other nodes.');
  }
};

export const parseReportDocument = (input: unknown): ParsedReportDocument => {
  if (!isRecord(input) || input.type !== 'doc') {
    throw new ReportDocumentError('Report content must be a document.');
  }

  const imageIds: string[] = [];
  const seen = new Set<string>();
  let hasText = false;
  let nodes = 0;
  const stack: Array<{ value: unknown; depth: number }> = [{ value: input, depth: 1 }];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) {
      break;
    }

    nodes += 1;
    if (nodes > maxDocumentNodes) {
      throw new ReportDocumentError('Report content has too many nodes.');
    }
    if (frame.depth > maxDocumentDepth) {
      throw new ReportDocumentError('Report content is nested too deeply.');
    }
    if (!isRecord(frame.value) || typeof frame.value.type !== 'string') {
      throw new ReportDocumentError('Every report node needs a type.');
    }
    if (!nodeTypeSet.has(frame.value.type)) {
      throw new ReportDocumentError(`"${frame.value.type}" is not allowed in a report.`);
    }

    const node = frame.value;
    assertKeys(node);

    if (node.type === 'text') {
      if (typeof node.text !== 'string' || node.text.length > maxTextLength) {
        throw new ReportDocumentError('Report text is missing or too long.');
      }
      if (node.text.trim().length > 0) {
        hasText = true;
      }
      if (node.content !== undefined) {
        throw new ReportDocumentError('A text node cannot contain other nodes.');
      }
    }

    if (node.type === 'heading') {
      assertAttrs(node, ['level']);
      const level = isRecord(node.attrs) ? node.attrs.level : undefined;
      if (level !== 1 && level !== 2 && level !== 3) {
        throw new ReportDocumentError('Headings must be level 1, 2, or 3.');
      }
    }

    if (node.type === 'keyImage') {
      readKeyImage(node, imageIds, seen);
    } else if (node.attrs !== undefined && node.type !== 'heading') {
      throw new ReportDocumentError(`"${node.type}" cannot have attributes.`);
    }

    if (node.marks !== undefined) {
      if (node.type !== 'text' || !Array.isArray(node.marks)) {
        throw new ReportDocumentError('Only text can be bold or italic.');
      }
      for (const mark of node.marks) {
        if (!isRecord(mark) || (mark.type !== 'bold' && mark.type !== 'italic')) {
          throw new ReportDocumentError('Only bold and italic formatting are allowed.');
        }
      }
    }

    if (node.content !== undefined && node.type !== 'keyImage' && node.type !== 'text') {
      if (!Array.isArray(node.content)) {
        throw new ReportDocumentError('Node children must be a list.');
      }
      for (let index = node.content.length - 1; index >= 0; index -= 1) {
        stack.push({ value: node.content[index], depth: frame.depth + 1 });
      }
    }
  }

  return { content: input as ReportNode, imageIds, hasText };
};

export const hasReportSubstance = (document: ParsedReportDocument) => {
  return document.hasText || document.imageIds.length > 0;
};
