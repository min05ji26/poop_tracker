import { useEffect, useState } from 'react';
import { Character } from './components/Character';
import { Calendar } from './components/Calendar';
import { Record } from './components/Record';
import { Onboarding } from './components/Onboarding';
import { getCharacterStatus } from './character';
import { getLastRecordDate, loadProfile } from './storage';
import { getRandomGreetingMessage } from './greetings';
import './App.css';

type Screen = 'loading' | 'onboarding' | 'home' | 'calendar' | 'record';

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [status, setStatus] = useState(() => getCharacterStatus(null));
  const [recordDate, setRecordDate] = useState(() => new Date());
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

  function handleNewRecord(date: Date) {
    setRecordDate(date);
    setScreen('record');
  }

  function handleRecordSaved() {
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
        <Record date={recordDate} onBack={() => setScreen('calendar')} onSave={handleRecordSaved} />
      )}
    </div>
  );
}

export default App;
