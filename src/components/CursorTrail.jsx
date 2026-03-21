"use client";

import { useEffect } from "react";

export default function CursorTrail() {
    useEffect(() => {
        const circles = document.querySelectorAll(".circle");

        const colors = [
            "#00ff9d", "#00f792", "#00ef87", "#00e77c", "#00df71",
            "#00d766", "#00cf5b", "#00c750", "#00bf45", "#00b73a",
            "#00af2f", "#00a724", "#009f19", "#00970e", "#008f03"
        ];

        circles.forEach((circle, index) => {
            circle.x = window.innerWidth / 2;
            circle.y = window.innerHeight / 2;
            circle.style.backgroundColor = colors[index % colors.length];
        });

        let coords = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        const handleMouseMove = (e) => {
            coords.x = e.clientX;
            coords.y = e.clientY;
        };

        window.addEventListener("mousemove", handleMouseMove);

        function animateCircles() {
            let x = coords.x;
            let y = coords.y;

            circles.forEach((circle, index) => {
                circle.style.left = x - 8 + "px";
                circle.style.top = y - 8 + "px";

                const size = (circles.length - index) / circles.length;
                circle.style.transform = `scale(${size})`;

                circle.x = x;
                circle.y = y;

                const nextCircle = circles[index + 1] || circles[0];

                // Lower factor = more "stretch" and "lag"
                x += (nextCircle.x - x) * 0.08; 
                y += (nextCircle.y - y) * 0.08;
            });

            requestAnimationFrame(animateCircles);
        }

        animateCircles();

        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <>
            {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="circle"></div>
            ))}
        </>
    );
}