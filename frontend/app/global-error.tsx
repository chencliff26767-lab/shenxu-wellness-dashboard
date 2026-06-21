"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-Hant">
      <body>
        <main style={{ alignItems: "center", display: "flex", minHeight: "100vh", padding: 24 }}>
          <section style={{ margin: "0 auto", maxWidth: 448, width: "100%" }} role="alert">
            <h1 style={{ fontSize: 28 }}>應用程式暫時無法使用</h1>
            <p style={{ lineHeight: 1.7 }}>請重新載入；已儲存的資料不會受到影響。</p>
            <button onClick={reset} style={{ minHeight: 44, padding: "0 20px" }} type="button">重新載入</button>
          </section>
        </main>
      </body>
    </html>
  );
}
