import "@testing-library/jest-dom";

// Radix UI components (e.g. Checkbox) use ResizeObserver which is not
// available in the jsdom test environment.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
