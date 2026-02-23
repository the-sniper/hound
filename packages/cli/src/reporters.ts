interface RunResult {
  id: string;
  status: string;
  duration: number | null;
  test: { id: string; name: string };
  results: {
    status: string;
    duration: number | null;
    error: string | null;
    step: {
      orderIndex: number;
      type: string;
      description: string;
    };
  }[];
}

export function formatJson(results: RunResult[]): string {
  return JSON.stringify(
    {
      summary: {
        total: results.length,
        passed: results.filter((r) => r.status === "PASSED").length,
        failed: results.filter((r) => r.status === "FAILED").length,
        errors: results.filter((r) => r.status === "ERROR").length,
      },
      runs: results.map((r) => ({
        id: r.id,
        test: r.test.name,
        status: r.status,
        duration: r.duration,
        steps: r.results.map((s) => ({
          step: s.step.orderIndex + 1,
          type: s.step.type,
          description: s.step.description,
          status: s.status,
          duration: s.duration,
          error: s.error,
        })),
      })),
    },
    null,
    2
  );
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatJunit(results: RunResult[]): string {
  const totalTests = results.length;
  const failures = results.filter((r) => r.status === "FAILED").length;
  const errors = results.filter((r) => r.status === "ERROR").length;
  const totalTime =
    results.reduce((sum, r) => sum + (r.duration || 0), 0) / 1000;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<testsuites tests="${totalTests}" failures="${failures}" errors="${errors}" time="${totalTime.toFixed(3)}">\n`;
  xml += `  <testsuite name="hound" tests="${totalTests}" failures="${failures}" errors="${errors}" time="${totalTime.toFixed(3)}">\n`;

  for (const run of results) {
    const time = ((run.duration || 0) / 1000).toFixed(3);
    xml += `    <testcase name="${escapeXml(run.test.name)}" classname="hound" time="${time}">\n`;

    if (run.status === "FAILED") {
      const failedSteps = run.results.filter((r) => r.status === "FAILED");
      for (const step of failedSteps) {
        xml += `      <failure message="${escapeXml(step.error || "Test failed")}" type="AssertionError">\n`;
        xml += `        Step ${step.step.orderIndex + 1} [${step.step.type}]: ${escapeXml(step.step.description)}\n`;
        if (step.error)
          xml += `        Error: ${escapeXml(step.error)}\n`;
        xml += `      </failure>\n`;
      }
    } else if (run.status === "ERROR") {
      xml += `      <error message="Test execution error" type="Error" />\n`;
    }

    xml += `    </testcase>\n`;
  }

  xml += `  </testsuite>\n`;
  xml += `</testsuites>\n`;
  return xml;
}
