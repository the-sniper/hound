interface ImportedStep {
  type: string;
  description: string;
  config: Record<string, unknown>;
}

function extractQuotedString(raw: string): string {
  const m = raw.match(/^(['"`])([\s\S]*?)\1$/);
  return m ? m[2] : raw;
}

const patterns: {
  regex: RegExp;
  extract: (m: RegExpMatchArray) => ImportedStep | null;
}[] = [
  {
    regex: /page\.goto\(\s*(['"`])(.+?)\1/,
    extract: (m) => ({
      type: "NAVIGATE",
      description: `Navigate to ${m[2]}`,
      config: { url: m[2] },
    }),
  },
  {
    regex: /page\.locator\(\s*(['"`])(.+?)\1\s*\)\.click\(/,
    extract: (m) => ({
      type: "CLICK",
      description: `Click ${m[2]}`,
      config: { target: m[2] },
    }),
  },
  {
    regex: /page\.locator\(\s*(['"`])(.+?)\1\s*\)\.fill\(\s*(['"`])(.+?)\3\s*\)/,
    extract: (m) => ({
      type: "TYPE",
      description: `Type "${m[4]}" into ${m[2]}`,
      config: { target: m[2], value: m[4] },
    }),
  },
  {
    regex: /page\.waitForTimeout\(\s*(\d+)\s*\)/,
    extract: (m) => ({
      type: "WAIT",
      description: `Wait ${m[1]}ms`,
      config: { duration: parseInt(m[1], 10) },
    }),
  },
  {
    regex: /page\.waitForURL\(\s*(['"`])(.+?)\1\s*\)/,
    extract: (m) => ({
      type: "WAIT_FOR_URL",
      description: `Wait for URL matching ${m[2]}`,
      config: { urlPattern: m[2] },
    }),
  },
  {
    regex: /expect\(.*?page\.locator\(\s*(['"`])(.+?)\1\s*\)\s*\)\.toContainText\(\s*(['"`])(.+?)\3\s*\)/,
    extract: (m) => ({
      type: "ASSERT_TEXT",
      description: `Assert text "${m[4]}" is present`,
      config: { expectedText: m[4] },
    }),
  },
  {
    regex: /expect\(.*?page\.locator\(\s*(['"`])(.+?)\1\s*\)\s*\)\.toBeVisible\(/,
    extract: (m) => ({
      type: "ASSERT_ELEMENT",
      description: `Assert ${m[2]} is visible`,
      config: { target: m[2] },
    }),
  },
  {
    regex: /expect\(\s*page\s*\)\.toHaveScreenshot\(/,
    extract: () => ({
      type: "ASSERT_VISUAL",
      description: "Visual regression check",
      config: {},
    }),
  },
  {
    regex: /page\.evaluate\(\s*`([\s\S]*?)`\s*\)/,
    extract: (m) => ({
      type: "JAVASCRIPT",
      description: "Execute JavaScript",
      config: { code: m[1] },
    }),
  },
  {
    regex: /page\.evaluate\(\s*(['"])([\s\S]*?)\1\s*\)/,
    extract: (m) => ({
      type: "JAVASCRIPT",
      description: "Execute JavaScript",
      config: { code: m[2] },
    }),
  },
  {
    regex: /page\.screenshot\(/,
    extract: () => ({
      type: "SCREENSHOT",
      description: "Take screenshot",
      config: {},
    }),
  },
  {
    regex: /page\.locator\(\s*(['"`])(.+?)\1\s*\)\.hover\(/,
    extract: (m) => ({
      type: "HOVER",
      description: `Hover over ${m[2]}`,
      config: { target: m[2] },
    }),
  },
  {
    regex: /page\.locator\(\s*(['"`])(.+?)\1\s*\)\.selectOption\(\s*(['"`])(.+?)\3\s*\)/,
    extract: (m) => ({
      type: "SELECT",
      description: `Select "${m[4]}" in ${m[2]}`,
      config: { target: m[2], optionValue: m[4] },
    }),
  },
  {
    regex: /page\.keyboard\.press\(\s*(['"`])(.+?)\1\s*\)/,
    extract: (m) => ({
      type: "PRESS_KEY",
      description: `Press ${m[2]}`,
      config: { key: m[2] },
    }),
  },
  {
    regex: /page\.mouse\.wheel\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/,
    extract: (m) => {
      const dx = parseInt(m[1], 10);
      const dy = parseInt(m[2], 10);
      let direction: string;
      let amount: number;
      if (Math.abs(dy) >= Math.abs(dx)) {
        direction = dy >= 0 ? "down" : "up";
        amount = Math.abs(dy);
      } else {
        direction = dx >= 0 ? "right" : "left";
        amount = Math.abs(dx);
      }
      return {
        type: "SCROLL",
        description: `Scroll ${direction} ${amount}px`,
        config: { direction, amount },
      };
    },
  },
  {
    regex: /page\.context\(\)\.storageState\(/,
    extract: () => ({
      type: "SAVE_AUTH",
      description: "Save authentication state",
      config: {},
    }),
  },
  {
    regex: /page\.route\(\s*(['"`])(.+?)\1\s*,/,
    extract: (m) => ({
      type: "MOCK_ROUTE",
      description: `Mock route ${m[2]}`,
      config: { mockUrlPattern: m[2] },
    }),
  },
  {
    regex: /page\.unroute\(\s*(['"`])(.+?)\1\s*\)/,
    extract: (m) => ({
      type: "REMOVE_MOCK",
      description: `Remove mock for ${m[2]}`,
      config: { mockUrlPattern: m[2] },
    }),
  },
];

function extractDescriptionFromComment(
  lines: string[],
  lineIndex: number
): string | null {
  if (lineIndex <= 0) return null;
  const prev = lines[lineIndex - 1].trim();
  const commentMatch = prev.match(/^\/\/\s*(?:Step\s+\d+:\s*)?(.+)$/);
  return commentMatch ? commentMatch[1] : null;
}

export function importFromPlaywright(code: string): ImportedStep[] {
  const steps: ImportedStep[] = [];
  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("import ")) {
      continue;
    }

    for (const pattern of patterns) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const step = pattern.extract(match);
        if (step) {
          const commentDesc = extractDescriptionFromComment(lines, i);
          if (commentDesc) {
            step.description = commentDesc;
          }
          steps.push(step);
        }
        break;
      }
    }
  }

  return steps;
}
