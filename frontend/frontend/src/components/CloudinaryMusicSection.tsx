import { useEffect, useRef, useState } from "react";
import {
  Headphones,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";

type PublicMusicTrack = {
  title: string;
  artist: string;
  url: string;
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

function isAudioUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeTrack(value: unknown): PublicMusicTrack | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const artist = typeof record.artist === "string" ? record.artist.trim() : "";
  const url = typeof record.url === "string" ? record.url.trim() : "";
  if (!title || !isAudioUrl(url)) return null;
  return { title, artist: artist || "Magi Cinema", url };
}

/**
 * Reads public tracks without exposing Cloudinary credentials to the browser.
 * JSON is the preferred format; one `title|artist|url` entry per line is also
 * supported to make Render/Vite environment variables easier to edit.
 */
function readPublicTracks(rawValue: string | undefined): PublicMusicTrack[] {
  const raw = rawValue?.trim();
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((track) => normalizeTrack(track))
        .filter((track): track is PublicMusicTrack => track !== null)
        .slice(0, 20);
    }
  } catch {
    // Fall through to the line-based format below.
  }

  return raw
    .split(/\r?\n/)
    .map((line) => {
      const [title, artist, url] = line.split("|").map((part) => part.trim());
      return normalizeTrack({ title, artist, url });
    })
    .filter((track): track is PublicMusicTrack => track !== null)
    .slice(0, 20);
}

const PUBLIC_TRACKS = readPublicTracks(import.meta.env.VITE_PUBLIC_AUDIO_TRACKS);

