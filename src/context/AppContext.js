import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getEvents, getSavedEventIds, toggleSavedEvent } from '../db/database';
import { getPreferences, setCardLayout } from '../storage/preferences';

const AppContext = createContext(null);

export function AppContextProvider({ children, initialSession }) {
  const [session, setSession] = useState(initialSession);
  const [events, setEvents] = useState([]);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const savedStateQueue = useRef(Promise.resolve());
  const [layoutReady, setLayoutReady] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    darkTheme: false,
    cardLayout: 'list',
  });

  useEffect(() => {
    reloadEvents();
    savedStateQueue.current = getSavedEventIds().then(setSavedEventIds);
    getPreferences().then(setPreferences).catch(() => {}).finally(() => setLayoutReady(true));
  }, []);

  async function reloadEvents() {
    setEventsLoading(true);
    setEventsError('');
    try {
      setEvents(await getEvents());
    } catch {
      setEventsError('Unable to load events. Please try again.');
    } finally {
      setEventsLoading(false);
    }
  }

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

  async function changeCardLayout(layout) {
    if (!layoutReady || layoutSaving) return;
    setLayoutSaving(true);
    try {
      await setCardLayout(layout);
      setPreferences((current) => ({ ...current, cardLayout: layout }));
    } finally {
      setLayoutSaving(false);
    }
  }

  const value = {
    session,
    setSession,
    events,
    eventsLoading,
    eventsError,
    setEventsError,
    reloadEvents,
    setEvents,
    savedEventIds,
    toggleSaved,
    preferences,
    setPreferences,
    changeCardLayout,
    layoutReady,
    layoutSaving,
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
