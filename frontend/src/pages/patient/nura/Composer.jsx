// Message composer: auto-growing textarea, voice input (Web Speech API) and send.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Mic, Square, SendHorizontal } from 'lucide-react';
import { IconButton } from '../../../components/ui';
import s from './Composer.module.css';

const SpeechRecognitionApi = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;
const MAX_HEIGHT = 140;

export default function Composer({ onSend, disabled, onListeningChange, inputRef, placeholder = 'Message Nura' }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const localRef = useRef(null);
  const textareaRef = inputRef || localRef;
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef('');

  // Keep the textarea sized to its content (DOM measurement only)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text, textareaRef]);

  // Stop the microphone when leaving the chat
  useEffect(() => () => {
    const rec = recognitionRef.current;
    if (rec) {
      rec.onend = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.abort?.();
    }
  }, []);

  const setMic = (on) => {
    setListening(on);
    onListeningChange?.(on);
  };

  const submit = () => {
    if (disabled || !text.trim()) return;
    recognitionRef.current?.stop?.();
    if (onSend(text)) setText('');
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    // On touch devices Enter adds a new line; the send button submits
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    submit();
  };

  const toggleVoice = () => {
    if (!SpeechRecognitionApi) {
      setVoiceNote('Voice input is not supported on this browser. You can type your message instead.');
      return;
    }
    if (listening) { recognitionRef.current?.stop(); return; }
    setVoiceNote('');
    const rec = new SpeechRecognitionApi();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    voiceBaseRef.current = text.trim() ? `${text.trim()} ` : '';
    rec.onresult = (event) => {
      const heard = Array.from(event.results).map((r) => r[0].transcript).join('');
      setText(voiceBaseRef.current + heard);
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceNote('Microphone access is blocked. Allow it in your browser or device settings to talk to Nura.');
      } else if (event.error === 'no-speech') {
        setVoiceNote('Nura did not hear anything. Tap the microphone and try again.');
      } else if (event.error === 'audio-capture') {
        setVoiceNote('No microphone was found on this device.');
      } else if (event.error !== 'aborted') {
        setVoiceNote('Voice input stopped. Try again or type your message.');
      }
    };
    rec.onend = () => { setMic(false); recognitionRef.current = null; };
    recognitionRef.current = rec;
    try {
      rec.start();
      setMic(true);
    } catch {
      recognitionRef.current = null;
      setVoiceNote('Could not start the microphone. Please try again.');
    }
  };

  const canSend = !disabled && text.trim().length > 0;

  return (
    <div className={s.wrap}>
      <div className={`${s.box} ${listening ? s.boxListening : ''}`}>
        <label htmlFor="nura-composer" className="sr-only">Message Nura</label>
        <textarea
          id="nura-composer"
          ref={textareaRef}
          className={s.input}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={listening ? 'Listening…' : placeholder}
          maxLength={2000}
          enterKeyHint="send"
        />
        <IconButton
          icon={listening ? Square : Mic}
          label={listening ? 'Stop voice input' : 'Speak your message'}
          className={`${s.mic} ${listening ? s.micOn : ''}`}
          aria-pressed={listening}
          onClick={toggleVoice}
        />
        <IconButton icon={SendHorizontal} label="Send message" variant="primary" disabled={!canSend} onClick={submit} />
      </div>
      {voiceNote && <p className={s.voiceNote} role="status">{voiceNote}</p>}
    </div>
  );
}
