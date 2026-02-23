import { Command } from "commander";
import { apiRequest } from "../client";

interface Project {
  id: string;
  name: string;
  baseUrl: string;
}

interface Test {
  id: string;
  name: string;
  status: string;
  _count: { steps: number; runs: number };
}

export const listCommand = new Command("list").description(
  "List projects and tests"
);

listCommand
  .command("projects")
  .description("List all projects")
  .action(async () => {
    try {
      const projects = await apiRequest<Project[]>("GET", "/projects");
      if (projects.length === 0) {
        console.log("No projects found.");
        return;
      }
      console.log("\nProjects:");
      console.log("─".repeat(60));
      for (const p of projects) {
        console.log(`  ${p.name}`);
        console.log(`    ID:  ${p.id}`);
        console.log(`    URL: ${p.baseUrl}`);
        console.log();
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(2);
    }
  });

listCommand
  .command("tests")
  .description("List tests in a project")
  .requiredOption("--project <id>", "Project ID")
  .action(async (options) => {
    try {
      const tests = await apiRequest<Test[]>(
        "GET",
        `/tests?projectId=${options.project}`
      );
      if (tests.length === 0) {
        console.log("No tests found.");
        return;
      }
      console.log("\nTests:");
      console.log("─".repeat(60));
      for (const t of tests) {
        const statusIcon =
          t.status === "ACTIVE"
            ? "●"
            : t.status === "DRAFT"
              ? "○"
              : "◌";
        console.log(
          `  ${statusIcon} ${t.name} (${t._count.steps} steps, ${t._count.runs} runs)`
        );
        console.log(`    ID: ${t.id}  Status: ${t.status}`);
        console.log();
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(2);
    }
  });
