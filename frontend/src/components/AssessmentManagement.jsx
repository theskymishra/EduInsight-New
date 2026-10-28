
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ClipboardList, RefreshCw, Save } from 'lucide-react'
import { getStudents, getStudentAssessments, recordAssessment } from '../services/api'

const today = new Date().toLocaleDateString('en-CA')

const EMPTY_FORM = {
  subject: 'Mathematics',
  assessment_name: '',
  score: '',
  max_marks: '100',
  assessment_date: today,
  notes: '',
}

function AssessmentManagement({ token }) {
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [assessments, setAssessments] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true)
    setError('')
    try {
      const result = await getStudents(token, {
        page: 1,
        pageSize: 100,
      })
      const activeStudents = (result.items || result.students || [])
        .filter((student) => student.active !== false)

      setStudents(activeStudents)
      setStudentId((current) => {
        if (activeStudents.some((student) => student._id === current)) {
          return current
        }
        return activeStudents[0]?._id || ''
      })
    } catch (err) {
      setError(err.message || 'Unable to load students.')
    } finally {
      setLoadingStudents(false)
    }
  }, [token])

  const loadAssessments = useCallback(async () => {
    if (!studentId) {
      setAssessments([])
      return
    }

    setLoadingAssessments(true)
    setError('')
    try {
      const result = await getStudentAssessments(
        token,
        studentId,
        subjectFilter,
      )
      setAssessments(result.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load assessment history.')
    } finally {
      setLoadingAssessments(false)
    }
  }, [token, studentId, subjectFilter])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    loadAssessments()
  }, [loadAssessments])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!studentId) {
      setError('Select an active student first.')
      return
    }

    const score = Number(form.score)
    const maxMarks = Number(form.max_marks)

    if (!Number.isFinite(score) || !Number.isFinite(maxMarks) ||
        score < 0 || maxMarks <= 0 || score > maxMarks) {
      setError('Enter valid marks. Score must be between 0 and maximum marks.')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')

    try {
      await recordAssessment(token, studentId, {
        subject: form.subject.trim(),
        assessment_name: form.assessment_name.trim(),
        score,
        max_marks: maxMarks,
        assessment_date: form.assessment_date,
        notes: form.notes.trim() || null,
      })

      setNotice('Assessment recorded successfully.')
      setForm((current) => ({
        ...current,
        assessment_name: '',
        score: '',
        notes: '',
      }))
      await loadAssessments()
    } catch (err) {
      setError(err.message || 'Unable to record assessment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="assessment-management">
      <div className="assessment-heading">
        <div>
          <div className="assessment-eyebrow">FACULTY WORKSPACE</div>
          <h2>Assessment Management</h2>
          <p>Record marks and review individual student assessment history.</p>
        </div>
        <button
          type="button"
          className="assessment-secondary-button"
          onClick={() => {
            loadStudents()
            loadAssessments()
          }}
          disabled={loadingStudents || loadingAssessments}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="assessment-alert assessment-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div className="assessment-alert assessment-alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="assessment-card">
        <div className="assessment-card-title">
          <ClipboardList size={19} />
          <h3>Record an assessment</h3>
        </div>

        <form className="assessment-form" onSubmit={handleSubmit}>
          <label>
            Student
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              required
              disabled={loadingStudents || students.length === 0}
            >
              {students.length === 0 && <option value="">No active students available</option>}
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.full_name} ({student.student_id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Subject
            <input
              name="subject"
              value={form.subject}
              onChange={updateField}
              maxLength={80}
              required
            />
          </label>

          <label>
            Assessment name
            <input
              name="assessment_name"
              value={form.assessment_name}
              onChange={updateField}
              maxLength={120}
              placeholder="e.g. CAT 1"
              required
            />
          </label>

          <div className="assessment-form-row">
            <label>
              Score
              <input
                type="number"
                name="score"
                value={form.score}
                onChange={updateField}
                min="0"
                step="any"
                required
              />
            </label>

            <label>
              Maximum marks
              <input
                type="number"
                name="max_marks"
                value={form.max_marks}
                onChange={updateField}
                min="0.01"
                step="any"
                required
              />
            </label>
          </div>

          <label>
            Assessment date
            <input
              type="date"
              name="assessment_date"
              value={form.assessment_date}
              onChange={updateField}
              max={today}
              required
            />
          </label>

          <label>
            Notes (optional)
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              maxLength={1000}
              rows={3}
              placeholder="Additional academic context"
            />
          </label>

          <button
            className="assessment-primary-button"
            type="submit"
            disabled={saving || loadingStudents || !studentId}
          >
            <Save size={17} />
            {saving ? 'Saving assessment…' : 'Record assessment'}
          </button>
        </form>
      </div>

      <div className="assessment-card assessment-history-card">
        <div className="assessment-history-heading">
          <div>
            <h3>Assessment history</h3>
            <p>{assessments.length} record{assessments.length === 1 ? '' : 's'}</p>
          </div>
          <label className="assessment-filter">
            Filter by subject
            <input
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              placeholder="e.g. Mathematics"
              maxLength={80}
            />
          </label>
        </div>

        {loadingAssessments ? (
          <p className="assessment-empty">Loading assessment history…</p>
        ) : assessments.length === 0 ? (
          <p className="assessment-empty">No assessments found for this student and filter.</p>
        ) : (
          <div className="assessment-table-wrapper">
            <table className="assessment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Assessment</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td>{assessment.assessment_date}</td>
                    <td>
                      <strong>{assessment.assessment_name}</strong>
                      {assessment.notes && <small>{assessment.notes}</small>}
                    </td>
                    <td>{assessment.subject}</td>
                    <td>{assessment.score} / {assessment.max_marks}</td>
                    <td>
                      <span className="assessment-percentage">
                        {Number(assessment.percentage).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

export default AssessmentManagement
