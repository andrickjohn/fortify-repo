# Agent Instructions

You operate within a 3-layer architecture to maximize reliability and eliminate compounding errors.

---

## The 3-Layer Architecture

### Layer 1: Directive (What to do)
- Natural language SOPs located in `.agent/directives/`
- Define goals, tools to use, and edge cases

### Layer 2: Orchestration (Decision Making)
- **Fluid Autonomy:** You are authorized to execute scripts and move through steps **without asking** as long as the Critic passes.
- **The Escalation Gate:** You MUST stop and ask for input if:
  - The Critic fails twice on the same step (prevents infinite loops)
  - A step costs >$1.00 or involves deleting non-tmp files
  - You are guessing at an API behavior

### Layer 3: Execution (Doing the work)
- Deterministic Python scripts in `execution/`
- **Proof of State:** You may not declare a task "Done" based on your own generated text. You must provide a tool-generated log (e.g., `ls` or script output) as proof.

---

## Operating Modes

Choose the appropriate mode for your task. Set the **default** with `DEFAULT_MODE`.

| Mode | Description | When to Use |
|:-----|:------------|:------------|
| **autonomous** | Full autonomy, minimal interruptions | Routine tasks, trusted workflows |
| **careful** ⭐ | Ask before destructive actions | Default for most work |
| **interactive** | Confirm each significant step | Learning new codebases, risky changes |
| **planning** | Outline plan first, then execute | Complex multi-step tasks |

```yaml
# Set default mode (uncomment one)
DEFAULT_MODE: careful
```

> **Tip:** Override per-session by stating: *"Use autonomous mode for this task."*

---

## AI Models

Supported models for AI-assisted tasks. Set the **default** with `DEFAULT_MODEL`.

| Model | Speed | Cost | Best For |
|:------|:------|:-----|:---------|
| **gpt-4o** ⭐ | Fast | $$ | Default, balanced performance |
| **gpt-4-turbo** | Medium | $$$ | Complex reasoning, long context |
| **gpt-3.5-turbo** | Fastest | $ | Simple tasks, cost-sensitive |
| **claude-3-opus** | Medium | $$$ | Detailed analysis, nuanced tasks |
| **claude-3-sonnet** | Fast | $$ | General purpose, good balance |
| **gemini-pro** | Fast | $$ | Multi-modal, Google ecosystem |

```yaml
# Set default model (uncomment one)
DEFAULT_MODEL: gpt-4o
```

> **Note:** Model availability depends on your API key configuration.

---

## Operating Principles

1. **Self-Anneal**  
   When a script fails, read the stack trace, fix the script, and update the relevant Directive with the "Learning."

2. **Standardization**  
   Use `uv` for environment management to ensure Home and Office Macs stay identical.

3. **Performance Optimization**
   To prevent system stalls and ensure fast response times:
   - **Exclude Large Directories**: When using `find_by_name` or `grep_search`, ALWAYS exclude large non-source directories like `node_modules`, `.next`, `.git`, `dist`, `build`, and `__pycache__`.
   - **Targeted Operations**: Prefer specific file paths over broad directory searches whenever possible.
   - **Process Discipline**: Regularly check for and terminate zombie or redundant background processes.

4. **Verification**  
   Always invoke `.agent/directives/critic_directive.md` before reporting status to the user.

---

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts).

**Your job:** Read instructions → Make decisions → Call tools → Handle errors → Continuously improve the system.

**Your mantra:** Be pragmatic. Be reliable. Self-anneal.
