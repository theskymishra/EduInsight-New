
/*import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  createStudent,
  deactivateStudent,
  getStudents,
  updateStudent,
} from '../services/api'

const EMPTY_FORM = {
  student_id: '',
  full_name: '',
  email: '',
  class_name: '',
  department: '',
  enrollment_year: new Date().getFullYear(),
}

const PAGE_SIZE = 10

function StudentManagement({ token, onViewStudent }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deactivatingId, setDeactivatingId] = useState(null)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getStudents(token, {
        search: search.trim(),
        page,
        pageSize: PAGE_SIZE,
      })

      setStudents(result.items || [])
      setPagination({
        total: result.total || 0,
        pages: result.pages || 0,
      })
    } catch (err) {
      setError(err.message || 'Unable to load students.')
    } finally {
      setLoading(false)
    }
  }, [token, search, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStudents()
    }, search ? 250 : 0)

    return () => window.clearTimeout(timer)
  }, [loadStudents, search])

  function openAddForm() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setNotice('')
    setModalOpen(true)
  }

  function openEditForm(student) {
    setEditingId(student._id)
    setForm({
      student_id: student.student_id || '',
      full_name: student.full_name || '',
      email: student.email || '',
      class_name: student.class_name || '',
      department: student.department || '',
      enrollment_year:
        student.enrollment_year || new Date().getFullYear(),
    })
    setError('')
    setNotice('')
    setModalOpen(true)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    const payload = {
      ...form,
      student_id: form.student_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      class_name: form.class_name.trim(),
      department: form.department.trim(),
      enrollment_year: Number(form.enrollment_year),
    }

    try {
      if (editingId) {
        await updateStudent(token, editingId, payload)
        setNotice('Student details updated successfully.')
      } else {
        await createStudent(token, payload)
        setNotice('Student added successfully.')
        setPage(1)
      }

      setModalOpen(false)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to save student details.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(student) {
    const confirmed = window.confirm(
      `Deactivate ${student.full_name}? They will no longer be active in the student directory.`,
    )

    if (!confirmed) return

    setDeactivatingId(student._id)
    setError('')
    setNotice('')

    try {
      await deactivateStudent(token, student._id)
      setNotice(`${student.full_name} has been deactivated.`)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to deactivate student.')
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <section className="student-management">
      <div className="student-management-heading">
        <div>
          <div className="student-eyebrow">FACULTY WORKSPACE</div>
          <h2>Student Management</h2>
          <p>Maintain student profiles and enrollment information.</p>
        </div>

        <button
          className="student-primary-button"
          onClick={openAddForm}
          type="button"
        >
          <Plus size={18} />
          Add student
        </button>
      </div>

      {notice && (
        <div className="student-notice" role="status">
          {notice}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="student-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={loadStudents}>
            Retry
          </button>
        </div>
      )}

      <div className="student-directory-card">
        <div className="student-directory-toolbar">
          <div className="student-search">
            <Search size={18} />
            <input
              aria-label="Search students"
              placeholder="Search by name, ID, email, class..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className="student-refresh-button"
            type="button"
            onClick={loadStudents}
            disabled={loading}
            aria-label="Refresh students"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="student-directory-summary">
          <div className="student-summary-icon">
            <UserRound size={20} />
          </div>
          <div>
            <strong>{pagination.total}</strong>
            <span>{search ? 'Matching students' : 'Student profiles'}</span>
          </div>
        </div>

        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Department</th>
                <th>Enrollment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="student-table-message">
                    <LoaderCircle className="student-spinner" size={22} />
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="student-table-message">
                    <UserRound size={25} />
                    <strong>No students found</strong>
                    <span>
                      {search
                        ? 'Try another search term.'
                        : 'Add your first student to get started.'}
                    </span>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div className="student-person-cell">
                        <div className="student-avatar">
                          {(student.full_name || 'S')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="student-person-details">
                          <button
                            className="student-name-link"
                            type="button"
                            onClick={() => onViewStudent?.(student._id)}
                          >
                            {student.full_name}
                          </button>
                          <span>{student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{student.student_id || '—'}</td>
                    <td>{student.class_name || '—'}</td>
                    <td>{student.department || '—'}</td>
                    <td>{student.enrollment_year || '—'}</td>
                    <td>
                      <span
                        className={`student-status ${
                          student.active
                            ? 'student-status-active'
                            : 'student-status-inactive'
                        }`}
                      >
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="student-row-actions">
                        <button
                          type="button"
                          title="Edit student"
                          aria-label={`Edit ${student.full_name}`}
                          onClick={() => openEditForm(student)}
                        >
                          <Pencil size={16} />
                        </button>
                        {student.active && (
                          <button
                            type="button"
                            title="Deactivate student"
                            aria-label={`Deactivate ${student.full_name}`}
                            disabled={deactivatingId === student._id}
                            onClick={() => handleDeactivate(student)}
                          >
                            {deactivatingId === student._id ? (
                              <LoaderCircle
                                className="student-spinner"
                                size={16}
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="student-pagination">
          <span>
            {pagination.total === 0
              ? 'No records'
              : `Page ${page} of ${Math.max(pagination.pages, 1)} · ${pagination.total} total`}
          </span>

          <div>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="student-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false)
              setError('')
            }
          }}
        >
          <section
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <div className="student-modal-heading">
              <div>
                <div className="student-eyebrow">
                  {editingId ? 'UPDATE RECORD' : 'NEW RECORD'}
                </div>
                <h3 id="student-modal-title">
                  {editingId ? 'Edit student' : 'Add a student'}
                </h3>
                <p>
                  Enter the student&apos;s profile and enrollment details.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={() => {
                  setModalOpen(false)
                  setError('')
                }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="student-error" role="alert">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="student-form-grid">
                <label>
                  Student ID *
                  <input
                    name="student_id"
                    value={form.student_id}
                    onChange={updateField}
                    placeholder="e.g. EI-2026-001"
                    required
                    maxLength={50}
                  />
                </label>

                <label>
                  Full name *
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={updateField}
                    placeholder="Student full name"
                    required
                    maxLength={120}
                  />
                </label>

                <label className="student-form-full">
                  Email address *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="student@example.com"
                    required
                    maxLength={254}
                  />
                </label>

                <label>
                  Class / Section
                  <input
                    name="class_name"
                    value={form.class_name}
                    onChange={updateField}
                    placeholder="e.g. CSE-A"
                    maxLength={100}
                  />
                </label>

                <label>
                  Department
                  <input
                    name="department"
                    value={form.department}
                    onChange={updateField}
                    placeholder="e.g. Computer Science"
                    maxLength={120}
                  />
                </label>

                <label className="student-form-full">
                  Enrollment year *
                  <input
                    type="number"
                    name="enrollment_year"
                    value={form.enrollment_year}
                    onChange={updateField}
                    min="1900"
                    max={new Date().getFullYear() + 10}
                    required
                  />
                </label>
              </div>

              <div className="student-modal-actions">
                <button
                  className="student-secondary-button"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setModalOpen(false)
                    setError('')
                  }}
                >
                  Cancel
                </button>
                <button
                  className="student-primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle className="student-spinner" size={17} />
                  )}
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save changes'
                      : 'Create student'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default StudentManagement */


