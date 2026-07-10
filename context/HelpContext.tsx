import type React from 'react';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import type { HelpContent } from '../components/common/HelpModal';

interface HelpContextType {
  helpContent: HelpContent | null;
  setHelpContent: (content: HelpContent | null) => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (isOpen: boolean) => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const HelpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <HelpContext.Provider value={{ helpContent, setHelpContent, isHelpOpen, setIsHelpOpen }}>
      {children}
    </HelpContext.Provider>
  );
};

export const useGlobalHelp = () => {
  const context = useContext(HelpContext);
  if (!context) throw new Error('useGlobalHelp must be used within HelpProvider');
  return context;
};

// Custom hook for pages to register their help content on mount
export const usePageHelp = (content: HelpContent | null) => {
  const { setHelpContent } = useGlobalHelp();

  useEffect(() => {
    setHelpContent(content);
    // Cleanup on unmount
    return () => setHelpContent(null);
  }, [content, setHelpContent]);
};
