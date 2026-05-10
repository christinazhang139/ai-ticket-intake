import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { NextRequest, NextResponse } from "next/server";

const VOICE_MAP: Record<string, string> = {
  "en-US": "en-US-JennyNeural",
  "en-GB": "en-GB-SoniaNeural",
  "en-AU": "en-AU-NatashaNeural",
  "en-IN": "en-IN-NeerjaNeural",
  "en-IE": "en-IE-EmilyNeural",
};

export async function POST(req: NextRequest) {
  try {
    const { text, accent } = await req.json();
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const voiceName = VOICE_MAP[accent] || VOICE_MAP["en-US"];

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      audioStream.on("end", () => resolve());
      audioStream.on("error", (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
