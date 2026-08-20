import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";

const SESSION_ID = "workbench-main";
const OUTPUT_QUIET_MS = 400;

interface PtyOutput {
  id: string;
  chunk: string;
}

export function useXterm(
  container: React.RefObject<HTMLDivElement | null>,
  cwd: string | null,
  visible: boolean,
) {
  const term = useRef<Terminal | null>(null);
  const fit = useRef<FitAddon | null>(null);
  const lastOutput = useRef(0);
  const ready = useRef(false);

  useEffect(() => {
    const node = container.current;
    if (!node || term.current) return;

    const terminal = new Terminal({
      fontSize: 12,
      fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
      cursorBlink: true,
      convertEol: false,
      scrollback: 10000,
      allowProposedApi: true,
      theme: {
        background: "#0b0b0d",
        foreground: "#e4e4e7",
        cursor: "#f0aa12",
        selectionBackground: "#27272a",
        black: "#18181b",
        red: "#ef4444",
        green: "#10b981",
        yellow: "#f0aa12",
        blue: "#60a5fa",
        magenta: "#c792ea",
        cyan: "#22d3ee",
        white: "#e4e4e7",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.open(node);

    term.current = terminal;
    fit.current = fitAddon;

    terminal.onData((data) => {
      invoke("pty_write", { id: SESSION_ID, data }).catch(() => {});
    });

    let disposed = false;
    const unlisten = listen<PtyOutput>("pty:output", (event) => {
      if (disposed || event.payload.id !== SESSION_ID) return;
      lastOutput.current = Date.now();
      terminal.write(event.payload.chunk);
    });

    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        return;
      }
      invoke("pty_open", {
        id: SESSION_ID,
        cwd,
        cols: terminal.cols,
        rows: terminal.rows,
      })
        .then(() => {
          ready.current = true;
        })
        .catch(() => {});
    });

    return () => {
      disposed = true;
      unlisten.then((off) => off()).catch(() => {});
      terminal.dispose();
      term.current = null;
      fit.current = null;
      ready.current = false;
    };
  }, [container, cwd]);

  useEffect(() => {
    const node = container.current;
    if (!node || !term.current || !fit.current) return;

    let timer: number | null = null;

    function refit() {
      if (Date.now() - lastOutput.current < OUTPUT_QUIET_MS) {
        timer = window.setTimeout(refit, OUTPUT_QUIET_MS);
        return;
      }
      try {
        fit.current?.fit();
      } catch {
        return;
      }
      const terminal = term.current;
      if (!terminal) return;
      invoke("pty_resize", {
        id: SESSION_ID,
        cols: terminal.cols,
        rows: terminal.rows,
      }).catch(() => {});
    }

    const observer = new ResizeObserver(() => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(refit, 120);
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [container, term.current, fit.current]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      try {
        fit.current?.fit();
      } catch {
        return;
      }
      term.current?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [visible]);

  function run(command: string) {
    invoke("pty_write", { id: SESSION_ID, data: `${command}\r` }).catch(() => {});
  }

  function clear() {
    term.current?.clear();
  }

  return { run, clear };
}
