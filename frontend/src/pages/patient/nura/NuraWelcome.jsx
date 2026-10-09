// First screen of a new conversation: Nura says hello and offers topics.
import { Stethoscope, Pill, Moon, Apple, ClipboardList, CalendarPlus } from 'lucide-react';
import Nura from '../../../components/nura/Nura';
import s from './NuraWelcome.module.css';

const TOPICS = [
  { icon: Stethoscope, title: 'Check a symptom', text: 'Describe how you feel', prompt: 'I have a symptom to check' },
  { icon: Pill, title: 'Medications', text: 'Doses, side effects, allergies', prompt: 'I have a question about a medicine and its side effects' },
  { icon: Moon, title: 'Sleep and stress', text: 'Rest better, feel calmer', prompt: 'How can I sleep better and manage stress?' },
  { icon: Apple, title: 'Nutrition and fitness', text: 'Healthy habits that last', prompt: 'Give me tips for healthy eating and staying active' },
  { icon: ClipboardList, title: 'My health profile', text: 'Allergies, BMI, conditions', prompt: 'Show me my profile summary' },
  { icon: CalendarPlus, title: 'Find a doctor', text: 'Book a session', prompt: 'I want to book an appointment with a doctor' }
];

export default function NuraWelcome({ firstName, mood = 'happy', onPick, disabled }) {
  return (
    <div className={s.wrap}>
      <Nura size={96} mood={mood} className={s.avatar} />
      <h2 className={s.title}>{firstName ? `Hi ${firstName}, I'm Nura` : "Hi, I'm Nura"}</h2>
      <p className={s.text}>
        I can help you understand symptoms, answer questions about medicines and healthy habits, and connect you with the right doctor.
      </p>
      <ul className={s.grid} aria-label="Suggested topics">
        {TOPICS.map(({ icon: Icon, title, text, prompt }) => (
          <li key={title}>
            <button type="button" className={s.topic} onClick={() => onPick(prompt)} disabled={disabled}>
              <span className={s.topicIcon}><Icon size={20} aria-hidden="true" /></span>
              <span className={s.topicTitle}>{title}</span>
              <span className={s.topicText}>{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
