export type EditorActionIconName = "play" | "stop" | "save" | "download" | "reset" | "folder" | "plug" | "copy";

export function EditorActionIcon({ name }: { name: EditorActionIconName }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {name === "play" ? <path d="m8 5 11 7-11 7V5Z" /> : null}
      {name === "stop" ? <rect x="6" y="6" width="12" height="12" rx="1.5" /> : null}
      {name === "save" ? <><path d="M4 4h14l2 2v14H4V4Z" /><path d="M7 4v6h10V4M8 20v-7h8v7" /></> : null}
      {name === "download" ? <><path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3" /></> : null}
      {name === "reset" ? <><path d="M4 11a8 8 0 1 1 2 6M4 5v6h6" /></> : null}
      {name === "folder" ? <path d="M3 6h7l2 2h9v11H3V6Z" /> : null}
      {name === "plug" ? <><path d="M7 3v5m10-5v5M5 8h14v4a7 7 0 0 1-14 0V8Zm7 11v2" /></> : null}
      {name === "copy" ? <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></> : null}
    </svg>
  );
}
