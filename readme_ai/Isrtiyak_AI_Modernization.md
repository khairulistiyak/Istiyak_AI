# Istiyak AI - UI/UX Architecture & Modernization Plan

## 1. Architectural Integrity (Maintaining Existing Logic)

To ensure the existing logic (API streaming, auto-routing, provider switching) remains fully functional, we are adopting a **component-based enhancement approach**.

- **Logic Preservation:** All backend services in `aiService.ts` and state management will remain untouched.
- **Encapsulation:** All new styles will be applied via CSS classes (Tailwind) or scoped CSS modules to prevent style leakage into logic-heavy components.
- **Data Integrity:** The `Message` interface and `settings` object remain the source of truth; UI changes will only impact how this data is rendered (Presentation Layer).

## 2. ChatGPT-Inspired UI Blueprint

### Layout Structure (ChatWindow.tsx)

- **Sidebar:** Collapsible container using `fixed` or `absolute` positioning.
  - _Tech:_ `flex-shrink-0` to maintain width.
- **Main Chat Area:** Full-height container with `flex-grow`.
  - _Tech:_ `overflow-y-auto` for natural scrolling.
- **Input Area:** Pinned to the bottom of the main chat area with a subtle `backdrop-blur`.

### Styling Strategy (Tailwind CSS)

- **Primary Colors:**
  - Background: `bg-[#343541]`
  - Sidebar: `bg-[#202123]`
  - Message Bubbles: `bg-[#444654]` (for AI), Transparent (for User)
- **Typography:** `font-sans` with `text-slate-200` for high readability.

## 3. Implementation Roadmap

1.  **Phase 1 (Layout):** Implement a flexbox layout to divide Sidebar and Chat Area without modifying state logic.
2.  **Phase 2 (Components):** Refactor the chat bubble rendering to use a reusable `MessageBubble` component.
3.  **Phase 3 (Polishing):** Integrate `react-markdown` for clean code/text rendering, ensuring `code` blocks maintain syntax highlighting via `highlight.js`.

## 4. Safety & Performance

- **Zero Logic Impact:** By strictly keeping design in JSX/Tailwind classes, logic remains isolated.
- **Responsive Handling:** Use `hidden` to `md:flex` classes to ensure the UI behaves well on different screen sizes without crashing the app.
