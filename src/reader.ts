// src/reader.ts

export type Batch = { lines: string[]; offset: number; size: number };

export async function readBatch(
  path: string,
  offset: number,
  max: number,
  flushPartial: boolean,
): Promise<Batch> {
  const file = Bun.file(path);
  const size = file.size;
  const decoder = new TextDecoder();
  const lines: string[] = [];

  let pos = offset;
  let buf = new Uint8Array(0);
  let loaded = offset;

  // Read just enough bytes to get the next `max` lines.
  // We read a reasonably sized chunk (e.g., 1KB) to avoid 1-byte reads.
  const READ_CHUNK = 1024;

  while (lines.length < max) {
    const nl = buf.indexOf(0x0a);
    if (nl !== -1) {
      lines.push(decoder.decode(buf.subarray(0, nl)).replace(/\r$/, ""));
      pos += nl + 1;
      buf = buf.subarray(nl + 1);
    } else if (loaded < size) {
      const more = await file.slice(loaded, Math.min(loaded + READ_CHUNK, size)).bytes();
      if (more.length === 0) break;
      buf = new Uint8Array([...buf, ...more]);
      loaded += more.length;
    } else {
      if (buf.length > 0 && flushPartial) {
        lines.push(decoder.decode(buf).replace(/\r$/, ""));
        pos += buf.length;
      }
      break;
    }
  }
  return { lines, offset: pos, size };
}