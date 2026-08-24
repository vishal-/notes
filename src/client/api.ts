export interface Note {
  id: string
  userId: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface User {
  id: string
  githubId: string
  username: string
  name: string | null
  avatarUrl: string | null
  createdAt: number
}

export async function getMe(): Promise<User | null> {
  const res = await fetch('/api/me')
  if (!res.ok) {
    if (res.status === 401) return null
    throw new Error('Failed to fetch current user')
  }
  const data = await res.json()
  return data.user
}

export async function getNotes(): Promise<Note[]> {
  const res = await fetch('/api/notes')
  if (!res.ok) {
    throw new Error(`Failed to fetch notes: ${res.statusText}`)
  }
  const data = await res.json()
  return data.notes
}

export async function createNote(payload: { title?: string; content?: string } = {}): Promise<Note> {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error(`Failed to create note: ${res.statusText}`)
  }
  const data = await res.json()
  return data.note
}

export async function updateNote(
  id: string,
  payload: { title?: string; content?: string }
): Promise<Note> {
  const res = await fetch(`/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error(`Failed to update note: ${res.statusText}`)
  }
  const data = await res.json()
  return data.note
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    throw new Error(`Failed to delete note: ${res.statusText}`)
  }
}

export async function logout(): Promise<void> {
  await fetch('/auth/logout', {
    method: 'POST'
  })
  window.location.href = '/'
}
