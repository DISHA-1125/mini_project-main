'use client';

import { useChat, type ChatMessage } from '@/hooks/use-realtime';
import { formatRelativeTime } from '@/lib/utils';
import type { SessionUser } from '@/lib/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Send,
  Shield,
  Copy,
  CheckCheck,
  LocateFixed,
  Navigation,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';

// ─── Message-type helpers ─────────────────────────────────────────────────────

type LocPayload = {
  lat: number;
  lng: number;
  label: string;
};

type OtpPayload = {
  code: string;
};

function encodeLocMessage(p: LocPayload) {
  return `__LOC__:${JSON.stringify(p)}`;
}

function encodeOtpMessage(p: OtpPayload) {
  return `__OTP__:${JSON.stringify(p)}`;
}

function parseMsgType(content: string):
  | { type: 'text' }
  | { type: 'location'; payload: LocPayload }
  | { type: 'otp'; payload: OtpPayload } {
  if (content.startsWith('__LOC__:')) {
    try {
      return { type: 'location', payload: JSON.parse(content.slice(8)) };
    } catch {
      return { type: 'text' };
    }
  }
  if (content.startsWith('__OTP__:')) {
    try {
      return { type: 'otp', payload: JSON.parse(content.slice(8)) };
    } catch {
      return { type: 'text' };
    }
  }
  return { type: 'text' };
}