import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  createStudent,
  deactivateStudent,
  getStudents,
  updateStudent,
} from '../services/api'

const EMPTY_FORM = {
  student_id: '',
  full_name: '',
  email: '',
  class_name: '',
  department: '',
  enrollment_year: new Date().getFullYear(),
}

const PAGE_SIZE = 10

function StudentManagement({ token, onViewStudent }) {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deactivatingId, setDeactivatingId] = useState(null)

  const sortedStudents = useMemo(() => {
    if (sortBy === 'default') return students

    const getValue = (student) => {
      switch (sortBy) {
        case 'name-asc':
          return (student.full_name || '').toLocaleLowerCase()
        case 'name-desc':
          return (student.full_name || '').toLocaleLowerCase()
        case 'student-id':
          return (student.student_id || '').toLocaleLowerCase()
        case 'class':
          return (student.class_name || '').toLocaleLowerCase()
        case 'department':
          return (student.department || '').toLocaleLowerCase()
        case 'year-newest':
          return Number(student.enrollment_year) || 0
        case 'year-oldest':
          return Number(student.enrollment_year) || 0
        case 'recently-added':
          return student.created_at ? new Date(student.created_at).getTime() : 0
        default:
          return ''
      }
    }

    return [...students].sort((a, b) => {
      const first = getValue(a)
      const second = getValue(b)

      if (first < second) return sortBy === 'name-desc' || sortBy === 'year-oldest' ? 1 : -1
      if (first > second) return sortBy === 'name-desc' || sortBy === 'year-oldest' ? -1 : 1
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
  }, [students, sortBy])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getStudents(token, {
        search: search.trim(),
        page,
        pageSize: PAGE_SIZE,
      })

      setStudents(result.items || [])
      setPagination({
        total: result.total || 0,
        pages: result.pages || 0,
      })
    } catch (err) {
      setError(err.message || 'Unable to load students.')
    } finally {
      setLoading(false)
    }
  }, [token, search, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStudents()
    }, search ? 250 : 0)

    return () => window.clearTimeout(timer)
  }, [loadStudents, search])

  function openAddForm() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setNotice('')
    setModalOpen(true)
  }

  function openEditForm(student) {
    setEditingId(student._id)
    setForm({
      student_id: student.student_id || '',
      full_name: student.full_name || '',
      email: student.email || '',
      class_name: student.class_name || '',
      department: student.department || '',
      enrollment_year:
        student.enrollment_year || new Date().getFullYear(),
    })
    setError('')
    setNotice('')
    setModalOpen(true)
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    const payload = {
      ...form,
      student_id: form.student_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      class_name: form.class_name.trim(),
      department: form.department.trim(),
      enrollment_year: Number(form.enrollment_year),
    }

    try {
      if (editingId) {
        await updateStudent(token, editingId, payload)
        setNotice('Student details updated successfully.')
      } else {
        await createStudent(token, payload)
        setNotice('Student added successfully.')
        setPage(1)
      }

      setModalOpen(false)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to save student details.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(student) {
    const confirmed = window.confirm(
      `Deactivate ${student.full_name}? They will no longer be active in the student directory.`,
    )

    if (!confirmed) return

    setDeactivatingId(student._id)
    setError('')
    setNotice('')

    try {
      await deactivateStudent(token, student._id)
      setNotice(`${student.full_name} has been deactivated.`)
      await loadStudents()
    } catch (err) {
      setError(err.message || 'Unable to deactivate student.')
    } finally {
      setDeactivatingId(null)
    }
  }

  return (
    <section className="student-management">
      <div className="student-management-heading">
        <div>
          <div className="student-eyebrow">FACULTY WORKSPACE</div>
          <h2>Student Management</h2>
          <p>Maintain student profiles and enrollment information.</p>
        </div>

        <button
          className="student-primary-button"
          onClick={openAddForm}
          type="button"
        >
          <Plus size={18} />
          Add student
        </button>
      </div>

      {notice && (
        <div className="student-notice" role="status">
          {notice}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="student-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={loadStudents}>
            Retry
          </button>
        </div>
      )}

      <div className="student-directory-card">
        <div className="student-directory-toolbar">
          <div className="student-search">
            <Search size={18} />
            <input
              aria-label="Search students"
              placeholder="Search by name, ID, email, class..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <label
            className="student-sort-control"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary, #64748b)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Sort by</span>
            <select
              aria-label="Sort students"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{
                minHeight: '40px',
                maxWidth: '210px',
                padding: '0 10px',
                border: '1px solid var(--border-color, #dbe2ea)',
                borderRadius: '10px',
                background: 'var(--surface, #ffffff)',
                color: 'var(--text-primary, #1e293b)',
                font: 'inherit',
              }}
            >
              <option value="default">Default order</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="student-id">Student ID</option>
              <option value="class">Class</option>
              <option value="department">Department</option>
              <option value="year-newest">Enrollment year (newest)</option>
              <option value="year-oldest">Enrollment year (oldest)</option>
              <option value="recently-added">Recently added</option>
            </select>
          </label>

          <button
            className="student-refresh-button"
            type="button"
            onClick={loadStudents}
            disabled={loading}
            aria-label="Refresh students"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="student-directory-summary">
          <div className="student-summary-icon">
            <UserRound size={20} />
          </div>
          <div>
            <strong>{pagination.total}</strong>
            <span>{search ? 'Matching students' : 'Student profiles'}</span>
          </div>
        </div>

        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Department</th>
                <th>Enrollment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="student-table-message">
                    <LoaderCircle className="student-spinner" size={22} />
                    Loading student records...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="student-table-message">
                    <UserRound size={25} />
                    <strong>No students found</strong>
                    <span>
                      {search
                        ? 'Try another search term.'
                        : 'Add your first student to get started.'}
                    </span>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div className="student-person-cell">
                        <div className="student-avatar">
                          {(student.full_name || 'S')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="student-person-details">
                          <button
                            className="student-name-link"
                            type="button"
                            onClick={() => onViewStudent?.(student._id)}
                          >
                            {student.full_name}
                          </button>
                          <span>{student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{student.student_id || '—'}</td>
                    <td>{student.class_name || '—'}</td>
                    <td>{student.department || '—'}</td>
                    <td>{student.enrollment_year || '—'}</td>
                    <td>
                      <span
                        className={`student-status ${
                          student.active
                            ? 'student-status-active'
                            : 'student-status-inactive'
                        }`}
                      >
                        {student.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="student-row-actions">
                        <button
                          type="button"
                          title="Edit student"
                          aria-label={`Edit ${student.full_name}`}
                          onClick={() => openEditForm(student)}
                        >
                          <Pencil size={16} />
                        </button>
                        {student.active && (
                          <button
                            type="button"
                            title="Deactivate student"
                            aria-label={`Deactivate ${student.full_name}`}
                            disabled={deactivatingId === student._id}
                            onClick={() => handleDeactivate(student)}
                          >
                            {deactivatingId === student._id ? (
                              <LoaderCircle
                                className="student-spinner"
                                size={16}
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="student-pagination">
          <span>
            {pagination.total === 0
              ? 'No records'
              : `Page ${page} of ${Math.max(pagination.pages, 1)} · ${pagination.total} total`}
          </span>

          <div>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pagination.pages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="student-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setModalOpen(false)
              setError('')
            }
          }}
        >
          <section
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <div className="student-modal-heading">
              <div>
                <div className="student-eyebrow">
                  {editingId ? 'UPDATE RECORD' : 'NEW RECORD'}
                </div>
                <h3 id="student-modal-title">
                  {editingId ? 'Edit student' : 'Add a student'}
                </h3>
                <p>
                  Enter the student&apos;s profile and enrollment details.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={() => {
                  setModalOpen(false)
                  setError('')
                }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="student-error" role="alert">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="student-form-grid">
                <label>
                  Student ID *
                  <input
                    name="student_id"
                    value={form.student_id}
                    onChange={updateField}
                    placeholder="e.g. EI-2026-001"
                    required
                    maxLength={50}
                  />
                </label>

                <label>
                  Full name *
                  <input
                    name="full_name"
                    value={form.full_name}
                    onChange={updateField}
                    placeholder="Student full name"
                    required
                    maxLength={120}
                  />
                </label>

                <label className="student-form-full">
                  Email address *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={updateField}
                    placeholder="student@example.com"
                    required
                    maxLength={254}
                  />
                </label>

                <label>
                  Class / Section
                  <input
                    name="class_name"
                    value={form.class_name}
                    onChange={updateField}
                    placeholder="e.g. CSE-A"
                    maxLength={100}
                  />
                </label>

                <label>
                  Department
                  <input
                    name="department"
                    value={form.department}
                    onChange={updateField}
                    placeholder="e.g. Computer Science"
                    maxLength={120}
                  />
                </label>

                <label className="student-form-full">
                  Enrollment year *
                  <input
                    type="number"
                    name="enrollment_year"
                    value={form.enrollment_year}
                    onChange={updateField}
                    min="1900"
                    max={new Date().getFullYear() + 10}
                    required
                  />
                </label>
              </div>

              <div className="student-modal-actions">
                <button
                  className="student-secondary-button"
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setModalOpen(false)
                    setError('')
                  }}
                >
                  Cancel
                </button>
                <button
                  className="student-primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving && (
                    <LoaderCircle className="student-spinner" size={17} />
                  )}
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save changes'
                      : 'Create student'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default StudentManagement

