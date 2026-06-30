import { useEffect, useRef, useState, useCallback } from "react";

const MAX_HISTORY = 60; // keep last 60 samples for graphs

export function useServerData() {
  const [info, setInfo] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("connecting"); // connecting | online | offline
  const wsRef = useRef(null);
  const retryRef = useRef(null);

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus("online");

    ws.onmessage = (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "info") {
        setInfo(msg.data);
      } else if (msg.type === "metrics") {
        setMetrics(msg.data);
        setHistory((prev) => {
          const next = [
            ...prev,
            {
              t: msg.data.timestamp,
              cpu: msg.data.cpu.load ?? 0,
              mem: msg.data.memory.usedPercent ?? 0,
              temp: msg.data.temperature.main ?? null,
              rx: bytesToMbit(msg.data.network.rxSec),
              tx: bytesToMbit(msg.data.network.txSec),
            },
          ];
          return next.slice(-MAX_HISTORY);
        });
      }
    };

    ws.onclose = () => {
      setStatus("offline");
      retryRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { info, metrics, history, status };
}

function bytesToMbit(bytesPerSec) {
  if (bytesPerSec == null) return 0;
  return Math.round(((bytesPerSec * 8) / 1e6) * 100) / 100;
}
