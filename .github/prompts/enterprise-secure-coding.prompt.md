---
name: "Enterprise Secure Coding"
description: "Use when implementing or refactoring code to enterprise standards with a security recheck"
argument-hint: "Describe the coding task and constraints"
agent: "agent"
model: "GPT-5 (copilot)"
---
Implement the requested coding task using enterprise-level engineering standards and perform a final security recheck before finishing.

Requirements:
- Clarify the goal from the provided task text and inspect the existing codebase before editing.
- Preserve established project architecture, naming, and style conventions.
- Write maintainable, testable code with clear boundaries, strong typing, and robust error handling.
- Prefer small, safe changes that minimize regression risk.
- Add or update tests for new behavior and edge cases when tests exist.
- Validate data at trust boundaries and fail safely.
- Do not expose secrets, tokens, credentials, or sensitive internal details.

Security recheck (mandatory before final response):
- Check for injection risks (SQL, command, template, and script injection where relevant).
- Check authentication and authorization assumptions for modified paths.
- Check input validation, output encoding, and unsafe deserialization risks.
- Check file/path handling for traversal or unsafe filesystem access.
- Check dependency and configuration changes for insecure defaults.
- Summarize discovered risks and either fix them or clearly document remaining risk.

Final response format:
1. Solution summary
2. Files changed with concise rationale
3. Security recheck results
4. Verification run (tests, lint, build) and outcomes
5. Follow-up recommendations if needed
