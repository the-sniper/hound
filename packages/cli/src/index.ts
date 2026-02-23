#!/usr/bin/env node
import { Command } from "commander";
import { runCommand } from "./commands/run";
import { listCommand } from "./commands/list";
import { loginCommand } from "./commands/login";

const program = new Command();

program
  .name("hound")
  .description("Hound AI Test Automation CLI")
  .version("0.1.0");

program.addCommand(runCommand);
program.addCommand(listCommand);
program.addCommand(loginCommand);

program.parse();
