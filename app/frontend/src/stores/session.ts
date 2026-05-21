import { defineStore } from 'pinia';
import type { Topic } from '../api/types';

interface AskDraft {
  topic: Topic | '';
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    ask: { topic: '' } as AskDraft,
  }),
  actions: {
    setTopic(topic: Topic) {
      this.ask.topic = topic;
    },
    clearAsk() {
      this.ask = { topic: '' };
    },
  },
});
