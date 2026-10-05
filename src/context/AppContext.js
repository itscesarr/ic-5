import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getEvents, getSavedEventIds, toggleSavedEvent } from '../db/database';
import { getPreferences } from '../storage/preferences';

const AppContext = createContext(null);

export function AppContextProvider({ children, initialSession }) {
  const [session, setSession] = useState(initialSession);
  const [events, setEvents] = useState([]);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const savedStateQueue = useRef(Promise.resolve());
  const [preferences, setPreferences] = useState({
    darkTheme: false,
  });

  useEffect(() => {
    getEvents().then(setEvents).finally(() => setEventsLoading(false));
    savedStateQueue.current = getSavedEventIds().then(setSavedEventIds);
    getPreferences().then(setPreferences);
  }, []);

  function toggleSaved(eventId) {
    const operation = savedStateQueue.current.then(async () => {
      const isSaved = await toggleSavedEvent(eventId);
      setSavedEventIds((current) => {
        const remaining = current.filter((id) => id !== eventId);
        return isSaved ? [...remaining, eventId] : remaining;
      });
      return isSaved;
    });
    savedStateQueue.current = operation.catch(() => {});
    return operation;
  }

  const value = {
    session,
    setSession,
    events,
    eventsLoading,
    setEvents,
    savedEventIds,
    toggleSaved,
    preferences,
    setPreferences,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used inside AppContextProvider');
  }
  return context;
}
