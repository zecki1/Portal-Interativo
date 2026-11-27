/**
 * Preparação de mídia para o pacote PNLD (Anexo 03, 4.3.14 e 4.3.15).
 * Requer ffmpeg/ffprobe instalados no servidor.
 *
 * Uso:
 *   npx tsx scripts/media.ts audio <entrada> <saida.mp3>
 *   npx tsx scripts/media.ts video <entrada> <saida.mp4>
 *   npx tsx scripts/media.ts probe <arquivo>
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error || result.status !== 0) {
    console.error(`Falha ao executar ${command}: ${result.error?.message || result.stderr?.trim() || result.status}`);
    process.exit(1);
  }
  if (result.stdout?.trim()) console.log(result.stdout.trim());
}

function assertInput(file: string): void {
  if (!fs.existsSync(file)) {
    console.error(`Arquivo de entrada não encontrado: ${file}`);
    process.exit(1);
  }
}

const [command, input, output] = process.argv.slice(2);

switch (command) {
  case "audio": {
    assertInput(input);
    if (!output?.toLowerCase().endsWith(".mp3")) {
      console.error("A saída de áudio deve terminar em .mp3");
      process.exit(1);
    }
    run("ffmpeg", [
      "-y", "-i", input,
      "-vn", "-codec:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", "-ac", "2",
      output,
    ]);
    run("ffprobe", [
      "-v", "error", "-show_entries", "stream=codec_name,bit_rate,sample_rate,channels",
      "-of", "json", output,
    ]);
    break;
  }
  case "video": {
    assertInput(input);
    if (!output?.toLowerCase().endsWith(".mp4")) {
      console.error("A saída de vídeo deve terminar em .mp4");
      process.exit(1);
    }
    run("ffmpeg", [
      "-y", "-i", input,
      "-c:v", "libx264", "-preset", "medium", "-crf", "23",
      "-s", "1280x720", "-r", "30", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-movflags", "+faststart", output,
    ]);
    run("ffprobe", [
      "-v", "error", "-show_entries",
      "stream=codec_name,width,height,r_frame_rate,bit_rate,channels",
      "-of", "json", output,
    ]);
    break;
  }
  case "probe": {
    assertInput(input);
    run("ffprobe", [
      "-v", "error", "-show_entries",
      "stream=codec_name,codec_type,width,height,r_frame_rate,bit_rate,sample_rate,channels",
      "-of", "json", path.resolve(input),
    ]);
    break;
  }
  default:
    console.error("Uso: audio <in> <out.mp3> | video <in> <out.mp4> | probe <arquivo>");
    process.exit(1);
}
