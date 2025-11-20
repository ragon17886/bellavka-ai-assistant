const API_BASE = 'https://bellavka-ai-assistant-worker.ragon17886.workers.dev/api/admin';

export async function getAssistants() {
  const response = await fetch(`${API_BASE}/assistants`);
  return await response.json();
}

export async function createAssistant(assistant) {
  const response = await fetch(`${API_BASE}/assistants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assistant),
  });
  return await response.json();
}

export async function getDialogs(page = 1, limit = 50) {
  const response = await fetch(`${API_BASE}/dialogs?page=${page}&limit=${limit}`);
  return await response.json();
}

export async function getUserDialogs(tgId) {
  const response = await fetch(`${API_BASE}/dialogs/${tgId}`);
  return await response.json();
}