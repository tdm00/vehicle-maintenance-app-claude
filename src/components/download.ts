export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers read the URL after click() returns, so revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
