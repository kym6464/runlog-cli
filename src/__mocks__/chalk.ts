// Mock for chalk module (ESM-only in tests)
const chalk: any = {
  cyan: (str: string) => str,
  gray: (str: string) => str,
  yellow: (str: string) => str,
  green: (str: string) => str,
  red: (str: string) => str,
  white: (str: string) => str,
  blue: (str: string) => str,
  magenta: (str: string) => str,
  dim: (str: string) => str,
  bold: {
    blue: (str: string) => str,
    yellow: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    cyan: (str: string) => str,
    gray: (str: string) => str,
    white: (str: string) => str,
    magenta: (str: string) => str,
  },
};

// Make properties chainable
Object.keys(chalk).forEach(key => {
  if (typeof chalk[key] === 'function') {
    Object.keys(chalk).forEach(subKey => {
      if (key !== subKey) {
        chalk[key][subKey] = chalk[subKey];
      }
    });
    // Also add bold property to each color
    chalk[key].bold = chalk.bold;
  }
});

export default chalk;