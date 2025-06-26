// Mock for chalk module (ESM-only in tests)
const chalk = {
  cyan: (str: string) => str,
  gray: (str: string) => str,
  yellow: (str: string) => str,
  green: (str: string) => str,
  red: (str: string) => str,
  bold: {
    blue: (str: string) => str,
  },
};

export default chalk;