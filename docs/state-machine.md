# Side Panel State Machine

Reducer and state live in `src/sidepanel/App.tsx` and use contracts from `src/shared/types.ts`.

## Phase Definitions

- `idle`: waiting for detection or user action.
- `picking`: waiting for user selection on the host page.
- `detected`: an event exists and can be analyzed.
- `manual`: no event detected; manual entry is shown.
- `connecting`: analysis request sent, waiting for stream start.
- `streaming`: research stream active and progress events are being received.
- `result`: analysis data rendered.
- `error`: failure state with dismiss/retry action.

## Transition Diagram

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> picking: START_PICKING
  manual --> picking: START_PICKING
  idle --> detected: MARKETS_DETECTED (non-empty)
  idle --> manual: DETECTION_FAILED
  picking --> detected: MARKETS_DETECTED (non-empty)
  picking --> manual: DETECTION_FAILED
  picking --> detected: PICKER_CANCELLED (previous detectedEvent)
  picking --> idle: PICKER_CANCELLED (no detectedEvent)
  manual --> detected: manual submit (EVENT_DETECTED)
  manual --> detected: MARKETS_DETECTED (non-empty)
  detected --> detected: MARKETS_DETECTED (takes first market)
  result --> detected: MARKETS_DETECTED (takes first market)
  error --> detected: MARKETS_DETECTED (takes first market)
  detected --> connecting: REQUEST_ANALYSIS
  manual --> connecting: REQUEST_ANALYSIS (manual submit)
  result --> connecting: REQUEST_ANALYSIS (rerun)
  connecting --> streaming: ANALYSIS_STARTED
  streaming --> streaming: ANALYSIS_PROGRESS
  connecting --> result: ANALYSIS_RESULT
  streaming --> result: ANALYSIS_RESULT
  connecting --> error: SHOW_ERROR
  streaming --> error: SHOW_ERROR
  connecting --> detected: ANALYSIS_CANCELLED (event exists)
  streaming --> detected: ANALYSIS_CANCELLED (event exists)
  connecting --> idle: ANALYSIS_CANCELLED (no event)
  streaming --> idle: ANALYSIS_CANCELLED (no event)
  error --> detected: DISMISS_ERROR (event exists)
  error --> idle: DISMISS_ERROR (no event)
  idle --> idle: AUTH_REQUIRED (reset)
  detected --> idle: AUTH_REQUIRED
  manual --> idle: AUTH_REQUIRED
  connecting --> idle: AUTH_REQUIRED
  streaming --> idle: AUTH_REQUIRED
  result --> idle: AUTH_REQUIRED
  error --> idle: AUTH_REQUIRED
```

## Action Effects

- `MARKETS_DETECTED`: if payload is empty, switch to `manual`; otherwise map `payload[0]` into `detectedEvent`, set `phase = detected`, and clear previous `result`/`error`.
- `EVENT_DETECTED`: stores `detectedEvent`, clears prior error.
- `DETECTION_FAILED`: switches UI to manual input phase.
- `START_PICKING`: sets `phase = picking`.
- `PICKER_CANCELLED`: returns to `detected` when a previous `detectedEvent` exists, otherwise `idle`.
- `REQUEST_ANALYSIS`: enters `connecting`, clears error, and clears prior result/stream progress.
- `ANALYSIS_STARTED`: enters `streaming`, stores request/stage/message, and seeds timeline.
- `ANALYSIS_PROGRESS`: appends progress event to timeline and keeps `streaming`.
- `ANALYSIS_CANCELLED`: clears stream state and returns to `detected` (if event exists) or `idle`.
- `ANALYSIS_RESULT`: stores response payload and enters result phase.
- `SHOW_ERROR`: stores message and enters error phase.
- `DISMISS_ERROR`: clears error/stream and returns to `detected` (if event exists) or `idle`.
- `AUTH_REQUIRED`: resets full app state to initial unauthenticated state.
- `SET_USER`: updates user auth/plan metadata.
