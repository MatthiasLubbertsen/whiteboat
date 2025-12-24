# Whiteboat 🛥️

Welcome to **Whiteboat**. It's like a whiteboard, but... wetter? No, wait. It's a whiteboard application that I named Whiteboat because typos are the mother of invention.

## What is this?

It's a canvas where you can draw things. It uses `perfect-freehand` so your shaky mouse drawings look like artistic masterpieces (or at least legible scribbles). It also has `tesseract.js`, which means it can probably read your handwriting better than your pharmacist can.

## Features

- **Draw Lines**: Obviously.
- **OCR Magic**: I use Tesseract to try and understand what you wrote. Good luck to the AI.
- **Konva Power**: I use Konva for the canvas stuff. It's like HTML5 Canvas but with a PhD.
- **Tailwind CSS**: Because writing actual CSS is so 2015.

## I don't like React

That's unfortunate, because this is a React app. It's like walking into a pizzeria and announcing you hate dough. I use hooks, I use components, and I probably re-render too much. But hey, at least it's not Angular 1.x, right? (Too soon?)

If you really hate React, you can try rewriting this in Vanilla JS. See you in 10 years when you finish implementing your own state management system.

## How to run this bad boy

Since we established I'm not using Docker, here is the highly complex, multi-step process to get this running:

1.  **Install dependencies** (The part where we download half the internet):
    ```bash
    npm install
    ```

2.  **Run the dev server** (The part where magic happens):
    ```bash
    npm run dev
    ```

3.  **Open your browser**:
    Usually at `http://localhost:5173`. If it's not there, check your terminal. I'm not a mind reader.

## Tech Stack

- **Vite**: Because waiting for Webpack is painful.
- **React**: Because I like components.
- **TypeScript**: Because I like red squiggly lines.
- **Shadcn UI**: Because I want it to look good without trying too hard.

## Contributing

If you want to add features, fix bugs, or just rename everything to "WhiteyMcWhiteboardFace", feel free to open a PR. Just don't sink the boat.

## License

This project is **source-available**. That means you can look at the code, you can learn from the code, and you can definitely fix the bugs in the code (please?).

But you **cannot** steal the code, repackage it, and sell it as "WhiteyMcWhiteboardFace Enterprise Edition".

In short: Look, but don't touch (unless you're submitting a PR).

For the legal mumbo-jumbo, see the [LICENSE.md](LICENSE.md) file.

---

*Made with ❤️ by a developer who is 13 years old.*