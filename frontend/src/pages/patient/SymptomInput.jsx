import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePatient } from './PatientContext';
import * as api from '../../services/api';
import HospitalMap from '../../components/HospitalMap';
import styles from './SymptomInput.module.css';

const QUICK_CHIPS = ['Skin rash', 'Headache', 'Fever', 'Stomach pain', 'Chest pain', 'Cough', 'Back pain', 'Nausea'];

export default function SymptomInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = usePatient();
  const chatEndRef = useRef(null);

  // Multi-Chat Sessions State
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('mediguide_ai_chats');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  // Active Chat State
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMapInline, setShowMapInline] = useState(false);
  const [latestTriageResult, setLatestTriageResult] = useState(null);

  const createNewChatSession = () => {
    const newSession = {
      id: 'session_' + Date.now(),
      title: 'New Consultation',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: 'welcome_1',
          sender: 'ai',
          text: 'Hello! I am your MediGuide AI Health Counselor. Describe your symptoms or pick a quick topic below to begin.'
        }
      ]
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
    setShowMapInline(false);
    setLatestTriageResult(null);
    setShowHistorySidebar(false);
  };

  // Handle URL Location & Search Parameters (?new=true, ?history=true, ?session=id, /patient/history)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isNew = params.get('new') === 'true';
    const isHistory = location.pathname === '/patient/history' || params.get('history') === 'true';
    const requestedSessionId = params.get('session');

    if (isNew) {
      createNewChatSession();
      navigate('/patient/triage', { replace: true });
    } else if (isHistory) {
      setShowHistorySidebar(true);
    } else if (requestedSessionId) {
      const found = sessions.find((s) => s.id === requestedSessionId);
      if (found) {
        switchChatSession(found);
      }
    } else if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
      setMessages(sessions[0].messages || []);
    } else if (sessions.length === 0) {
      createNewChatSession();
    }
  }, [location.search, location.pathname]);

  // Save Sessions to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('mediguide_ai_chats', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const switchChatSession = (session) => {
    setActiveSessionId(session.id);
    setMessages(session.messages || []);
    setShowHistorySidebar(false);
    setShowMapInline(false);
  };

  const deleteChatSession = (e, sessionId) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setMessages(updated[0].messages || []);
      } else {
        createNewChatSession();
      }
    }
  };

  const handleSendMessage = async (customText = '') => {
    const symptomText = customText || text.trim();
    if (!symptomText || loading) return;

    setText('');
    const userMsg = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: symptomText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    // Update session title if first user message
    if (messages.length <= 1) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, title: symptomText.length > 25 ? symptomText.substring(0, 25) + '...' : symptomText }
            : s
        )
      );
    }

    try {
      const result = await api.submitTriageSymptom(symptomText, user?.medicalProfile, updatedMessages);
      setLatestTriageResult(result);

      const aiMsg = {
        id: 'msg_ai_' + Date.now(),
        sender: 'ai',
        isNonMedical: result.is_non_medical,
        text: result.conversational_response || `Category: ${result.category}. Specialty: ${result.specialty}.`,
        hospitalRecommendation: result.is_non_medical ? '' : result.hospital_recommendation,
        profileImpactSummary: result.is_non_medical ? '' : result.profile_impact_summary,
        triggerQuestion: result.is_non_medical ? '' : result.trigger_question,
        precautionaryAdvice: result.is_non_medical ? '' : result.precautionary_advice,
        category: result.is_non_medical ? '' : result.category,
        specialty: result.is_non_medical ? '' : result.specialty,
        urgency: result.is_non_medical ? 'none' : result.urgency_level,
        showMap: result.is_non_medical ? false : (result.show_map || result.urgency_level === 'high'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      if (result.show_map || result.urgency_level === 'high') {
        setShowMapInline(true);
      }

      // Update active session in list
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, messages: finalMessages } : s))
      );

    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: 'msg_err_' + Date.now(),
        sender: 'ai',
        text: 'I apologize, but I encountered a network issue. Please check your connection and try again.'
      };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const [isListening, setIsListening] = useState(false);

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Voice input is fully supported in Google Chrome, Edge, and Capacitor Android WebViews.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join('');
        setText(transcript);
      };

      recognition.onerror = (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const isHistoryTab = location.pathname === '/patient/history' || new URLSearchParams(location.search).get('history') === 'true';

  if (isHistoryTab) {
    return (
      <div className={styles.triageLayout}>
        <div className={styles.historyTabBanner}>
          <div>
            <h2 className={styles.historyTabTitle}>💬 AI Consultation History</h2>
            <p className={styles.historyTabSub}>Review past symptom triage sessions & recommendations</p>
          </div>
          <button
            type="button"
            className={styles.btnNewChatHeader}
            onClick={() => {
              createNewChatSession();
              navigate('/patient/triage');
            }}
          >
            + New Consultation
          </button>
        </div>

        <div className={styles.historyTabList}>
          {sessions.length === 0 ? (
            <div className={styles.emptyHistoryState}>
              <p>No previous consultation history found.</p>
              <button
                type="button"
                className={styles.btnNewChatHeader}
                onClick={() => {
                  createNewChatSession();
                  navigate('/patient/triage');
                }}
              >
                + Start First Consultation
              </button>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className={`${styles.historyTabCard} ${s.id === activeSessionId ? styles.activeHistoryTabCard : ''}`}
                onClick={() => {
                  switchChatSession(s);
                  navigate('/patient/triage');
                }}
              >
                <div className={styles.historyCardBody}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong className={styles.historyCardTitle}>💬 {s.title}</strong>
                    <span className={styles.historyCardDate}>{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className={styles.historyCardMeta}>{s.messages?.length || 0} messages exchange</p>
                </div>
                <div className={styles.historyCardActions}>
                  <span className={styles.btnResumeLink}>Resume Chat →</span>
                  <button
                    type="button"
                    className={styles.btnDeleteSession}
                    onClick={(e) => deleteChatSession(e, s.id)}
                    title="Delete Chat"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.triageLayout}>
      {/* Top Action Header Bar */}
      <div className={styles.topControlBar}>
        <button
          type="button"
          className={styles.btnHistoryToggle}
          onClick={() => navigate('/patient/history')}
        >
          💬 Chat History ({sessions.length})
        </button>

        <button type="button" className={styles.btnNewChat} onClick={createNewChatSession}>
          + New Consultation
        </button>
      </div>

      {/* Main Chat Thread */}
      <div className={styles.chatContainer}>
        <div className={styles.chatThread}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.sender === 'user' ? styles.userRow : styles.aiRow}
            >
              {msg.sender === 'ai' && (
                <div className={styles.aiAvatar}>
                  <svg className={styles.aiAvatarSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
              )}

              <div className={msg.sender === 'user' ? styles.userBubble : styles.aiBubble}>
                {msg.hospitalRecommendation && (
                  <div className={msg.urgency === 'high' ? styles.recommendationUrgent : styles.recommendationNormal}>
                    🏥 <strong>Clinical Recommendation:</strong> {msg.hospitalRecommendation}
                  </div>
                )}

                {msg.profileImpactSummary && (
                  <div className={styles.profileImpactBox}>
                    📋 <strong>Patient History Context:</strong> {msg.profileImpactSummary}
                  </div>
                )}

                <p className={styles.msgText}>{msg.text}</p>

                {msg.triggerQuestion && (
                  <div className={styles.triggerBox}>
                    ❓ <strong>Follow-up Question:</strong> {msg.triggerQuestion}
                  </div>
                )}

                {msg.precautionaryAdvice && (
                  <div className={styles.adviceBox}>
                    🛡️ <strong>Home Guidance:</strong> {msg.precautionaryAdvice}
                  </div>
                )}

                {msg.category && (
                  <div className={styles.badgeRow}>
                    <span className={styles.categoryBadge}>{msg.category}</span>
                    <span className={styles.specialtyBadge}>Recommended: {msg.specialty}</span>
                  </div>
                )}

                {msg.timestamp && (
                  <span className={styles.msgTime}>{msg.timestamp}</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className={styles.aiRow}>
              <div className={styles.aiAvatar}>
                <svg className={styles.aiAvatarSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div className={styles.aiBubbleLoading}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          )}

          {/* Interactive Map rendered inside chat when triggered */}
          {showMapInline && (
            <div className={styles.inlineMapContainer}>
              <HospitalMap filterSpecialty={latestTriageResult?.specialty} />
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 2 && (
          <div className={styles.chipsRow}>
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={styles.chip}
                onClick={() => handleSendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic Action Buttons */}
        <div className={styles.mapToggleBar}>
          <button
            type="button"
            className={styles.btnToggleMap}
            onClick={() => setShowMapInline(!showMapInline)}
          >
            {showMapInline ? '🗺️ Hide Hospital Map' : '🗺️ View Nearby Hospitals Map'}
          </button>

          {latestTriageResult?.specialty && latestTriageResult.specialty !== 'Emergency' && (
            <button
              type="button"
              className={styles.btnBookSpecialist}
              onClick={() => navigate('/patient/slots', { state: { specialty: latestTriageResult.specialty } })}
            >
              📅 Book {latestTriageResult.specialty}
            </button>
          )}

          {latestTriageResult?.urgency_level === 'high' && (
            <button
              type="button"
              className={styles.btnEmergencyCall}
              onClick={() => navigate('/patient/emergency')}
            >
              🚨 Emergency Direct Route
            </button>
          )}
        </div>

        {/* Continuous Input Field with Microphone Voice Input */}
        <div className={styles.inputArea}>
          <button
            type="button"
            className={`${styles.btnMic} ${isListening ? styles.listeningMic : ''}`}
            onClick={toggleSpeechRecognition}
            title={isListening ? 'Listening to your voice...' : 'Speak your symptoms'}
          >
            {isListening ? '🎙️' : '🎤'}
          </button>

          <input
            type="text"
            className={styles.textInput}
            placeholder={isListening ? 'Listening to voice...' : 'Type or speak symptoms...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />

          <button
            type="button"
            className={styles.btnSend}
            onClick={() => handleSendMessage()}
            disabled={!text.trim() || loading}
          >
            <svg className={styles.sendSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

