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

  useEffect(() => {
    getLastRecordDate().then((lastRecordDate) => {
      setStatus(getCharacterStatus(lastRecordDate));
    });
  }, []);

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
      {screen === 'calendar' && (
        <Calendar onBack={() => setScreen('home')} onNewRecord={() => setScreen('record')} />
      )}
      {screen === 'record' && <Record onBack={() => setScreen('home')} />}
    </div>
  );
}

export default App;
