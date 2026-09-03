import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import styles from './SymptomInput.module.css';

const QUICK_CHIPS = ['Skin rash', 'Headache', 'Fever', 'Stomach pain', 'Chest pain', 'Cough', 'Back pain', 'Nausea'];

function SymptomInput() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (value) => {
    const symptom = value || text.trim();
    if (!symptom) return;
    setError(''); setSubmitted(symptom); setLoading(true);
    try {
      const result = await api.submitTriageSymptom(symptom);
      navigate('/patient/triage/result', { state: { query: symptom, ...result } });
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.'); setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Seek consultation</h1>
      <p className={styles.subtext}>Describe your symptoms and we'll guide you to the right care.</p>

      <div className={styles.chatArea}>
        <div className={styles.botRow}>
          <div className={styles.botAvatar}>
            <svg className={styles.botAvatarSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div className={styles.botBubble}>
            <p className={styles.botText}>What problem are you facing? Describe your symptoms or pick one below.</p>
          </div>
        </div>

        {submitted && (
          <div className={styles.userRow}>
            <div className={styles.userBubble}><p className={styles.userText}>{submitted}</p></div>
          </div>
        )}

        {loading && (
          <div className={styles.dotsWrap}>
            <div className={styles.botAvatar}>
              <svg className={styles.botAvatarSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div className={styles.dotsBubble}>
              <div className={styles.dots}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          </div>
        )}

        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>

      {!submitted && (
        <div className={styles.chips}>
          {QUICK_CHIPS.map((chip) => (
            <button key={chip} type="button" onClick={() => handleSubmit(chip)} className={styles.chip}>{chip}</button>
          ))}
        </div>
      )}

      <div className={styles.inputBar}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Describe your symptoms..." disabled={loading} className={styles.textInput} />
        <button onClick={() => handleSubmit()} disabled={!text.trim() || loading} className={styles.sendBtn}>
          <svg className={styles.sendSvg} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SymptomInput;
