import React, { createContext, useContext, useState } from 'react';

interface NavContextType {
  isMobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
  openMobile: () => void;
}

const NavContext = createContext<NavContextType>({
  isMobileOpen: false,
  toggleMobile: () => {},
  closeMobile: () => {},
  openMobile: () => {},
});

export const NavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <NavContext.Provider
      value={{
        isMobileOpen,
        toggleMobile: () => setIsMobileOpen((prev) => !prev),
        closeMobile: () => setIsMobileOpen(false),
        openMobile: () => setIsMobileOpen(true),
      }}
    >
      {children}
    </NavContext.Provider>
  );
};

export const useNav = () => useContext(NavContext);
