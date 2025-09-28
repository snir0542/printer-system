import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type StatusType = 'all' | 'pending' | 'printed';

export interface EventState {
  eventId: string;
  status: StatusType;
}

const initialState: EventState = {
  eventId: '',
  status: 'all',
};

export const eventSlice = createSlice({
  name: 'event',
  initialState,
  reducers: {
    setEventId: (state, action: PayloadAction<string>) => {
      state.eventId = action.payload;
    },
    setStatus: (state, action: PayloadAction<StatusType>) => {
      state.status = action.payload;
    },
    resetEvent: () => initialState,
  },
});

// Export actions and selectors
export const { setEventId, setStatus, resetEvent } = eventSlice.actions;

export const selectEventId = (state: { event: EventState }) => state.event.eventId;
export const selectStatus = (state: { event: EventState }) => state.event.status;

export default eventSlice.reducer;
