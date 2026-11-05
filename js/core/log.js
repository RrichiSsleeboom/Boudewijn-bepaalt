// The log keeps bilingual entries ({ nl, en }), so switching the language
// also translates what happened earlier.
const MAX_LOG = 80;

export function addLog(state, text) {
  state.log.unshift({ day: state.day, text });
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
}
