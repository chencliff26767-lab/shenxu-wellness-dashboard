import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f7f3e8",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "#47776b",
          borderRadius: "50%",
          color: "#f7f3e8",
          display: "flex",
          fontSize: 84,
          fontWeight: 700,
          height: 124,
          justifyContent: "center",
          width: 124,
        }}
      >
        W
      </div>
    </div>,
    size,
  );
}
