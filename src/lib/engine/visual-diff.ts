import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export interface VisualDiffResult {
  matched: boolean;
  diffPercentage: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath?: string;
}

/**
 * Compare two screenshots and generate a diff image
 * @param baselinePath - Path to the baseline screenshot
 * @param currentPath - Path to the current screenshot
 * @param outputDir - Directory to save the diff image
 * @param threshold - Pixel matching threshold (0-1, lower is more strict)
 * @returns VisualDiffResult with comparison results
 */
export async function compareScreenshots(
  baselinePath: string,
  currentPath: string,
  outputDir: string,
  threshold = 0.1
): Promise<VisualDiffResult> {
  try {
    // Read both images
    const [baselineBuffer, currentBuffer] = await Promise.all([
      readFile(join(process.cwd(), "public", baselinePath)),
      readFile(join(process.cwd(), "public", currentPath)),
    ]);

    const baseline = PNG.sync.read(baselineBuffer);
    const current = PNG.sync.read(currentBuffer);

    // Check dimensions
    if (baseline.width !== current.width || baseline.height !== current.height) {
      // Resize images to match if dimensions differ
      const maxWidth = Math.max(baseline.width, current.width);
      const maxHeight = Math.max(baseline.height, current.height);

      const resizedBaseline = resizePNG(baseline, maxWidth, maxHeight);
      const resizedCurrent = resizePNG(current, maxWidth, maxHeight);

      return performDiff(resizedBaseline, resizedCurrent, outputDir, threshold);
    }

    return performDiff(baseline, current, outputDir, threshold);
  } catch (error) {
    console.error("Visual diff failed:", error);
    throw new Error(
      `Failed to compare screenshots: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Resize a PNG to the target dimensions
 */
function resizePNG(png: PNG, width: number, height: number): PNG {
  if (png.width === width && png.height === height) {
    return png;
  }

  const resized = new PNG({ width, height });

  // Simple nearest-neighbor resize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX = Math.floor((x / width) * png.width);
      const srcY = Math.floor((y / height) * png.height);

      const srcIdx = (srcY * png.width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;

      resized.data[dstIdx] = png.data[srcIdx];
      resized.data[dstIdx + 1] = png.data[srcIdx + 1];
      resized.data[dstIdx + 2] = png.data[srcIdx + 2];
      resized.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return resized;
}

/**
 * Perform the actual pixel comparison
 */
function performDiff(
  baseline: PNG,
  current: PNG,
  outputDir: string,
  threshold: number
): VisualDiffResult {
  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const diffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    {
      threshold,
      includeAA: true, // Include anti-aliased pixels
      alpha: 0.2, // Alpha for the diff mask
    }
  );

  const totalPixels = width * height;
  const diffPercentage = Math.round((diffPixels / totalPixels) * 10000) / 100;
  const matched = diffPixels === 0;

  // Save diff image
  const diffBuffer = PNG.sync.write(diff);
  const diffFilename = `diff-${Date.now()}.png`;
  const diffPath = join(outputDir, diffFilename);

  // Ensure directory exists
  mkdir(dirname(diffPath), { recursive: true }).then(() =>
    writeFile(diffPath, diffBuffer)
  );

  return {
    matched,
    diffPercentage,
    diffPixels,
    totalPixels,
    diffImagePath: diffPath.replace(process.cwd() + "/public", ""),
  };
}

/**
 * Check if a screenshot should be used as a baseline
 * A good baseline has: all steps passed, no errors, completed status
 */
export function isValidBaseline(runStatus: string, stepResults: { status: string }[]): boolean {
  if (runStatus !== "PASSED") return false;
  if (stepResults.length === 0) return false;
  return stepResults.every((step) => step.status === "PASSED");
}

/**
 * Generate a comparison summary between two runs
 */
export function generateComparisonSummary(
  baselineRunId: string,
  currentRunId: string,
  results: VisualDiffResult[]
): {
  totalCompared: number;
  matchedCount: number;
  diffCount: number;
  averageDiffPercentage: number;
  hasSignificantChanges: boolean;
} {
  const totalCompared = results.length;
  const matchedCount = results.filter((r) => r.matched).length;
  const diffCount = totalCompared - matchedCount;
  const averageDiffPercentage =
    results.length > 0
      ? Math.round(
          (results.reduce((sum, r) => sum + r.diffPercentage, 0) / results.length) * 100
        ) / 100
      : 0;
  const hasSignificantChanges = results.some((r) => r.diffPercentage > 5); // More than 5% difference

  return {
    totalCompared,
    matchedCount,
    diffCount,
    averageDiffPercentage,
    hasSignificantChanges,
  };
}
