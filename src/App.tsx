import { useEffect, useState } from 'react';
import { Character } from './components/Character';
import { Calendar } from './components/Calendar';
import { Record } from './components/Record';
import { Onboarding } from './components/Onboarding';
import { getCharacterStatus } from './character';
import { getLastRecordDate, loadProfile, type PoopRecord } from './storage';
import { getRandomGreetingMessage } from './greetings';
import './App.css';

type Screen = 'loading' | 'onboarding' | 'home' | 'calendar' | 'record';

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [status, setStatus] = useState(() => getCharacterStatus(null));
  const [recordDate, setRecordDate] = useState(() => new Date());
  const [editingRecord, setEditingRecord] = useState<PoopRecord | null>(null);
  const [nickname, setNickname] = useState('');
  const [greetingMessage, setGreetingMessage] = useState(() => getRandomGreetingMessage());

  useEffect(() => {
    refreshCharacterStatus();
    loadProfile().then((profile) => {
      if (profile) {
        setNickname(profile.nickname);
        setScreen('home');
      } else {
        setScreen('onboarding');
      }
    });
  }, []);

  function refreshCharacterStatus() {
    getLastRecordDate().then((lastRecordDate) => {
      setStatus(getCharacterStatus(lastRecordDate));
    });
  }

  function goHome() {
    setGreetingMessage(getRandomGreetingMessage());
    setScreen('home');
  }

  function handleOnboardingComplete(newNickname: string) {
    setNickname(newNickname);
    goHome();
  }

  function handleNewRecord(date: Date, existingRecord: PoopRecord | null) {
    setRecordDate(date);
    setEditingRecord(existingRecord);
    setScreen('record');
  }

  function handleRecordSaved() {
    refreshCharacterStatus();
    setScreen('calendar');
  }

  function handleRecordDeleted() {
    refreshCharacterStatus();
    setScreen('calendar');
  }

  return (
    <div id="screen">
      {screen === 'onboarding' && <Onboarding onComplete={handleOnboardingComplete} />}
      {screen === 'home' && (
        <>
          <p className="greeting">
            <span className="greeting-name">{nickname}</span>님, {greetingMessage}
          </p>
          <Character mood={status.mood} headline={status.headline} subtext={status.subtext} />
          <button type="button" className="calendar-button" onClick={() => setScreen('calendar')}>
            달력 보기
          </button>
        </>
      )}
      {screen === 'calendar' && <Calendar onBack={goHome} onNewRecord={handleNewRecord} />}
      {screen === 'record' && (
        <Record
          date={recordDate}
          existingRecord={editingRecord}
          onBack={() => setScreen('calendar')}
          onSave={handleRecordSaved}
          onDelete={handleRecordDeleted}
        />
      )}
    </div>
  );
}

export default App;