function generate4DigitOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Reverse-geocode a lat/lng into a short label via Nominatim */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'User-Agent': 'FindIt-LostAndFound/1.0' } }
    );
    if (!res.ok) throw new Error('nominatim error');
    const data = await res.json();
    const addr = data.address ?? {};
    const parts = [
      addr.neighbourhood || addr.suburb || addr.quarter,
      addr.road || addr.pedestrian,
      addr.city || addr.town || addr.county,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

// ── Location Bubble ───────────────────────────────────────────────────────────
function LocationBubble({ payload, isMine }: { payload: LocPayload; isMine: boolean }) {
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${payload.lat}&mlon=${payload.lng}&zoom=16`;
  return (
    <div
      className={`rounded-2xl overflow-hidden border shadow-lg max-w-[280px] ${
        isMine
          ? 'border-primary-500/40 bg-primary-500/10'
          : 'border-surface-600/50 bg-surface-800/60'
      }`}
    >
      {/* Mini static map preview via OSM tile */}
      <div className="relative h-28 bg-surface-900 overflow-hidden">
        <img
          src={`https://staticmap.openstreetmap.de/staticmap.php?center=${payload.lat},${payload.lng}&zoom=15&size=280x112&markers=${payload.lat},${payload.lng},ol-marker`}
          alt="Map preview"
          className="w-full h-full object-cover opacity-80"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Pin overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-primary-500 rounded-full p-1.5 shadow-lg shadow-primary-500/50">
            <MapPin className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-400 mb-0.5">
          📍 Meetup Pin
        </p>
        <p className="text-xs text-surface-200 leading-snug line-clamp-2">{payload.label}</p>
        <p className="text-[10px] font-mono text-surface-500 mt-1">
          {payload.lat.toFixed(5)}, {payload.lng.toFixed(5)}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-400 hover:text-primary-300 transition-colors"
        >
          Open in map <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ── OTP Bubble ────────────────────────────────────────────────────────────────
function OtpBubble({ payload, isMine }: { payload: OtpPayload; isMine: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(payload.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl px-4 py-3 border max-w-[240px] shadow-lg ${
        isMine
          ? 'border-accent-500/40 bg-accent-500/10'
          : 'border-surface-600/50 bg-surface-800/60'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-accent-400 flex-shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent-400">
          Handover OTP
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-3xl font-mono font-bold tracking-[0.3em] text-surface-50">
          {payload.code}
        </span>
        <button
          onClick={copy}
          className="p-1.5 rounded-lg bg-surface-700/60 hover:bg-surface-600 text-surface-300 hover:text-surface-100 transition-colors"
          title="Copy OTP"
        >
          {copied ? (
            <CheckCheck className="w-3.5 h-3.5 text-accent-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-surface-500 mt-2 leading-snug">
        Show this code to the security guard at the handover point.
      </p>
    </div>
  );
}

// ── Single Message Row ────────────────────────────────────────────────────────
function MessageRow({
  msg,
  isMine,
  showName,
}: {
  msg: ChatMessage;
  isMine: boolean;
  showName: boolean;
}) {
  const parsed = parseMsgType(msg.content);

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-0.5`}>
      {showName && !isMine && (
        <span className="text-[11px] font-semibold text-primary-400 px-1">
          {msg.sender.name}
        </span>
      )}

      {parsed.type === 'location' && (
        <LocationBubble payload={parsed.payload} isMine={isMine} />
      )}

      {parsed.type === 'otp' && (
        <OtpBubble payload={parsed.payload} isMine={isMine} />
      )}

      {parsed.type === 'text' && (
        <div
          className={`px-3.5 py-2.5 rounded-2xl max-w-[75%] break-words shadow-sm ${
            isMine
              ? 'rounded-br-sm bg-gradient-to-br from-primary-500 to-primary-600 text-white'
              : 'rounded-bl-sm bg-surface-700/70 text-surface-100 border border-surface-600/40'
          } ${msg.id.startsWith('optimistic-') ? 'opacity-60' : ''}`}
        >
          <p className="text-sm leading-relaxed">{msg.content}</p>
        </div>
      )}

      <span className="text-[10px] text-surface-500 px-1">
        {formatRelativeTime(msg.createdAt)}
        {msg.id.startsWith('optimistic-') && (
          <span className="ml-1 italic">sending…</span>
        )}
      </span>
    </div>
  );
}

// ── Location Share Sheet ──────────────────────────────────────────────────────
function LocationSheet({
  onShare,
  onClose,
}: {
  onShare: (payload: LocPayload) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [loc, setLoc] = useState<LocPayload | null>(null);

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const label = await reverseGeocode(coords.latitude, coords.longitude);
        setLoc({ lat: coords.latitude, lng: coords.longitude, label });
        setStatus('ready');
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  useEffect(() => { detect(); }, [detect]);

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-30">
      <div className="mx-3 rounded-2xl border border-surface-600/60 bg-surface-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/60">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-semibold text-surface-100">Share Meetup Location</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {status === 'locating' && (
            <div className="flex items-center gap-3 text-primary-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Detecting your location…</span>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <p className="text-sm text-red-400">Could not detect location.</p>
              <button
                onClick={detect}
                className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {status === 'ready' && loc && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <MapPin className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary-300">Your current location</p>
                  <p className="text-sm text-surface-200 mt-0.5 leading-snug">{loc.label}</p>
                  <p className="text-[10px] font-mono text-surface-500 mt-1">
                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={detect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-400 hover:text-surface-200 border border-surface-700 hover:bg-surface-800 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
                <button
                  onClick={() => { onShare(loc); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-500/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send as Meetup Pin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── OTP Verification Card ─────────────────────────────────────────────────────
function OtpCard({
  onSendOtp,
}: {
  onSendOtp: (code: string) => void;
}) {
  const [otp] = useState(() => generate4DigitOTP());
  const [verified, setVerified] = useState(false);
  const [input, setInput] = useState('');
  const [wrong, setWrong] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyOtp = () => {
    navigator.clipboard.writeText(otp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verify = () => {
    if (input.trim() === otp) {
      setVerified(true);
      setWrong(false);
    } else {
      setWrong(true);
      setInput('');
    }
  };

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-accent-500/30 bg-gradient-to-br from-accent-500/10 via-surface-900/60 to-surface-800/60 backdrop-blur-sm shadow-xl overflow-hidden">
      {/* Top stripe */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-accent-500 to-transparent" />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-500/20 border border-accent-500/30">
              <Shield className="w-3.5 h-3.5 text-accent-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-accent-300 uppercase tracking-wider">
                Handover Verification
              </p>
              <p className="text-[10px] text-surface-500">
                Share OTP with the security guard at handover
              </p>
            </div>
          </div>

          {/* The OTP digits */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {otp.split('').map((digit, i) => (
                <div
                  key={i}
                  className="w-7 h-9 rounded-lg bg-surface-800 border border-accent-500/40 flex items-center justify-center text-lg font-mono font-bold text-surface-50 shadow-inner"
                >
                  {digit}
                </div>
              ))}
            </div>
            <button
              onClick={copyOtp}
              className="p-1.5 rounded-lg text-surface-400 hover:text-accent-400 hover:bg-surface-700 transition-colors"
              title="Copy OTP"
            >
              {copied ? (
                <CheckCheck className="w-3.5 h-3.5 text-accent-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-3 flex items-center gap-2">
          {!verified ? (
            <>
              <div className="flex-1 flex gap-1.5">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="Enter OTP to verify"
                  value={input}
                  onChange={(e) => { setInput(e.target.value.replace(/\D/g, '')); setWrong(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && verify()}
                  className={`flex-1 h-8 rounded-lg border text-sm text-center font-mono tracking-widest bg-surface-900/70 text-surface-100 placeholder-surface-600 outline-none transition-colors
                    ${wrong ? 'border-red-500/60 focus:border-red-400' : 'border-surface-700 focus:border-accent-500'}`}
                />
                <button
                  onClick={verify}
                  className="px-3 h-8 rounded-lg text-xs font-semibold bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/30 hover:text-accent-200 transition-colors"
                >
                  Verify
                </button>
              </div>
              <button
                onClick={() => onSendOtp(otp)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/30 transition-colors whitespace-nowrap"
              >
                <Send className="w-3 h-3" />
                Share OTP
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-accent-400">
              <CheckCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">OTP verified — handover confirmed!</span>
            </div>
          )}
        </div>
        {wrong && (
          <p className="text-[11px] text-red-400 mt-1.5">Incorrect OTP. Try again.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main ChatWindow ──────────────────────────────────────────────────────────

export type ChatWindowProps = {
  conversationId: string;
  currentUser: SessionUser;
  /** Display name for the other participant — shown in the header */
  peerName: string;
  /** Title of the item this conversation is about */
  itemTitle: string;
  className?: string;
};

export function ChatWindow({
  conversationId,
  currentUser,
  peerName,
  itemTitle,
  className = '',
}: ChatWindowProps) {
  const { messages, sendMessage } = useChat(conversationId);
  const [text, setText] = useState('');
  const [showLocSheet, setShowLocSheet] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      setText('');
      await sendMessage(trimmed, currentUser.id, currentUser.name);
      inputRef.current?.focus();
    },
    [sendMessage, currentUser]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(text);
  };

  const handleShareLocation = useCallback(
    async (payload: LocPayload) => {
      await sendMessage(encodeLocMessage(payload), currentUser.id, currentUser.name);
    },
    [sendMessage, currentUser]
  );

  const handleSendOtp = useCallback(
    async (code: string) => {
      await sendMessage(encodeOtpMessage({ code }), currentUser.id, currentUser.name);
    },
    [sendMessage, currentUser]
  );

  return (
    <div
      className={`flex flex-col rounded-2xl border border-surface-700/50 bg-gradient-to-b from-surface-900/80 to-surface-950/80 backdrop-blur-xl shadow-2xl overflow-hidden ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700/50 bg-surface-900/60 flex-shrink-0">
        {/* Avatar */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-primary-500/30 flex-shrink-0">
            {peerName.charAt(0).toUpperCase()}
          </div>
          {/* Online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-400 border-2 border-surface-900 shadow" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-100 truncate">{peerName}</p>
          <p className="text-[11px] text-surface-400 truncate">
            re: <span className="text-primary-400">{itemTitle}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent-500/10 border border-accent-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-accent-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* ── OTP card ── */}
      <div className="flex-shrink-0 pt-3">
        <OtpCard onSendOtp={handleSendOtp} />
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center">
              <Send className="w-5 h-5 text-surface-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-400">No messages yet</p>
              <p className="text-xs text-surface-600 mt-0.5">
                Start the conversation about the handover location
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender.id === currentUser.id;
          const prevMsg = messages[idx - 1];
          const showName = !isMine && prevMsg?.sender.id !== msg.sender.id;

          return (
            <MessageRow
              key={msg.id}
              msg={msg}
              isMine={isMine}
              showName={showName}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Location sheet (floats above input) ── */}
      <div className="relative flex-shrink-0">
        {showLocSheet && (
          <LocationSheet
            onShare={handleShareLocation}
            onClose={() => setShowLocSheet(false)}
          />
        )}

        {/* ── Input bar ── */}
        <div className="px-3 py-3 border-t border-surface-700/50 bg-surface-900/60">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {/* Location pin button */}
            <button
              type="button"
              onClick={() => setShowLocSheet((v) => !v)}
              title="Share meetup location"
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border transition-all
                ${
                  showLocSheet
                    ? 'bg-primary-500/30 border-primary-500/60 text-primary-300 shadow-lg shadow-primary-500/20'
                    : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-primary-500/40 hover:text-primary-400 hover:bg-primary-500/10'
                }`}
            >
              <LocateFixed className="w-4 h-4" />
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              autoComplete="off"
              className="flex-1 h-9 rounded-xl border border-surface-700 bg-surface-800/70 px-3.5 text-sm text-surface-100 placeholder-surface-500 outline-none
                focus:border-primary-500/60 focus:bg-surface-800 focus:ring-2 focus:ring-primary-500/10
                transition-all"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/40
                hover:from-primary-400 hover:to-primary-500 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick hint */}
          <p className="text-[10px] text-surface-600 mt-1.5 px-1">
            Press <kbd className="font-mono bg-surface-800 px-1 rounded text-surface-500">Enter</kbd> to send ·{' '}
            <button
              type="button"
              onClick={() => setShowLocSheet(true)}
              className="text-primary-500 hover:text-primary-400 transition-colors"
            >
              📍 Share location
            </button>{' '}
            for handover meetup
          </p>
        </div>
      </div>
    </div>
  );
}
