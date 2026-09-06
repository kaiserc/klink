export interface Entry {
  name: string;
  type: "dir" | "file";
  size?: number;
}

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getIcon(entry: Entry): string {
  if (entry.type === "dir") return "📁";
  const ext = entry.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp4":
    case "mkv":
    case "avi":
    case "webm":
      return "🎬";
    case "mp3":
    case "flac":
    case "wav":
      return "🎵";
    case "jpg":
    case "png":
    case "gif":
    case "webp":
      return "🖼️";
    case "pdf":
    case "txt":
    case "srt":
      return "📄";
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return "📦";
    default:
      return "📄";
  }
}

export function renderDirectoryListing(dirPath: string, entries: Entry[]): string {
  // Sort directories first, then alphabetically
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "dir" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  const parentLink = dirPath !== "/" ? `<a href=".." class="entry parent-link"><div class="entry-icon">🔙</div><div class="entry-name">.. (Parent Directory)</div></a>` : "";

  const entriesHtml = sortedEntries
    .map(
      (entry) => `
    <a href="./${encodeURIComponent(entry.name)}${entry.type === "dir" ? "/" : ""}" class="entry">
      <div class="entry-icon">${getIcon(entry)}</div>
      <div class="entry-name">${entry.name}</div>
      <div class="entry-size">${formatSize(entry.size)}</div>
    </a>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Index of ${dirPath}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      /* Light Theme (Default) */
      --bg-main: #f8fafc;
      --bg-card: rgba(255, 255, 255, 0.7);
      --bg-card-hover: rgba(255, 255, 255, 0.9);
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: rgba(226, 232, 240, 0.8);
      --accent-color: #6366f1;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --glass-blur: blur(12px);
    }

    [data-theme="dark"] {
      --bg-main: #0f172a;
      --bg-card: rgba(30, 41, 59, 0.7);
      --bg-card-hover: rgba(30, 41, 59, 0.9);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: rgba(51, 65, 85, 0.8);
      --accent-color: #818cf8;
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    [data-theme="midnight"] {
      --bg-main: #09090b;
      --bg-card: rgba(24, 24, 27, 0.7);
      --bg-card-hover: rgba(39, 39, 42, 0.9);
      --text-main: #fafafa;
      --text-muted: #a1a1aa;
      --border-color: rgba(63, 63, 70, 0.5);
      --accent-color: #a78bfa;
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
    }

    [data-theme="solarized"] {
      --bg-main: #fdf6e3;
      --bg-card: rgba(238, 232, 213, 0.7);
      --bg-card-hover: rgba(238, 232, 213, 0.9);
      --text-main: #657b83;
      --text-muted: #93a1a1;
      --border-color: rgba(203, 75, 22, 0.2);
      --accent-color: #b58900;
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      transition: background-color 0.3s ease, color 0.3s ease;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 2rem;
      background: var(--bg-card);
      backdrop-filter: var(--glass-blur);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 10;
      box-shadow: var(--shadow-sm);
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .path-segment {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .path-segment:hover {
      color: var(--accent-color);
    }

    .theme-switcher {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    select {
      appearance: none;
      background: var(--bg-main);
      color: var(--text-main);
      border: 1px solid var(--border-color);
      padding: 0.5rem 2rem 0.5rem 1rem;
      border-radius: 0.5rem;
      font-family: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      outline: none;
      transition: border-color 0.2s ease;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 1.2em;
    }

    select:focus {
      border-color: var(--accent-color);
    }

    main {
      flex: 1;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    .file-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: var(--bg-card);
      backdrop-filter: var(--glass-blur);
      border: 1px solid var(--border-color);
      border-radius: 1rem;
      padding: 1rem;
      box-shadow: var(--shadow-md);
    }

    .entry {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      text-decoration: none;
      color: var(--text-main);
      transition: background-color 0.2s ease, transform 0.2s ease;
    }

    .entry:hover {
      background-color: var(--bg-card-hover);
      transform: translateX(4px);
    }

    .entry-icon {
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
    }

    .entry-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .entry-size {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .parent-link {
      font-weight: 600;
      color: var(--accent-color);
    }

    @media (max-width: 600px) {
      header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .theme-switcher {
        width: 100%;
      }
      select {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>
      <span>⚡</span>
      <span>Index of ${dirPath}</span>
    </h1>
    <div class="theme-switcher">
      <label for="theme-select" style="font-size: 0.875rem; color: var(--text-muted); font-weight: 500;">Theme:</label>
      <select id="theme-select">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="midnight">Midnight</option>
        <option value="solarized">Solarized</option>
      </select>
    </div>
  </header>
  
  <main>
    <div class="file-list">
      ${parentLink}
      ${entriesHtml}
    </div>
  </main>

  <script>
    const themeSelect = document.getElementById('theme-select');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('klink-theme') || localStorage.getItem('torlnk-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSelect.value = savedTheme;

    // Listen for changes
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('klink-theme', newTheme);
    });
  </script>
</body>
</html>`;
}
