import { createContext, useContext, useState } from 'react'

const UIContext = createContext({})

export const useUI = () => useContext(UIContext)

export function UIProvider({ children }) {
  const [navbarHidden, setNavbarHidden] = useState(false)

  return (
    <UIContext.Provider value={{ navbarHidden, setNavbarHidden }}>
      {children}
    </UIContext.Provider>
  )
}
