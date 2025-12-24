# Whiteboat 🛥️

Welcome to **Whiteboat**. It's like a whiteboard, but... wetter? No, wait. It's a whiteboard application that we named Whiteboat because typos are the mother of invention.

## What is this?

It's a canvas where you can draw things. It uses `perfect-freehand` so your shaky mouse drawings look like artistic masterpieces (or at least legible scribbles). It also has `tesseract.js`, which means it can probably read your handwriting better than your pharmacist can.

## Features

- **Draw Lines**: Obviously.
- **OCR Magic**: We use Tesseract to try and understand what you wrote. Good luck to the AI.
- **Konva Power**: We use Konva for the canvas stuff. It's like HTML5 Canvas but with a PhD.
- **Tailwind CSS**: Because writing actual CSS is so 2015.

## I don't like Docker

Look, I get it. Docker is great for "production" and "scalability" and "making sure it works on my machine and yours." But honestly? I just want to run `npm run dev` and see the thing work.

I don't want to write a Dockerfile. I don't want to debug volume mounts. I don't want to wonder why the container can't talk to the host.

So, there is no Dockerfile here. This is a **Free Range Application**. It runs on the bare metal of your OS (well, on top of Node, which is on top of V8, which is on top of C++, which is compiled into assembly, which runs on an operating system, which runs on a kernel, which runs on firmware, which runs on silicon, which is made of atoms, which are mostly empty space… you get the point).

If you want to containerize this, you're on your own, captain. 🫡

## How to run this bad boy

Since we established we aren't using Docker, here is the highly complex, multi-step process to get this running:

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
- **React**: Because we like components.
- **TypeScript**: Because we like red squiggly lines.
- **Shadcn UI**: Because we want it to look good without trying too hard.

## Contributing

If you want to add features, fix bugs, or just rename everything to "WhiteyMcWhiteboardFace", feel free to open a PR. Just don't sink the boat.

---

*Made with ❤️ and ☕ (and no Docker containers).*
