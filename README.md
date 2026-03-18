![Status](https://img.shields.io/badge/status-active-brightgreen?style=for-the-badge)

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)
![HTML5](https://img.shields.io/badge/HTML5-Markup-orange?style=for-the-badge&logo=html5)
![Canvas](https://img.shields.io/badge/Canvas-2D%20Rendering-blue?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Utility%20First-38B2AC?style=for-the-badge&logo=tailwindcss)

## Idea

Instead of just reading algorithms, users can **build their own structures** (like trees or graphs) and watch how algorithms (like BFS) work on them in real time.

---

## How It Works

1. **Create Nodes**

   * Click on the grid to create nodes
   * Rename and customize them

2. **Connect Nodes**

   * Link nodes to form structures (tree/graph)

3. **Choose Algorithm**

   * Select an algorithm (e.g., BFS)

4. **Run Simulation**

   * The system runs the algorithm step-by-step
   * Nodes get highlighted during traversal

5. **View Logs**

   * Each step is recorded in a log panel
   * Helps understand what the algorithm is doing

---

## Core Components

* **Atlas / Workspace** → Manages grid and nodes
* **Solver** → Runs algorithms (BFS, DFS, etc.)
* **Nova / Worker** → Executes algorithm steps
* **Pulse / MainLoop** → Controls simulation timing
* **Echo / RenderLoop** → Renders visuals on canvas
* **Lune / LoggerLoop** → Logs each step of the process

---

## Features

* Interactive grid system
* Step-by-step algorithm visualization
* Adjustable simulation speed
* Clear logs for learning
* Modular architecture

---

## Goal

To make algorithms easier to understand by turning them into **visual, interactive experiences** instead of just code.

---

## Tech Stack

* HTML Canvas
* JavaScript
* Tailwind CSS

---

## Future Scope

* More algorithms (DFS, Dijkstra, A*)
* Better UI/UX
* Save/load structures
