"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface BorderGlowProps {
    children: React.ReactNode;
    edgeSensitivity?: number;
    glowColor?: string;
    backgroundColor?: string;
    borderRadius?: number;
    glowRadius?: number;
    glowIntensity?: number;
    coneSpread?: number;
    animated?: boolean;
    colors?: string[];
    className?: string;
    as?: React.ElementType;
}

export default function BorderGlow({
    children,
    as: Component = "div",
    edgeSensitivity = 30,
    glowColor = "170 80 60",
    backgroundColor = "transparent",
    borderRadius = 19,
    glowRadius = 30,
    glowIntensity = 0.7,
    coneSpread = 25,
    animated = true,
    colors = ['#00d9a5'],
    className,
}: BorderGlowProps) {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const updateMousePosition = (ev: MouseEvent) => {
            if (!containerRef.current) return;
            const { left, top } = containerRef.current.getBoundingClientRect();
            const x = ev.clientX - left;
            const y = ev.clientY - top;
            containerRef.current.style.setProperty("--mouse-x", `${x}px`);
            containerRef.current.style.setProperty("--mouse-y", `${y}px`);
        };

        window.addEventListener("mousemove", updateMousePosition);
        return () => {
            window.removeEventListener("mousemove", updateMousePosition);
        };
    }, []);

    // Extracting a usable color from the color string/array
    // Preserving user intent of a subtle cyan/teal glow matching the dark theme
    const activeColor = colors && colors.length > 0 ? colors[0] : `rgb(${glowColor.replace(/\s+/g, ',')})`;

    return (
        <Component 
            ref={containerRef} 
            className={cn("border-glow-card relative group", className)}
            style={{
                "--border-radius": `${borderRadius}px`,
                "--glow-radius": `${Math.max(glowRadius * 10, 300)}px`,
                "--glow-intensity": glowIntensity,
                "--bg-color": backgroundColor,
                "--glow-color": activeColor,
            } as React.CSSProperties}
        >
            <div className="edge-light absolute inset-0 pointer-events-none z-50" />
            
            {children}

            <style dangerouslySetInnerHTML={{ __html: `
                .border-glow-card {
                    --mouse-x: -1000px;
                    --mouse-y: -1000px;
                }
                .border-glow-card .edge-light {
                    border-radius: var(--border-radius);
                    padding: 2px; /* Subtle premium border thickness */
                    background: radial-gradient(
                        var(--glow-radius) at var(--mouse-x) var(--mouse-y),
                        var(--glow-color) 0%,
                        transparent 100%
                    );
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                }
                .border-glow-card:hover .edge-light {
                    opacity: var(--glow-intensity);
                }
            `}} />
        </Component>
    );
}
