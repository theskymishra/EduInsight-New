import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  Plus,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import {
  createIntervention,
  getInterventions,
  getStudents,
  updateIntervention,
} from '../services/api'

const EMPTY_FORM = {
  student_profile_id: '',
  title: '',
  concern: '',
  action_plan: '',
  priority: 'medium',
  assigned_to: '',
  target_date: '',
  notes: '',
}

const STATUS_LABELS = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
}

function StudentInterventions({ token }) {
  const [students, setStudents] = useState([])
  const [interventions, setInterventions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true)
    try {
      const result = await getStudents(token, { page: 1, pageSize: 100 })
      setStudents(result.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load active students.')
    } finally {
      setStudentsLoading(false)
    }
  }, [token])

  const loadInterventions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getInterventions(token, { status: statusFilter })
      setInterventions(result.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load interventions.')
    } finally {
      setLoading(false)
    }
  }, [token, statusFilter])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    loadInterventions()
  }, [loadInterventions])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      await createIntervention(token, {
        ...form,
        assigned_to: form.assigned_to.trim() || null,
        notes: form.notes.trim() || null,
      })
      setForm(EMPTY_FORM)
      setNotice('Student intervention created successfully.')
      await loadInterventions()
    } catch (err) {
      setError(err.message || 'Unable to create intervention.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(intervention, changes) {
    setUpdatingId(intervention.id)
    setError('')
    setNotice('')
    try {
      await updateIntervention(token, intervention.id, changes)
      setNotice('Intervention updated successfully.')
      await loadInterventions()
    } catch (err) {
      setError(err.message || 'Unable to update intervention.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="student-interventions">
      <div className="student-management-heading">
        <div>
          <div className="student-eyebrow">FACULTY WORKSPACE</div>
          <h2>Student Interventions</h2>
          <p>Plan, track, and follow up on individual student support.</p>
        </div>
      </div>

      {notice && (
        <div className="student-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="student-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={() => {
            loadStudents()
            loadInterventions()
          }}>
            Retry
          </button>
        </div>
      )}

      <div className="student-directory-card intervention-form-card">
        <div className="intervention-section-heading">
          <div className="intervention-heading-icon">
            <Plus size={19} />
          </div>
          <div>
            <h3>Create an intervention</h3>
            <p>Record a concern and the planned support action.</p>
          </div>
        </div>

        <form className="intervention-form" onSubmit={handleCreate}>
          <label>
            Student
            <select
              name="student_profile_id"
              value={form.student_profile_id}
              onChange={updateForm}
              required
              disabled={studentsLoading || students.length === 0}
            >
              <option value="">
                {studentsLoading ? 'Loading students…' : 'Select an active student'}
              </option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.full_name} ({student.student_id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Intervention title
            <input
              name="title"
              value={form.title}
              onChange={updateForm}
              minLength={3}
              maxLength={120}
              placeholder="e.g. Mathematics improvement plan"
              required
            />
          </label>

          <label className="intervention-field-wide">
            Concern
            <textarea
              name="concern"
              value={form.concern}
              onChange={updateForm}
              minLength={3}
              maxLength={1000}
              rows={3}
              placeholder="Describe the academic or attendance concern."
              required
            />
          </label>

          <label className="intervention-field-wide">
            Action plan
            <textarea
              name="action_plan"
              value={form.action_plan}
              onChange={updateForm}
              minLength={3}
              maxLength={2000}
              rows={3}
              placeholder="Describe the support actions and expected outcome."
              required
            />
          </label>

          <label>
            Priority
            <select name="priority" value={form.priority} onChange={updateForm}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label>
            Assigned faculty
            <input
              name="assigned_to"
              value={form.assigned_to}
              onChange={updateForm}
              maxLength={120}
              placeholder="Faculty name (optional)"
            />
          </label>

          <label>
            Target date
            <input
              type="date"
              name="target_date"
              value={form.target_date}
              onChange={updateForm}
              min={new Date().toLocaleDateString('en-CA')}
              required
            />
          </label>

          <label className="intervention-field-wide">
            Initial notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateForm}
              maxLength={2000}
              rows={2}
              placeholder="Optional context or follow-up notes."
            />
          </label>

          <div className="intervention-form-actions">
            <button className="student-primary-button" type="submit" disabled={saving || studentsLoading || students.length === 0}>
              {saving ? <LoaderCircle size={17} className="intervention-spinner" /> : <Plus size={17} />}
              {saving ? 'Creating…' : 'Create intervention'}
            </button>
          </div>
        </form>
      </div>

      <div className="intervention-list-heading">
        <div>
          <h3>Intervention records</h3>
          <p>Review current plans and update progress.</p>
        </div>
        <button className="intervention-refresh-button" type="button" onClick={loadInterventions} disabled={loading}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="intervention-filter">
        <label htmlFor="intervention-status-filter">Filter by status</label>
        <select
          id="intervention-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <span>{interventions.length} record{interventions.length === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="intervention-empty-state">
          <LoaderCircle size={24} className="intervention-spinner" />
          <p>Loading interventions…</p>
        </div>
      ) : interventions.length === 0 ? (
        <div className="intervention-empty-state">
          <ClipboardList size={28} />
          <h3>No interventions found</h3>
          <p>Create an intervention above or select a different status filter.</p>
        </div>
      ) : (
        <div className="intervention-record-list">
          {interventions.map((item) => (
            <article className="intervention-record-card" key={item.id}>
              <div className="intervention-record-top">
                <div>
                  <div className="intervention-student-label">
                    <UserRound size={15} />
                    {item.student_name} · {item.student_id}
                  </div>
                  <h3>{item.title}</h3>
                </div>
                <span className={`intervention-priority priority-${item.priority}`}>
                  {item.priority}
                </span>
              </div>

              <div className="intervention-record-grid">
                <div>
                  <span className="intervention-detail-label">Concern</span>
                  <p>{item.concern}</p>
                </div>
                <div>
                  <span className="intervention-detail-label">Action plan</span>
                  <p>{item.action_plan}</p>
                </div>
              </div>

              <div className="intervention-record-meta">
                <span><CalendarDays size={15} /> Target: {item.target_date}</span>
                <span>Assigned: {item.assigned_to || 'Unassigned'}</span>
              </div>

              <div className="intervention-record-update">
                <label>
                  Status
                  <select
                    value={item.status}
                    disabled={updatingId === item.id}
                    onChange={(event) => handleUpdate(item, { status: event.target.value })}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Follow-up notes
                  <textarea
                    key={`${item.id}-${item.updated_at}`}
                    defaultValue={item.notes || ''}
                    maxLength={2000}
                    rows={2}
                    placeholder="Add follow-up notes, then save."
                  />
                </label>

                <button
                  className="intervention-save-notes"
                  type="button"
                  disabled={updatingId === item.id}
                  onClick={(event) => {
                    const textarea = event.currentTarget.parentElement.querySelector('textarea')
                    handleUpdate(item, { notes: textarea.value.trim() })
                  }}
                >
                  {updatingId === item.id ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default StudentInterventions
