'use client';

import { createContext, useContext, useState } from 'react';

const AskAiContext = createContext(null);

export function AskAiProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <AskAiContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
        </AskAiContext.Provider>
    );
}

export function useAskAi() {
    const ctx = useContext(AskAiContext);
    if (!ctx) return { isOpen: false, setIsOpen: () => {} };
    return ctx;
}
