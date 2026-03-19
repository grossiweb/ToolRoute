// Inline script that runs before React hydrates — prevents theme flash
export function ThemeScript() {
  const script = `
    (function() {
      var saved = localStorage.getItem('tr-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', saved);
    })();
  `
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