export function CloudinaryMusicSection() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeIndexRef = useRef(0);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceError, setSourceError] = useState("");

  const activeTrack = PUBLIC_TRACKS[activeTrackIndex];

  useEffect(() => {
    activeIndexRef.current = activeTrackIndex;
  }, [activeTrackIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => setSourceError("Không thể tải bản nhạc. Hãy kiểm tra URL Cloudinary.");
    const onEnded = () => {
      setIsPlaying(false);
      if (PUBLIC_TRACKS.length < 2) return;
      const nextIndex = (activeIndexRef.current + 1) % PUBLIC_TRACKS.length;
      setActiveTrackIndex(nextIndex);
      setCurrentTime(0);
      setDuration(0);
      setSourceError("");
      audio.src = PUBLIC_TRACKS[nextIndex].url;
      audio.load();
      void audio.play().catch(() => setSourceError("Trình duyệt cần bạn bấm Phát để tiếp tục nghe."));
    };

    audio.volume = volume;
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const loadTrack = (index: number, shouldPlay: boolean) => {
    const track = PUBLIC_TRACKS[index];
    const audio = audioRef.current;
    if (!track || !audio) return;

    audio.pause();
    audio.src = track.url;
    audio.load();
    setActiveTrackIndex(index);
    setCurrentTime(0);
    setDuration(0);
    setSourceError("");
    if (shouldPlay) {
      void audio.play().catch(() => setSourceError("Trình duyệt cần bạn bấm Phát để tiếp tục nghe."));
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!activeTrack || !audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setSourceError("Trình duyệt cần bạn bấm Phát để tiếp tục nghe."));
    } else {
      audio.pause();
    }
  };

  const skipTrack = (direction: -1 | 1) => {
    if (PUBLIC_TRACKS.length === 0) return;
    const nextIndex = (activeTrackIndex + direction + PUBLIC_TRACKS.length) % PUBLIC_TRACKS.length;
    loadTrack(nextIndex, isPlaying);
  };

  const handleSeek = (value: string) => {
    const nextTime = Number(value);
    if (!audioRef.current || !Number.isFinite(nextTime)) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleVolume = (value: string) => {
    const nextVolume = Number(value);
    if (!Number.isFinite(nextVolume)) return;
    setVolume(nextVolume);
  };

  return (
    <section id="music" className="relative overflow-hidden py-20 sm:py-24" style={{ background: "linear-gradient(135deg, #eeedf3 0%, #e4e8ee 52%, #f2edf4 100%)" }}>
      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-rose-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-slate-500"><Waves size={14} /> Âm thanh của Magi</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Magi Music</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Thư giãn trước giờ chiếu với playlist được lưu trữ và phát trực tiếp từ Cloudinary.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur"><Headphones size={15} className="text-violet-500" /> Nghe miễn phí</span>
        </header>

        {PUBLIC_TRACKS.length === 0 ? (
          <div className="rounded-3xl border border-white/80 bg-white/70 p-8 text-center shadow-sm backdrop-blur sm:p-12">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-violet-200 shadow-lg"><Music2 size={28} /></span>
            <h3 className="mt-5 text-xl font-black text-slate-950">Playlist đang được chuẩn bị</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Magi Cinema sẽ sớm cập nhật những bản nhạc phù hợp cho buổi xem phim của bạn.</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <section className="rounded-3xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1">
                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Playlist</p><p className="mt-1 text-sm font-bold text-slate-700">{PUBLIC_TRACKS.length} bản nhạc</p></div>
                <Music2 size={19} className="text-violet-500" />
              </div>
              <div className="space-y-1.5" role="list" aria-label="Danh sách nhạc Magi Music">
                {PUBLIC_TRACKS.map((track, index) => {
                  const selected = index === activeTrackIndex;
                  return (
                    <button
                      type="button"
                      key={`${track.url}-${index}`}
                      onClick={() => (selected ? togglePlayback() : loadTrack(index, true))}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${selected ? "bg-slate-950 text-white shadow-lg shadow-slate-900/15" : "text-slate-700 hover:bg-white"}`}
                      role="listitem"
                      aria-label={`${selected && isPlaying ? "Tạm dừng" : "Phát"} ${track.title}`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-white/15 text-violet-200" : "bg-slate-100 text-slate-500"}`}>
                        {selected && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                      </span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{track.title}</span><span className={`mt-0.5 block truncate text-xs ${selected ? "text-slate-300" : "text-slate-400"}`}>{track.artist}</span></span>
                      <span className={`text-[10px] font-bold ${selected ? "text-violet-200" : "text-slate-300"}`}>{String(index + 1).padStart(2, "0")}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl shadow-slate-400/30 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 left-0 h-64 w-64 rounded-full bg-rose-500/15 blur-3xl" />
              <div className="relative flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-violet-200"><Headphones size={21} /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Đang phát</p><p className="mt-1 text-xs font-bold text-slate-300">Cloudinary audio</p></div></div><Waves size={20} className={isPlaying ? "animate-pulse text-violet-300" : "text-slate-600"} /></div>
              <div className="relative flex min-h-[215px] flex-col items-center justify-center text-center"><div className={`relative flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-400/35 to-rose-400/25 shadow-2xl shadow-violet-500/20 ${isPlaying ? "animate-pulse" : ""}`}><div className="absolute inset-3 rounded-full border border-white/10" /><Music2 size={42} className="text-white" /></div><h3 className="mt-6 max-w-full truncate px-3 text-xl font-black text-white sm:text-2xl">{activeTrack.title}</h3><p className="mt-1 text-xs font-medium text-slate-400">{activeTrack.artist}</p></div>
              <audio ref={audioRef} src={activeTrack.url} preload="metadata" className="sr-only" aria-label={`Trình phát ${activeTrack.title}`} />
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-4 sm:p-5"><div className="flex items-center gap-3"><button type="button" onClick={togglePlayback} aria-label={isPlaying ? "Tạm dừng" : "Phát"} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition hover:scale-105">{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}</button><div className="min-w-0 flex-1"><input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} disabled={!duration} onChange={(event) => handleSeek(event.target.value)} className="h-1.5 w-full cursor-pointer accent-violet-300 disabled:cursor-default" aria-label="Tiến trình audio" /><div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div></div><div className="mt-4 flex items-center justify-between gap-3"><div className="flex items-center gap-1"><button type="button" onClick={() => skipTrack(-1)} aria-label="Bài trước" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"><SkipBack size={16} /></button><button type="button" onClick={() => skipTrack(1)} aria-label="Bài tiếp theo" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"><SkipForward size={16} /></button></div><div className="flex items-center gap-2"><button type="button" onClick={() => handleVolume(volume ? "0" : "0.8")} aria-label={volume ? "Tắt tiếng" : "Bật tiếng"} className="text-slate-300 transition hover:text-white">{volume ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => handleVolume(event.target.value)} className="w-20 accent-violet-300" aria-label="Âm lượng" /></div></div></div>
              {sourceError && <p className="relative mt-3 text-center text-xs font-semibold text-rose-300">{sourceError}</p>}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
