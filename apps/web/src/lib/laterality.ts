export type StudySide = 'left' | 'right';

export type LateralityWarning = {
  code: 'opposite_side_mentioned';
  studySide: StudySide;
  mentionedSide: StudySide;
  message: string;
};

const STUDY_SIDE_PATTERN = /^(left|right)\b/i;
const BILATERAL = /\b(bilateral|bilaterally|both sides)\b/i;

const oppositeSide: Record<StudySide, StudySide> = {
  left: 'right',
  right: 'left'
};

export const parseStudySide = (bodyPart: string): StudySide | null => {
  const match = bodyPart.trim().match(STUDY_SIDE_PATTERN);
  const side = match?.[1];
  if (!side) {
    return null;
  }
  return side.toLowerCase() as StudySide;
};

export const extractReportPlainText = (root: unknown): string => {
  const parts: string[] = [];

  const walk = (node: unknown) => {
    if (typeof node !== 'object' || node === null) {
      return;
    }

    const record = node as Record<string, unknown>;
    if (record.type === 'text' && typeof record.text === 'string') {
      parts.push(record.text);
    }

    if (record.type === 'keyImage' && typeof record.attrs === 'object' && record.attrs !== null) {
      const caption = (record.attrs as Record<string, unknown>).caption;
      if (typeof caption === 'string' && caption.length > 0) {
        parts.push(caption);
      }
    }

    if (Array.isArray(record.content)) {
      for (const child of record.content) {
        walk(child);
      }
    }
  };

  walk(root);
  return parts.join(' ');
};

export const checkLaterality = (bodyPart: string, reportText: string): LateralityWarning | null => {
  const studySide = parseStudySide(bodyPart);
  if (!studySide) {
    return null;
  }

  const normalized = reportText.trim();
  if (normalized.length === 0) {
    return null;
  }

  if (BILATERAL.test(normalized)) {
    return null;
  }

  const conflict = oppositeSide[studySide];
  const conflictPattern = new RegExp(`\\b${conflict}\\b`, 'i');
  if (!conflictPattern.test(normalized)) {
    return null;
  }

  return {
    code: 'opposite_side_mentioned',
    studySide,
    mentionedSide: conflict,
    message: `This study is for the ${studySide} side, but the report mentions "${conflict}". Confirm the wording before signing.`
  };
};

export const checkReportLaterality = (
  bodyPart: string,
  content: unknown
): LateralityWarning | null => {
  return checkLaterality(bodyPart, extractReportPlainText(content));
};
