import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";

// Safe API Key access to prevent crash if process is undefined
const apiKey = (typeof process !== "undefined" && process.env) ? process.env.API_KEY : "";
const ai = new GoogleGenAI({ apiKey: apiKey });

const DrawingManager = () => {
  useEffect(() => {
    // Elements
    const canvas = document.getElementById("drawing-canvas") as HTMLCanvasElement;
    const toolbar = document.getElementById("drawing-toolbar");
    const toggleBtn = document.getElementById("btn-toggle-drawing");
    const ctx = canvas?.getContext("2d");

    if (!canvas || !toolbar || !toggleBtn || !ctx) return;

    // State
    let isDrawing = false;
    let tool = "pen"; // pen, marker, eraser
    let color = "#000000";
    let size = 5;
    let history: ImageData[] = [];
    let historyStep = -1;

    // Resize Canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (historyStep >= 0 && history[historyStep]) {
        ctx.putImageData(history[historyStep], 0, 0);
      }
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Save State for Undo
    const saveState = () => {
      historyStep++;
      if (historyStep < history.length) {
        history.length = historyStep;
      }
      history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };

    // Toggle Toolbar
    toggleBtn.onclick = () => {
      const isHidden = toolbar.classList.contains("hidden");
      if (isHidden) {
        toolbar.classList.remove("hidden");
        canvas.classList.add("active");
        toggleBtn.classList.add("active");
        toggleBtn.innerHTML = "❌";
        // Initialize history if empty
        if (history.length === 0) saveState();
      } else {
        toolbar.classList.add("hidden");
        canvas.classList.remove("active");
        toggleBtn.classList.remove("active");
        toggleBtn.innerHTML = "🎨";
      }
    };

    // Tool Selection
    document.querySelectorAll(".dt-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        if (target.dataset.tool) {
          tool = target.dataset.tool;
          // UI Update
          document
            .querySelectorAll(".dt-btn")
            .forEach((b) => b.classList.remove("active"));
          target.classList.add("active");
        }
      });
    });

    // Color Selection
    document.querySelectorAll(".dt-color").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        if (target.dataset.color) {
          color = target.dataset.color;
          // UI Update
          document
            .querySelectorAll(".dt-color")
            .forEach((b) => b.classList.remove("active"));
          target.classList.add("active");
          // If eraser was active, switch back to pen
          if (tool === "eraser") {
            tool = "pen";
            document
              .querySelectorAll(".dt-btn")
              .forEach((b) => b.classList.remove("active"));
            document.getElementById("tool-pen")?.classList.add("active");
          }
        }
      });
    });

    // Size Selection
    const sizeInput = document.getElementById("tool-size") as HTMLInputElement;
    if (sizeInput) {
      sizeInput.addEventListener("input", (e) => {
        size = parseInt((e.target as HTMLInputElement).value);
      });
    }

    // Actions (Undo, Clear)
    document.getElementById("tool-undo")?.addEventListener("click", () => {
      if (historyStep > 0) {
        historyStep--;
        ctx.putImageData(history[historyStep], 0, 0);
      }
    });

    document.getElementById("tool-clear")?.addEventListener("click", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveState();
    });

    // Drawing Logic
    const getPos = (e: MouseEvent | TouchEvent) => {
      if ((e as TouchEvent).touches && (e as TouchEvent).touches.length > 0) {
        return {
          x: (e as TouchEvent).touches[0].clientX,
          y: (e as TouchEvent).touches[0].clientY,
        };
      }
      return {
        x: (e as MouseEvent).clientX,
        y: (e as MouseEvent).clientY,
      };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      if (!canvas.classList.contains("active")) return;
      isDrawing = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      e.preventDefault(); // Prevent scrolling on touch
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !canvas.classList.contains("active")) return;
      const pos = getPos(e);

      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
        if (tool === "marker") {
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = size * 2;
        } else {
          ctx.globalAlpha = 1.0;
        }
      }

      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      e.preventDefault();
    };

    const stopDraw = () => {
      if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
        saveState();
      }
    };

    // Event Listeners
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDraw);
