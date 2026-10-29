"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False during server render and hydration, true once the component runs in the browser.
// Lets a form restore a sessionStorage draft without a hydration mismatch (React docs: useSyncExternalStore).
export const useHydrated = (): boolean => useSyncExternalStore(subscribe, () => true, () => false);
