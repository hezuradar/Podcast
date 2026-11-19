"use client";

import { useReducer } from "react";
import type { EditDoc } from "@/lib/doc/types";

const HISTORY_LIMIT = 200;

type State = { doc: EditDoc; past: EditDoc[]; future: EditDoc[] };
type Action = { type: "apply"; next: EditDoc } | { type: "undo" } | { type: "redo" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "apply":
      if (action.next === state.doc) return state;
      return { doc: action.next, past: [...state.past, state.doc].slice(-HISTORY_LIMIT), future: [] };
    case "undo": {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return { doc: previous, past: state.past.slice(0, -1), future: [state.doc, ...state.future] };
    }
    case "redo": {
      const [next, ...rest] = state.future;
      if (!next) return state;
      return { doc: next, past: [...state.past, state.doc], future: rest };
    }
  }
}

/** Edit document with undo/redo. Every change goes through `apply`, so every change can be undone. */
export function useEditHistory(initial: EditDoc) {
  const [state, dispatch] = useReducer(reducer, { doc: initial, past: [], future: [] });
  return {
    doc: state.doc,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply: (next: EditDoc) => dispatch({ type: "apply", next }),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
  };
}
