// API client to communicate with the FastAPI backend
const API_BASE = 'http://localhost:8000';

export async function fetchFindings() {
  const res = await fetch(`${API_BASE}/findings`);
  return res.json();
}

export async function fetchTriageQueue() {
  const res = await fetch(`${API_BASE}/triage`);
  return res.json();
}

export async function fetchMissionPath(id: string) {
  const res = await fetch(`${API_BASE}/missions/${id}/path`);
  return res.json();
}
