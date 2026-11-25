import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

const emptyRect = () =>
  ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON() {
      return {};
    }
  }) as DOMRect;

Range.prototype.getBoundingClientRect = emptyRect;
Range.prototype.getClientRects = () => {
  const rect = emptyRect();
  return {
    length: 1,
    item: () => rect,
    *[Symbol.iterator]() {
      yield rect;
    }
  } as unknown as DOMRectList;
};

Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
