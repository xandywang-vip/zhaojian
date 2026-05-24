import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
  { path: '/ask', name: 'ask', component: () => import('../views/AskView.vue') },
  { path: '/care', name: 'care', component: () => import('../views/CareView.vue') },
  { path: '/cast', name: 'cast', component: () => import('../views/CastView.vue') },
  { path: '/result/:id', name: 'result', component: () => import('../views/ResultView.vue'), props: true },
  { path: '/wall',    name: 'wall',    component: () => import('../views/WallView.vue') },
  { path: '/wall/:id', name: 'wall-detail', component: () => import('../views/WallDetailView.vue'), props: true },
  { path: '/history', name: 'history', component: () => import('../views/HistoryView.vue') },
  // 旧路由兼容：追问已内联至 ResultView，/question/:id 和 /journal/:id 都重定向到 /result/:id
  { path: '/question/:id', redirect: (to) => `/result/${to.params.id}` },
  { path: '/journal/:id',  redirect: (to) => `/result/${to.params.id}` },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
