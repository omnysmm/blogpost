import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { installGlobalErrorHandlers } from "./lib/errors";

installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
