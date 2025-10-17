export const handleExportPdf = async ({ setExportingPdf, vpat }) => {
  if (!vpat?.id) return;
  try {
    setExportingPdf(true);
    const res = await fetch(
      `/api/vpats/${encodeURIComponent(String(vpat.id))}/download?format=html`,
      {
        credentials: "include",
        cache: "no-store",
      },
    );
    const html = await res.text();
    const win = window.open("", "_blank");
    if (!win) {
      console.error("Popup blocked. Please allow popups to export PDF.");
      return;
    }
    // Write the HTML into the new window and trigger print when styles load
    win.document.open();
    const printScript = `\n<script>\n  (function(){\n    function doPrint(){\n      try { window.focus(); window.print(); } catch(e){}\n    }\n    if (document.readyState === 'complete') {\n      setTimeout(doPrint, 150);\n    } else {\n      window.addEventListener('load', function(){ setTimeout(doPrint, 150); }, { once: true });\n    }\n  })();\n<\/script>`;
    win.document.write(html.replace(/<\/body>/i, `${printScript}</body>`));
    win.document.close();
  } catch (e) {
    console.error(e);
  } finally {
    setExportingPdf(false);
  }
};
