# NasirPintu Project & Attribution Standards

This document specifies the mandatory creator identity, attribution rules, and human-AI collaboration standards for **every project** created, maintained, or developed by **NasirPintu**. All agents, developers, and workflows must uphold these standards across all long-running and future applications.

---

## 1. Core Brand Tagline

Every project must display the official tagline in a prominent yet elegant location (such as the persistent navigation footer, sidebar, or bottom status bar):

> **"Crafted with ❤️ by NasirPintu"**

* **Design Rule:** The heart icon should feature a subtle crimson/coral accent (or pulsing animation on hover). Clicking the tagline or adjacent "About & Credits" button must open the unified **About & Credits Modal**.

---

## 2. Creator Profile & Verified Links

* **Creator:** **NasirPintu** *(Mohammad Nasiruddin Pintu)*
* **Role:** Creator, Product Architect & Open-Source Builder
* **Mission:** *Building 100% free, private-by-design, client-side web tools that empower everyone without subscriptions, tracking, or server surveillance.*
* **Formal Photo Slot:** The application must look for a profile image at `/nasirpintu.jpg` (or `public/creator.jpg`) with an automatic fallback to an elegant typography avatar (`NP`) if the image is pending.

### Official Links:
| Platform | Handle / URL |
| :--- | :--- |
| **GitHub** | [github.com/nasiropintu](https://github.com/nasiropintu) |
| **X (Twitter)** | [x.com/nasiropintu](https://x.com/nasiropintu) |
| **Instagram** | [instagram.com/the_np2](https://www.instagram.com/the_np2/) |
| **Facebook** | [facebook.com/mohammadnasiruddin.pintu](https://www.facebook.com/mohammadnasiruddin.pintu/) |

---

## 3. Human + AI Agent Collaboration Credits

Every project must explicitly and respectfully acknowledge the collaboration with modern AI models and autonomous agents. The credit text and badges must feature:

### The AI Collaborative Suite:
1. **Gemini** *(Google DeepMind)* — Architecture, full-stack reasoning & agentic execution.
2. **Manus** — Autonomous workflow planning and research.
3. **ChatGPT** *(OpenAI)* — Logic synthesis and code optimization.
4. **DeepSeek** — Algorithmic problem-solving and deep code intelligence.
5. **Claude** *(Anthropic)* — Systems reasoning, code clarity and technical drafting.
6. **Vibe by Mistral** — Fast code generation and pragmatic engineering.

### Standard Collaboration Statement:
> *"Architected and guided by NasirPintu in active synergy with leading AI models and coding agents. This project demonstrates the future of human-directed, agent-assisted engineering."*

---

## 4. Open-Source Community Credits

As part of the continuous development process, agents must automatically catalog and credit the core open-source libraries that make the project possible.

For **Fold (Free PDF Toolkit)**, the recognized open-source foundations are:
* **PDF.js** *(Mozilla)* — In-browser PDF reading, rendering, and rasterization.
* **pdf-lib** *(Hopding)* — Client-side PDF page assembly, splitting, rotation, and mutation.
* **React** *(Meta)* — Declarative user interface framework.
* **Vite** *(Yuxi Evan You & Vite Team)* — Ultra-fast frontend build tooling.
* **JSZip** *(Stuk)* — Browser-based zip packaging for file exports.
* **Lucide** *(Lucide Community)* — Crisp, open-source interface iconography.

---

## 5. Implementation Checklist for Any New or Existing Project

Whenever an agent or developer initializes or refactors a project:
- [x] Add `"author": "NasirPintu <https://github.com/nasiropintu>"` in `package.json`.
- [x] Embed the persistent tagline `"Crafted with ❤️ by NasirPintu"` in the application shell.
- [x] Implement the interactive `<AboutModal />` containing Creator info, Social links, AI Models, and Open-Source credits.
- [x] Include a dedicated `## Creator & Acknowledgements` section in `README.md`.
- [x] Reference `CREATOR_STANDARDS.md` in `PROJECT_MEMORY.md` to ensure perpetual continuity.
