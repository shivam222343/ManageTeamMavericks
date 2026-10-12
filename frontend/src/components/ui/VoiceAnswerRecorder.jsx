import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Volume2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const VoiceAnswerRecorder = ({ onRecordingComplete, initialAudioUrl = null, onTranscriptUpdate = null }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentTranscript.trim());
        if (onTranscriptUpdate) {
          onTranscriptUpdate(currentTranscript.trim());
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition notice:', e.error);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscriptUpdate]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsRecording(false);
        setTranscribing(false);

        // Notify parent
        if (onRecordingComplete) {
          onRecordingComplete({ blob, url, transcript });
        }

        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Start live speech-to-text recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setTranscribing(true);
        } catch (err) {
          // Already running or not allowed
        }
      }
    } catch (err) {
      console.error('Microphone access denied:', err);
      toast.error('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript('');
    setRecordingDuration(0);
    setIsPlaying(false);
    if (onRecordingComplete) {
      onRecordingComplete(null);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 my-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-violet-500/10 text-violet-400'}`}>
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-200">Voice Response</h4>
            <p className="text-[11px] text-zinc-500">Record your spoken answer with automated AI speech transcription</p>
          </div>
        </div>
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-mono font-medium border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>{formatTime(recordingDuration)}</span>
          </div>
        )}
      </div>

      {/* Recording controls */}
      {!audioUrl && !isRecording && (
        <button
          type="button"
          onClick={startRecording}
          className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-violet-600/10"
        >
          <Mic className="w-4 h-4" />
          Start Voice Recording
        </button>
      )}

      {isRecording && (
        <div className="space-y-3">
          {/* Waveform simulation animation */}
          <div className="flex items-center justify-center gap-1 h-8 bg-zinc-900/80 rounded-lg p-2">
            {[40, 75, 95, 30, 85, 60, 100, 45, 90, 70, 30, 80, 50, 90, 65, 35].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-1 bg-red-500 rounded-full animate-pulse"
              />
            ))}
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-red-600/20"
          >
            <Square className="w-4 h-4" />
            Stop & Save Recording
          </button>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="space-y-3 animate-in fade-in">
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={togglePlayback}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1">
              <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Voice Answer Recorded</span>
              </div>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Ready for AI evaluation
              </p>
            </div>
            <button
              type="button"
              onClick={resetRecording}
              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
              title="Re-record"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Real-time transcribed text preview */}
          {transcript && (
            <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Speech-to-Text Transcription:</span>
              </div>
              <p className="text-xs text-zinc-300 italic font-mono leading-relaxed">"{transcript}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoiceAnswerRecorder;
