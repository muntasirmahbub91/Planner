import React from "react";
import HabitsSection from "@/sections/HabitsSection";
import "@/styles/global.css";

export default function HabitsSandbox() {
  return (
    <div style={{ maxWidth: 420, margin: "24px auto", padding: 16 }}>
      <HabitsSection />
    </div>
  );
}
\TS

cat > src/sandbox/sandbox.tsx <<TS
import React from "react";
import { createRoot } from "react-dom/client";
import HabitsSandbox from "./HabitsSandbox";
createRoot(document.getElementById("root")!).render(<HabitsSandbox />);
\TS

cat > sandbox.html <<TS
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Habits Sandbox</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/sandbox/sandbox.tsx"></script>
  </body>
</html>
\TS

npx vite --open /sandbox.html
