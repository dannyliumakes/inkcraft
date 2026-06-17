---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---
Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. Do not stop early or skip branches just because they seem minor — exhaustively cover every decision point, including edge cases, until nothing is left ambiguous.

Ask the questions one at a time.

For each question, present it as a tappable option list rather than plain text:
- Before showing options, write a short sentence of context/reasoning — this is 
  where your recommended answer's rationale goes.
- The question itself should be short and specific.
- Choose the option type based on the nature of the question:
  - single_select: when the choices are mutually exclusive (only one can be true)
  - multi_select: when multiple options could reasonably apply at once
  - rank_priorities: when the question is about ordering/prioritizing several factors
- Provide 2-4 options. Mark your recommended answer/ordering clearly 
  (e.g. "Option A (recommended): ...").
- Only fall back to plain-text questions when the answer requires free-form input 
  that can't be reduced to a few discrete choices (e.g. "what should this be named?").

After each answer, use it to inform the next question — follow up immediately on 
anything ambiguous or newly revealed before moving to the next branch.

If a question can be answered by exploring the codebase, explore the codebase instead.
