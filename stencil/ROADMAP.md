# Stencil: Development Roadmap & Blueprint

## 🌟 Core Philosophy
**"Removing the Training Wheels, Spoke by Spoke."**  
The ultimate goal of *Stencil* is to foster independent writing capability. The system should not simply be a passive traversal tool; it must be an **active development engine** that observes the child's motor skills and adapts in real-time. It retreats to offer support when they struggle and fades away when they succeed, ensuring confidence is always high while competence grows.

---

## 🚀 1. The Adaptive Progression Engine
The game will evolve from a static complexity setting to a dynamic **competency-based loop**.

### Concept
The system tracks two key metrics per letter:
1.  **Accuracy (A)**: Precision of the stroke (how well they stayed within the halo).
2.  **Velocity (B)**: Time taken to complete the letter compared to a baseline.

### Progression Tiers
1.  **Pre-Beginner (Remedial)**:
    *   *Trigger*: Repeated low accuracy or frustration.
    *   *Content*: Single Block Letters (no words).
    *   *Aids*: Massive tolerance, maximum visual opacity.
2.  **Beginner (Current State)**:
    *   *Content*: CVC Words (Cat, Dog, Run).
    *   *Aids*: Standard guides, High tolerance.
3.  **Intermediate (Fading)**:
    *   *Content*: Longer words.
    *   *Aids*: **Dynamic Fading** (see below) kicks in.
4.  **Masters (Invisible)**:
    *   *Content*: Sentences or complex vocabulary.
    *   *Aids*: nearly invisible guides; relies on muscle memory.

---

## 🎨 2. Dynamic Visual Aids (The "Fading" Mechanic)
Visual cues should evolve with the student's skill.

### Directional Tracing (Phase 1)
*   **Start Dots**: A clear green dot indicating *where* to place the pen.
*   **Arrows**: Motion guides showing the direction of the stroke (e.g., "Down, then across").
*   **Segmenting**: Highlighting only the *current* stroke to reduce cognitive load.

### Gradient Fading (Phase 2+)
*   **Concept**: As the student proves mastery of a letter (e.g., 'A'), the stencil for that specific letter becomes lighter.
*   **Technical Spec**:
    *   `LETTER_MASTERY = { 'A': 0.8, 'B': 0.2, ... }`
    *   Render opacity: `ctx.strokeStyle = \`rgba(0,0,0, \${1.0 - mastery})\``
    *   If they fail, opacity instantly returns to 100% (Safety Net).

---

## 🎯 3. Targeted Skill Building (Reversals & Drills)
Specific logic to handle common developmental hurdles (e.g., Dyslexia-style reversals).

### The "Focus List"
*   **Parent Control**: A settings panel to manually select "Focus Characters" (e.g., `b`, `d`, `S`, `7`).
*   **The "Sprinkle" Algorithm**: The game engine will forcibly inject these characters into the rotation (e.g., 30% of words must contain a focus letter), ensuring practice is frequent but not monotonous.

### Reversal Detection (Technical Spec)
*   **Problem**: Identifying when a child writes 'b' instead of 'd'.
*   **Solution**: Since our validation is vector-based, we can define "Anti-Paths" (invisibly mapped wrong answers). If the user traces the "Anti-Path" (the backwards letter) with high accuracy, the system flags a **Specific Correction Event**: *"Oops! You wrote a 'd'. Let's try 'b' again!"*

---

## 📝 4. Content Expansion
*   **Lowercase Alphabet (`a-z`)**: Critical for the `b` vs `d` logic. Needs high-res vector paths.
*   **Numbers (`0-9`)**: Essential for the `S` vs `7` focus.
*   **Cursive Support**: The end-game content. Requires continuous Bezier paths and a different connection logic (joining letters).

---

## 🏗️ Technical Architecture Specs
To support these features, the codebase must evolve:

1.  **Persistence Layer**:
    *   Use `localStorage` to save `STUDENT_PROFILE`.
    *   Track `mastery_score` for every char `A-Z`.
2.  **Vector Path Upgrade**:
    *   Current: `[Line, Line]`.
    *   Future: `[ { type: 'arc', ...}, { type: 'line', ...}, { direction: 'cw' } ]`. Needs metadata for stroke direction guidelines.
3.  **Analytics Module**:
    *   Background worker that calculates `WPM` (Words Per Minute) and `Error Rate`.

---

## 🔮 Roadmap Summary
*   [x] **v1.0**: Prototype Engine (Vector Tracing, Halo, Round Loop) - **COMPLETE**
*   [ ] **v1.1**: Lowercase & Numbers (Data Entry)
*   [ ] **v1.2**: Directional Guides (Start Dots & Arrows)
*   [ ] **v2.0**: The "Profile" Update (Save progress, Mastery tracking)
*   [ ] **v2.1**: The Fading Update (Dynamic Opacity based on mastery)
*   [ ] **v3.0**: Diagnostic Mode (Reversal detection & Specific Drills)
