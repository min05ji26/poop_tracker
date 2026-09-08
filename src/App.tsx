import { useCallback, useEffect, useRef, useState } from 'react';
import { Character } from './components/Character';
import { Calendar } from './components/Calendar';
import { Record } from './components/Record';
import { Onboarding } from './components/Onboarding';
import { getCharacterStatus } from './character';
import { getLastRecordDate, loadProfile, type PoopRecord } from './storage';
import { getRandomGreetingMessage } from './greetings';
import { onBackButton, closeApp } from './tossBridge';
import './App.css';

type Screen = 'loading' | 'onboarding' | 'home' | 'calendar' | 'record';

function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [status, setStatus] = useState(() => getCharacterStatus(null));
  const [recordDate, setRecordDate] = useState(() => new Date());
  const [calendarFocusDate, setCalendarFocusDate] = useState<Date | null>(null);
  const [editingRecord, setEditingRecord] = useState<PoopRecord | null>(null);
  const [nickname, setNickname] = useState('');
  const [greetingMessage, setGreetingMessage] = useState(() => getRandomGreetingMessage());
  const backHandlerRef = useRef<() => void>(() => closeApp());
  // 기록 화면이 자기 화면의 뒤로가기 동작(미저장 확인 포함)을 여기에 등록해요
  const recordBackRef = useRef<(() => void) | null>(null);

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

  const goHome = useCallback(() => {
    setGreetingMessage(getRandomGreetingMessage());
    setScreen('home');
  }, []);

  const goCalendar = useCallback(() => setScreen('calendar'), []);

  const registerRecordBackHandler = useCallback((handler: (() => void) | null) => {
    recordBackRef.current = handler;
  }, []);

  // 토스 내비게이션 바 뒤로가기: 최초 화면이면 앱 종료, 하위 화면이면 앱 내 이동
  useEffect(() => onBackButton(() => backHandlerRef.current()), []);

  useEffect(() => {
    backHandlerRef.current = () => {
      if (screen === 'calendar') {
        goHome();
      } else if (screen === 'record') {
        // 기록 화면은 미저장 확인을 포함한 자체 핸들러를 씀
        (recordBackRef.current ?? goCalendar)();
      } else {
        // loading · onboarding · home = 최초 화면 → 미니앱 종료
        closeApp();
      }
    };
  }, [screen, goHome, goCalendar]);

  function refreshCharacterStatus() {
    getLastRecordDate().then((lastRecordDate) => {
      setStatus(getCharacterStatus(lastRecordDate));
    });
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
    setCalendarFocusDate(recordDate);
    setScreen('calendar');
  }

  function handleRecordDeleted() {
    refreshCharacterStatus();
    setCalendarFocusDate(recordDate);
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
          <button
            type="button"
            className="calendar-button"
            onClick={() => {
              setCalendarFocusDate(null);
              setScreen('calendar');
            }}
          >
            달력 보기
          </button>
        </>
      )}
      {screen === 'calendar' && (
        <Calendar focusDate={calendarFocusDate} onBack={goHome} onNewRecord={handleNewRecord} />
      )}
      {screen === 'record' && (
        <Record
          date={recordDate}
          existingRecord={editingRecord}
          onBack={goCalendar}
          registerBackHandler={registerRecordBackHandler}
          onSave={handleRecordSaved}
          onDelete={handleRecordDeleted}
        />
      )}
    </div>
  );
}

export default App;
