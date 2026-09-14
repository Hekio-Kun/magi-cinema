import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Check,
  Clipboard,
  Cloud,
  FileAudio,
  Headphones,
  Loader2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  UploadCloud,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { cloudinaryService } from "@/api/cloudinaryApi";
import { getApiErrorMessage } from "@/api/errors";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessDashboardPage, normalizeRoles } from "@/utils/dashboardAccess";

const MAX_AUDIO_SIZE = 50 * 1024 * 1024;
const RECENT_TRACKS_KEY = "magi-cinema-cloudinary-audio-tracks";

type RecentTrack = { title: string; url: string; createdAt: string };

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

function readRecentTracks(): RecentTrack[] {
  try {
    const raw = window.localStorage.getItem(RECENT_TRACKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is RecentTrack => Boolean(item?.title && item?.url)).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function getTrackTitle(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() || "Audio Cloudinary";
}

function isAudioUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function CloudinaryAudioLabPage() {
  const { username, roles, scopes } = useCurrentUser();
  const canUpload = canAccessDashboardPage("Cloudinary Audio Lab", normalizeRoles(username ? roles : []), username ? scopes : []);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>(readRecentTracks);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENT_TRACKS_KEY, JSON.stringify(recentTracks));
    } catch {
      // Local history is only a convenience and should never block playback.
    }
  }, [recentTracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onError = () => setSourceError("Không thể tải audio. Kiểm tra URL Cloudinary hoặc quyền truy cập file.");
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
  }, [audioUrl, volume]);

  const rememberTrack = (title: string, url: string) => {
    setRecentTracks((previous) => [{ title, url, createdAt: new Date().toISOString() }, ...previous.filter((track) => track.url !== url)].slice(0, 5));
  };

  const loadSource = (url: string, title: string) => {
    setAudioUrl(url);
    setTrackTitle(title || "Audio Cloudinary");
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSourceError("");
    setCopied(false);
  };

  const handleUrlSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = urlDraft.trim();
    if (!isAudioUrl(normalized)) {
      setSourceError("Dán URL http(s) hợp lệ của file audio trên Cloudinary.");
      return;
    }
    const fileName = normalized.split("/").pop()?.split("?")[0] || "Audio Cloudinary";
    const title = getTrackTitle(fileName);
    loadSource(normalized, title);
    rememberTrack(title, normalized);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setUploadError("");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      setSelectedFile(null);
      setUploadError("File audio phải nhỏ hơn 50 MB.");
      return;
    }
    if (file.type && !file.type.startsWith("audio/")) {
      setSelectedFile(null);
      setUploadError("Chỉ nhận file audio như MP3, WAV, M4A hoặc OGG.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!canUpload || !selectedFile || isUploading) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const url = await cloudinaryService.uploadAudio(selectedFile);
      const title = getTrackTitle(selectedFile.name);
      setUrlDraft(url);
      loadSource(url, title);
      rememberTrack(title, url);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Đã tải audio lên Cloudinary và sẵn sàng phát.");
    } catch (error) {
      setUploadError(getApiErrorMessage(error, "Không thể tải audio lên Cloudinary."));
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audioUrl || !audio) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setSourceError("Trình duyệt chặn phát tự động. Hãy bấm nút phát lại một lần nữa.");
    }
  };

  const handleSeek = (value: string) => {
    const next = Number(value);
    if (!audioRef.current || !Number.isFinite(next)) return;
    audioRef.current.currentTime = next;
    setCurrentTime(next);
  };

  const handleVolume = (value: string) => {
    const next = Number(value);
    setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  };

  const copyUrl = async () => {
    if (!audioUrl) return;
    try {
      await navigator.clipboard.writeText(audioUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Không thể sao chép URL trên trình duyệt này.");
    }
  };

  const clearSource = () => {
    audioRef.current?.pause();
    setAudioUrl("");
    setTrackTitle("");
    setUrlDraft("");
    setCurrentTime(0);
    setDuration(0);
    setSourceError("");
    setIsPlaying(false);
  };

  return (
    <main className="min-h-full flex-1 overflow-y-auto bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400"><Cloud size={15} className="text-sky-500" /> Thử nghiệm media <span className="text-slate-300">/</span> Cloudinary</div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Cloudinary Audio Lab</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tải hoặc dán URL audio để kiểm tra phát trực tuyến, tua theo HTTP range và phân phối file từ Cloudinary.</p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-extrabold text-sky-700 lg:self-auto"><Waves size={15} /> Streaming playground</span>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
          <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-xl shadow-slate-300/40">
            <div className="relative min-h-[430px] overflow-hidden p-5 sm:p-8">
              <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sky-300"><Headphones size={23} /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Now streaming</p><p className="mt-1 text-sm font-extrabold text-white">{audioUrl ? "Cloudinary delivery URL" : "Chưa có nguồn phát"}</p></div></div>{audioUrl && <button type="button" onClick={clearSource} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10"><X size={14} /> Xóa</button>}</div>
              <div className="relative flex min-h-[250px] flex-col items-center justify-center text-center"><div className={`relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-sky-400/30 to-violet-500/30 shadow-2xl shadow-sky-500/20 ${isPlaying ? "animate-pulse" : ""}`}><div className="absolute inset-3 rounded-full border border-white/10" /><Music2 size={46} className="text-white" /></div><h2 className="mt-7 max-w-xl truncate px-4 text-xl font-black text-white sm:text-2xl">{trackTitle || "Chọn một bản audio để bắt đầu"}</h2><p className="mt-2 text-xs text-slate-400">{audioUrl ? (sourceError || "Sẵn sàng phát từ Cloudinary") : "Hỗ trợ MP3, WAV, M4A và OGG"}</p></div>
              <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" aria-label={trackTitle || "Cloudinary audio player"} />
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-4 sm:p-5"><div className="flex items-center gap-3"><button type="button" onClick={() => void togglePlayback()} disabled={!audioUrl} aria-label={isPlaying ? "Tạm dừng" : "Phát"} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40">{isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}</button><div className="min-w-0 flex-1"><input type="range" min={0} max={duration || 0} step={0.1} value={Math.min(currentTime, duration || 0)} disabled={!audioUrl || !duration} onChange={(event) => handleSeek(event.target.value)} className="h-1.5 w-full cursor-pointer accent-sky-400 disabled:cursor-default" aria-label="Tiến trình audio" /><div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div><div className="hidden items-center gap-2 sm:flex"><button type="button" onClick={() => handleVolume(volume ? "0" : "0.85")} aria-label={volume ? "Tắt tiếng" : "Bật tiếng"} className="text-slate-300 transition hover:text-white">{volume ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><input type="range" min={0} max={1} step={0.05} value={volume} onChange={(event) => handleVolume(event.target.value)} className="w-20 accent-sky-400" aria-label="Âm lượng" /></div></div></div>
              {audioUrl && <div className="relative mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"><code className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{audioUrl}</code><button type="button" onClick={() => void copyUrl()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10">{copied ? <Check size={13} className="text-emerald-400" /> : <Clipboard size={13} />} {copied ? "Đã chép" : "Sao chép"}</button></div>}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><UploadCloud size={19} /></span><div><h2 className="font-black text-slate-950">Tải audio lên Cloudinary</h2><p className="mt-1 text-xs leading-5 text-slate-500">File sẽ được lưu trong thư mục <code className="font-bold text-slate-700">magi-cinema/audio</code>.</p></div></div>{canUpload ? <><input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" onChange={handleFileChange} className="mt-5 block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-sky-400" /><div className="mt-3 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-xs font-semibold text-slate-500">{selectedFile ? `${selectedFile.name} · ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : "Chưa chọn file · tối đa 50 MB"}</span><button type="button" onClick={() => void handleUpload()} disabled={!selectedFile || isUploading} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40">{isUploading ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />} Tải lên</button></div>{uploadError && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-700">{uploadError}</p>}</> : <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Tài khoản hiện tại chỉ có quyền xem. Hãy cấp quyền quản lý phim để thử tải audio.</div>}</section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Clipboard size={18} /></span><div><h2 className="font-black text-slate-950">Phát bằng URL có sẵn</h2><p className="mt-1 text-xs leading-5 text-slate-500">Dùng URL <code className="font-bold text-slate-700">res.cloudinary.com/.../video/upload/...</code>.</p></div></div><form onSubmit={handleUrlSubmit} className="mt-5 flex gap-2"><input value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} placeholder="https://res.cloudinary.com/..." className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" aria-label="URL audio Cloudinary" /><button type="submit" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-extrabold text-white hover:bg-violet-700"><Play size={14} /> Phát</button></form></section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-black text-slate-950"><RotateCcw size={16} className="text-slate-400" /> File đã mở gần đây</h2>{recentTracks.length > 0 && <button type="button" onClick={() => setRecentTracks([])} className="text-[11px] font-bold text-slate-400 hover:text-rose-600">Xóa lịch sử</button>}</div>{recentTracks.length === 0 ? <p className="mt-4 text-xs leading-5 text-slate-400">Các URL bạn vừa tải hoặc mở sẽ xuất hiện ở đây trên thiết bị này.</p> : <div className="mt-3 space-y-1.5">{recentTracks.map((track) => <button type="button" key={`${track.url}-${track.createdAt}`} onClick={() => { setUrlDraft(track.url); loadSource(track.url, track.title); }} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-slate-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileAudio size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold text-slate-700">{track.title}</span><span className="block truncate text-[10px] text-slate-400">{track.url}</span></span><Play size={13} className="shrink-0 text-slate-300" /></button>)}</div>}</section>
          </div>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-3"><InfoCard icon={<Cloud size={17} />} label="Cloudinary lưu trữ" detail="Upload qua backend có ký, không lộ API secret." tone="sky" /><InfoCard icon={<Waves size={17} />} label="Phát tiến dần" detail="Browser đọc secure_url và hỗ trợ tua theo range." tone="violet" /><InfoCard icon={<Check size={17} />} label="Kiểm tra nhanh" detail="Dùng thanh tua để xác nhận audio đã tải metadata." tone="emerald" /></section>
      </div>
    </main>
  );
}

function InfoCard({ icon, label, detail, tone }: { icon: ReactNode; label: string; detail: string; tone: "sky" | "violet" | "emerald" }) {
  const styles = { sky: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600", emerald: "bg-emerald-50 text-emerald-600" };
  return <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</span><div><p className="text-xs font-black text-slate-800">{label}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{detail}</p></div></div>;
}
