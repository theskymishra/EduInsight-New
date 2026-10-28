import { useCallback, useEffect, useState } from 'react'
import {
  getStudents,
  recordAttendance,
  getStudentAttendance,
  getStudentAttendanceSummary,
} from '../services/api'

function todayString() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10)
}

export default function AttendanceManagement({ token }) {
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(todayString())
  const [status, setStatus] = useState('Present')
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadStudents() {
      setLoadingStudents(true)
      setError('')

      try {
        const data = await getStudents(token, {
          page: 1,
          pageSize: 100,
        })

        if (cancelled) return

        const studentList = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.students)
            ? data.students
            : []

        const activeStudents = studentList.filter(
          (student) => student.active !== false,
        )

        setStudents(activeStudents)
        setStudentId((current) =>
          activeStudents.some((student) => student._id === current)
            ? current
            : activeStudents[0]?._id || '',
        )
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoadingStudents(false)
      }
    }

    loadStudents()

    return () => {
      cancelled = true
    }
  }, [token])

  const loadAttendance = useCallback(async () => {
    if (!studentId) {
      setHistory([])
      setSummary(null)
      return
    }

    setLoadingHistory(true)
    setError('')

    try {
      const filters = {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      }

      const [historyData, summaryData] = await Promise.all([
        getStudentAttendance(token, studentId, filters),
        getStudentAttendanceSummary(token, studentId),
      ])

      setHistory(
        Array.isArray(historyData)
          ? historyData
          : Array.isArray(historyData.items)
            ? historyData.items
            : [],
      )
      setSummary(summaryData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingHistory(false)
    }
  }, [token, studentId, filterStatus, startDate, endDate])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!studentId) {
      setError('Select a student before recording attendance.')
      return
    }

    setSaving(true)

    try {
      await recordAttendance(token, studentId, {
        attendance_date: attendanceDate,
        attendance_status: status,
        notes: notes.trim() || null,
      })

      setMessage('Attendance recorded successfully.')
      setNotes('')
      await loadAttendance()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="attendance-management">
      <div className="attendance-heading">
        <div>
          <p className="attendance-eyebrow">STUDENT RECORDS</p>
          <h2>Attendance Management</h2>
          <p>Record attendance and review each student's attendance history.</p>
        </div>
      </div>

      {error && (
        <div className="attendance-alert attendance-error" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="attendance-alert attendance-success" role="status">
          {message}
        </div>
      )}

      <section className="attendance-card">
        <h3>Record attendance</h3>

        {loadingStudents ? (
          <p>Loading students…</p>
        ) : students.length === 0 ? (
          <p>No active students found. Add a student in Student Management first.</p>
        ) : (
          <form className="attendance-form" onSubmit={handleSubmit}>
            <label>
              Student
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                required
              >
                {students.map((student) => (
                  <option key={student._id} value={student._id}>
                    {student.full_name} ({student.student_id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input
                type="date"
                value={attendanceDate}
                max={todayString()}
                onChange={(event) => setAttendanceDate(event.target.value)}
                required
              />
            </label>

            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                required
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
              </select>
            </label>

            <label className="attendance-notes-field">
              Notes (optional)
              <input
                type="text"
                maxLength={500}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add a short note"
              />
            </label>

            <div className="attendance-form-actions">
              <button type="submit" disabled={saving || !studentId}>
                {saving ? 'Saving…' : 'Record attendance'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="attendance-summary-grid">
        <article className="attendance-stat">
          <span>Total records</span>
          <strong>{summary?.total_records ?? '—'}</strong>
        </article>
        <article className="attendance-stat">
          <span>Present</span>
          <strong>{summary?.present ?? '—'}</strong>
        </article>
        <article className="attendance-stat">
          <span>Absent</span>
          <strong>{summary?.absent ?? '—'}</strong>
        </article>
        <article className="attendance-stat">
          <span>Attendance rate</span>
          <strong>
            {summary?.attendance_percentage == null
              ? '—'
              : `${summary.attendance_percentage}%`}
          </strong>
        </article>
      </section>

      <section className="attendance-card">
        <div className="attendance-history-heading">
          <div>
            <h3>Attendance history</h3>
            <p>Filter the records for the selected student.</p>
          </div>
          <button
            type="button"
            className="attendance-secondary-button"
            onClick={loadAttendance}
            disabled={loadingHistory}
          >
            {loadingHistory ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="attendance-filters">
          <label>
            Status
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Leave">Leave</option>
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={startDate}
              max={endDate || todayString()}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={todayString()}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                <tr>
                  <td colSpan="3">Loading attendance…</td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan="3">No attendance records found.</td>
                </tr>
              ) : (
                history.map((record) => {
                  const recordStatus =
                    record.attendance_status ?? record.status ?? ''

                  return (
                    <tr key={record.id}>
                      <td>{String(record.attendance_date || '').slice(0, 10)}</td>
                      <td>
                        <span
                          className={`attendance-status attendance-status-${String(
                            recordStatus,
                          ).toLowerCase()}`}
                        >
                          {recordStatus}
                        </span>
                      </td>
                      <td>{record.notes || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}