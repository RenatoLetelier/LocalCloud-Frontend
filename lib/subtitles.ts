/**
 * Convert SRT subtitle format to WebVTT format.
 * Browsers only support VTT natively in <track> elements.
 */
export function srtToVtt(srt: string): string {
  // Add WebVTT header
  let vtt = 'WEBVTT\n\n';

  // Replace SRT timestamp format (00:00:00,000) with VTT format (00:00:00.000)
  vtt += srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Replace comma with period in timestamps
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    // Remove sequence numbers (lines with just digits before timestamps)
    .replace(/^\d+\n(?=\d{2}:\d{2}:\d{2})/gm, '');

  return vtt;
}

/**
 * Create a blob URL from VTT content string.
 */
export function createVttBlobUrl(vttContent: string): string {
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
}
