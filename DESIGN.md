# Rahul S. portfolio — cinematic reactive systems

## Sources and visual evidence

- **User-supplied screen recording** (`20261122-0430-50.3516176.mp4`): dark cobalt tiled space, a high-contrast hand as the focal object, floating rounded-square capability icons, bloom, depth, and continuous orbiting motion. This is the primary visual reference.
- **Codrops — “More Than a Portfolio”**: used as interaction research for treating the page as a sequence of composed scenes, mapping scroll progress to camera/object/type motion, and keeping mobile performance intentional. Source: https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/
- **Abhay Raj open-source portfolio (MIT)**: reviewed for the vocabulary of orbital motion, layered depth, section-by-section storytelling, and lazy rendering. No source code or branded assets are copied. Source: https://github.com/abhay-byte/threejs_portfolio
- **Existing SignalScope repository**: source of truth for project claims and interactive functionality. The debugger remains intact and becomes the portfolio’s featured live case study.

## Design direction

The portfolio should feel like entering a reactive system, not scrolling a stack of cards. The opening scene uses the supplied hand/orbit footage inside an original layered composition. A restrained electric-lime accent signals activity; violet and cobalt light create depth. Motion supports hierarchy: focal object first, headline second, proof and navigation third.

## Tokens

- Canvas: `#050608`
- Surface: `#0b0d10`
- Raised glass: `rgba(18, 21, 26, .72)`
- Text: `#f4f5f2`
- Muted: `#9ca3a8`
- Signal accent: `#d8ff5f`
- Reactive violet: `#9d82ff`
- Electric blue: `#67a5ff`
- Hairline: `rgba(255,255,255,.11)`
- Display type: Inter/Segoe UI fallback, tight tracking, large responsive clamp
- Mono labels: Cascadia Code/Consolas

## Layout and components

1. **Portfolio rail** — fixed glass header with Rahul identity, section anchors, and a direct “Open SignalScope” action.
2. **Hero scene** — full viewport; grid-space background, large headline, optimized looping reference video, orbit chips, cursor parallax, scroll cue.
3. **Signal strip** — continuous horizontal capability loop to carry motion between scenes.
4. **Featured build** — SignalScope case study with a live-looking dependency graph, truthful capability list, and launch action.
5. **How I work** — three cinematic capability scenes: product UI, reactive architecture, backend learning/labs.
6. **About/contact close** — direct role positioning, current travel-software context, GitHub and demo actions.
7. **SignalScope app** — original debugger UI remains available in its workspace, RxJS lab, and performance views.

## Motion system

- Hero video loops silently and is masked into the scene.
- CSS orbit chips rotate on separate durations and reverse directions.
- Pointer movement changes only two CSS variables, creating low-cost parallax.
- IntersectionObserver reveals sections once; no continuous layout reads.
- A fixed progress line communicates page position.
- `prefers-reduced-motion` disables looping, orbiting, parallax transitions, and marquee movement; the poster remains visible.

## Assets

- `public/media/orbit-hand.webm` — optimized, silent version of the supplied recording.
- `public/media/orbit-hand-poster.webp` — static fallback and reduced-motion poster.
- All icons, graph lines, chips, glows, and backgrounds are original CSS/SVG-like interface primitives; no third-party imagery is bundled.

## Responsive and performance guidance

- Desktop uses a split hero with the visual occupying the right half; mobile stacks content and crops the video safely.
- Avoid a WebGL dependency for this iteration. The supplied motion plus CSS transforms delivers the intended depth at roughly 1.1 MB of media.
- Animate only transform/opacity, defer the live debugger until requested, and keep all motion optional.

## Known gaps

- The portfolio intentionally exposes only the verified GitHub project link. Additional contact, LinkedIn, resume, employer names, and quantified impact should be added only after Rahul supplies or approves them.
