import api from './api';

export async function logout() {
  await api.post('/auth/logout');
}
