import { useEffect, useState } from 'react';
import { Character } from './components/Character';
import { Calendar } from './components/Calendar';
import { Record } from './components/Record';
import { getCharacterStatus } from './character';
import { getLastRecordDate } from './storage';
import './App.css';

type Screen = 'home' | 'calendar' | 'record';

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [status, setStatus] = useState(() => getCharacterStatus(null));
  const [recordDate, setRecordDate] = useState(() => new Date());

  useEffect(() => {
    refreshCharacterStatus();
  }, []);

  function refreshCharacterStatus() {
    getLastRecordDate().then((lastRecordDate) => {
      setStatus(getCharacterStatus(lastRecordDate));
    });
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
      {screen === 'home' && (
        <>
          <p className="greeting">
            안녕, <span className="greeting-name">민지</span> 👋
          </p>
          <Character mood={status.mood} headline={status.headline} subtext={status.subtext} />
          <button type="button" className="calendar-button" onClick={() => setScreen('calendar')}>
            달력 보기
          </button>
        </>
      )}
      {screen === 'calendar' && <Calendar onBack={() => setScreen('home')} onNewRecord={handleNewRecord} />}
      {screen === 'record' && (
        <Record date={recordDate} onBack={() => setScreen('calendar')} onSave={handleRecordSaved} />
      )}
    </div>
  );
}

export default App;
