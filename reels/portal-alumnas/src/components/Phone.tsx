import React from "react";
import { portal } from "../theme";
import { Camera } from "./ui";

export const PHONE = { x: 130, y: 580, w: 820, bezel: 16, logicalW: 412, topStrip: 64 };
export const SCREEN_W = PHONE.w - PHONE.bezel * 2; // 788
export const K = SCREEN_W / PHONE.logicalW; // escala logica -> pixeles de video

/**
 * Telefono con pantalla de 412 px logicos (como un Android/iPhone grande). El contenido se escribe en px del
 * portal y se escala por K. Baja hasta fuera del cuadro; solo lo que queda sobre y=1540 es importante.
 */
export const Phone: React.FC<{
  children: React.ReactNode;
  camera?: { x?: number; y?: number; scale?: number };
  tilt?: number;
}> = ({ children, camera, tilt = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: PHONE.x,
      top: PHONE.y,
      width: PHONE.w,
      height: 1500,
      borderRadius: 96,
      background: "#050505",
      border: "2px solid #34343a",
      boxShadow: "0 0 0 6px #121214, 0 0 90px rgba(255,79,163,.28), 0 40px 120px rgba(0,0,0,.7)",
      transform: `rotate(${tilt}deg)`,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        left: PHONE.bezel,
        top: PHONE.bezel,
        width: SCREEN_W,
        height: 1500,
        borderRadius: 82,
        overflow: "hidden",
        background: `radial-gradient(90% 40% at 50% -6%, rgba(255,79,163,.34), transparent 62%), radial-gradient(70% 35% at 105% 100%, rgba(255,79,163,.2), transparent 62%), radial-gradient(50% 30% at -10% 55%, rgba(255,79,163,.12), transparent 65%), ${portal.bg}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: PHONE.logicalW,
          transformOrigin: "0 0",
          transform: `scale(${K})`,
        }}
      >
        <Camera {...camera}>{children}</Camera>
      </div>
      {/* barra superior con isla */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: PHONE.topStrip, background: portal.bg, zIndex: 20 }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 16,
            width: 170,
            height: 40,
            marginLeft: -85,
            borderRadius: 24,
            background: "#000",
          }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -26, height: 26, background: `linear-gradient(${portal.bg}, transparent)` }} />
      </div>
    </div>
  </div>
);
