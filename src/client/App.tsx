import React, { useEffect, useState, useRef } from 'react'
import {
  getMe,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  logout,
  type Note,
  type User
} from './api'
import {
  Plus,
  Trash2,
  Save,
  LogOut,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  Pencil,
  ArrowLeft,
  X
} from 'lucide-react'

function GithubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [title, setTitle] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  
  const [loadingUser, setLoadingUser] = useState<boolean>(true)
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [deleting, setDeleting] = useState<boolean>(false)
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. Initial auth check
  useEffect(() => {
    getMe()
      .then((currentUser) => {
        setUser(currentUser)
        if (currentUser) {
          loadNotes()
        }
      })
      .catch((err) => {
        console.error('Auth error:', err)
      })
      .finally(() => {
        setLoadingUser(false)
      })
  }, [])

  // 2. Fetch notes
  async function loadNotes() {
    setLoadingNotes(true)
    setError(null)
    try {
      const data = await getNotes()
      setNotes(data)
      if (data.length > 0) {
        setSelectedNoteId(data[0].id)
        setTitle(data[0].title)
        setContent(data[0].content)
        setIsEditing(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load notes')
    } finally {
      setLoadingNotes(false)
    }
  }

  // 3. Handle note selection (read-only by default)
  function handleSelectNote(note: Note) {
    setSelectedNoteId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setIsEditing(false)
    setSavedSuccess(false)
    setError(null)
    setMobileView('detail')
  }

  // 4. Create new note (enters edit mode immediately)
  async function handleCreateNote() {
    setError(null)
    setSaving(true)
    try {
      const newNote = await createNote({
        title: 'Untitled Note',
        content: ''
      })
      setNotes((prev) => [newNote, ...prev])
      setSelectedNoteId(newNote.id)
      setTitle(newNote.title)
      setContent(newNote.content)
      setIsEditing(true)
      setSavedSuccess(false)
      setMobileView('detail')
      setTimeout(() => {
        titleInputRef.current?.focus()
        titleInputRef.current?.select()
      }, 50)
    } catch (err: any) {
      setError(err.message || 'Failed to create note')
    } finally {
      setSaving(false)
    }
  }

  // 5. Enter edit mode
  function handleStartEditing() {
    setIsEditing(true)
    setSavedSuccess(false)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  // 6. Cancel edit mode
  function handleCancelEdit() {
    if (selectedNote) {
      setTitle(selectedNote.title)
      setContent(selectedNote.content)
    }
    setIsEditing(false)
    setError(null)
  }

  // 7. Save selected note
  async function handleSaveNote() {
    if (!selectedNoteId) return
    setError(null)
    setSaving(true)
    setSavedSuccess(false)
    try {
      const cleanTitle = title.trim() || 'Untitled Note'
      const updated = await updateNote(selectedNoteId, {
        title: cleanTitle,
        content
      })
      setTitle(updated.title)
      setContent(updated.content)
      setNotes((prev) =>
        prev
          .map((n) => (n.id === updated.id ? updated : n))
          .sort((a, b) => b.updatedAt - a.updatedAt)
      )
      setIsEditing(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (err: any) {
      setError(err.message || 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  // 8. Delete selected note
  async function handleDeleteNote() {
    if (!selectedNoteId) return
    if (!window.confirm('Are you sure you want to delete this note?')) return

    setError(null)
    setDeleting(true)
    try {
      await deleteNote(selectedNoteId)
      const remaining = notes.filter((n) => n.id !== selectedNoteId)
      setNotes(remaining)

      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id)
        setTitle(remaining[0].title)
        setContent(remaining[0].content)
        setIsEditing(false)
      } else {
        setSelectedNoteId(null)
        setTitle('')
        setContent('')
        setIsEditing(false)
        setMobileView('list')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete note')
    } finally {
      setDeleting(false)
    }
  }

  // 9. Keyboard shortcut Ctrl/Cmd + S to save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isEditing) {
          handleSaveNote()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNoteId, title, content, isEditing])

  // Current selected note object
  const selectedNote = notes.find((n) => n.id === selectedNoteId)
  const isDirty =
    selectedNote &&
    (selectedNote.title !== title || selectedNote.content !== content)

  // Loading screen
  if (loadingUser) {
    return (
      <div className="center-screen">
        <Loader2 className="spinner" size={32} />
      </div>
    )
  }

  // Unauthenticated: Login Screen
  if (!user) {
    return (
      <div className="center-screen">
        <div className="login-card">
          <div className="brand-badge">
            <FileText size={24} />
          </div>
          <h1>Notes</h1>
          <p className="subtitle">
            A fast, distraction-free personal note-taking app.
          </p>
          <a href="/auth/github" className="btn btn-github">
            <GithubIcon size={20} />
            <span>Sign in with GitHub</span>
          </a>
        </div>
      </div>
    )
  }

  // Authenticated: Two-Column Responsive Notes App
  return (
    <div className={`app-container mobile-view-${mobileView}`}>
      {/* LEFT COLUMN: Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="user-profile">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="avatar"
              />
            ) : (
              <div className="avatar-placeholder">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="user-info">
              <span className="user-name">{user.name || user.username}</span>
              <span className="user-handle">@{user.username}</span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="icon-btn"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="sidebar-actions">
          <button
            onClick={handleCreateNote}
            disabled={saving}
            className="btn btn-primary btn-new-note"
          >
            <Plus size={18} />
            <span>New Note</span>
          </button>
        </div>

        {error && (
          <div className="sidebar-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="notes-list">
          {loadingNotes ? (
            <div className="list-loading">
              <Loader2 className="spinner" size={20} />
              <span>Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="list-empty">
              <p>No notes yet</p>
              <span className="text-muted">Click "+ New Note" to start.</span>
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = note.id === selectedNoteId
              const displayDate = new Date(note.updatedAt).toLocaleDateString(
                undefined,
                {
                  month: 'short',
                  day: 'numeric'
                }
              )
              const preview = note.content.trim() || 'No content'

              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`note-item ${isSelected ? 'active' : ''}`}
                >
                  <div className="note-item-header">
                    <span className="note-item-title">
                      {note.title || 'Untitled Note'}
                    </span>
                    <span className="note-item-date">{displayDate}</span>
                  </div>
                  <p className="note-item-preview">{preview}</p>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* RIGHT COLUMN: Note Viewer & Editor */}
      <main className="editor-container">
        {selectedNote ? (
          <div className="editor-wrapper">
            <header className="editor-header">
              <div className="editor-header-left">
                {/* Mobile back to list button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="icon-btn mobile-back-btn"
                  title="Back to notes"
                  aria-label="Back to notes list"
                >
                  <ArrowLeft size={20} />
                </button>

                {isEditing ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setSavedSuccess(false)
                    }}
                    placeholder="Note title..."
                    className="title-input"
                  />
                ) : (
                  <h2 className="title-display">
                    {selectedNote.title || 'Untitled Note'}
                  </h2>
                )}
              </div>

              <div className="editor-controls">
                {savedSuccess && (
                  <span className="status-badge status-saved">
                    <Check size={14} /> Saved
                  </span>
                )}
                {isEditing && isDirty && !savedSuccess && (
                  <span className="status-badge status-unsaved">
                    Unsaved
                  </span>
                )}

                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveNote}
                      disabled={saving}
                      className="btn btn-save"
                      title="Save (Ctrl+S)"
                    >
                      {saving ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Save size={16} />
                      )}
                      <span>Save</span>
                    </button>

                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="btn btn-cancel"
                      title="Cancel edit"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEditing}
                    className="btn btn-edit"
                    title="Edit note"
                  >
                    <Pencil size={16} />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  onClick={handleDeleteNote}
                  disabled={deleting}
                  className="btn btn-delete"
                  title="Delete note"
                >
                  {deleting ? (
                    <Loader2 size={16} className="spinner" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  <span className="btn-label-desktop">Delete</span>
                </button>
              </div>
            </header>

            <div className="editor-body">
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    setSavedSuccess(false)
                  }}
                  placeholder="Start writing your thoughts..."
                  className="note-textarea"
                />
              ) : (
                <div className="note-readonly-view">
                  <div className="note-meta-info">
                    <span>
                      Updated{' '}
                      {new Date(selectedNote.updatedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {selectedNote.content.trim() ? (
                    <div className="note-readonly-content">
                      {selectedNote.content}
                    </div>
                  ) : (
                    <div className="note-empty-content">
                      <p>This note is empty.</p>
                      <button
                        onClick={handleStartEditing}
                        className="btn btn-edit-sm"
                      >
                        <Pencil size={14} />
                        <span>Add Content</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={48} />
            </div>
            <h2>No Note Selected</h2>
            <p>Choose a note from the left list or create a fresh one.</p>
            <button
              onClick={handleCreateNote}
              className="btn btn-primary"
            >
              <Plus size={18} />
              <span>Create New Note</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
