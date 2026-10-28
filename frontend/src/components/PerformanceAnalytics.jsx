import { useCallback, useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { getPerformanceAnalytics } from '../services/api'

function formatPercentage(value) {
  return value == null ? '—' : `${Number(value).toFixed(1)}%`
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="pa-metric-card">
      <div className="pa-metric-icon"><Icon size={20} /></div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  )
}

function ProgressBar({ value }) {
  const percentage = value == null
    ? 0
    : Math.min(100, Math.max(0, Number(value)))

  return (
    <div
      className="pa-progress-track"
      role="progressbar"
      aria-label={`Score ${formatPercentage(value)}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div className="pa-progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  )
}

export default function PerformanceAnalytics({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getPerformanceAnalytics(token)
      setData(result)
    } catch (err) {
      setError(err.message || 'Unable to load performance analytics.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (loading && !data) {
    return (
      <section className="pa-page">
        <div className="pa-state">
          <RefreshCw size={25} className="pa-spinner" />
          <h2>Loading performance analytics</h2>
          <p>Gathering the latest recorded attendance and assessment data.</p>
        </div>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="pa-page">
        <div className="pa-state pa-error-state" role="alert">
          <AlertCircle size={28} />
          <h2>Analytics could not be loaded</h2>
          <p>{error}</p>
          <button className="pa-primary-button" onClick={loadAnalytics} type="button">
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      </section>
    )
  }

  const summary = data?.summary ?? {}
  const students = data?.students ?? []
  const subjects = data?.subjects ?? []

  return (
    <section className="pa-page">
      <header className="pa-heading">
        <div>
          <div className="pa-eyebrow"><Activity size={15} /> ACADEMIC INSIGHTS</div>
          <h1>Performance Analytics</h1>
          <p>Understand academic progress through recorded assessments and attendance.</p>
        </div>
        <button
          className="pa-secondary-button"
          type="button"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'pa-spinner' : ''} />
          {loading ? 'Refreshing…' : 'Refresh data'}
        </button>
      </header>

      {error && (
        <div className="pa-inline-error" role="alert">
          Latest refresh failed: {error}. Displaying the last successfully loaded results.
        </div>
      )}

      <div className="pa-live-note">
        <span className="pa-live-dot" />
        Live EduInsight records
        <span>·</span>
        Metrics update when you refresh this page
      </div>

      <div className="pa-metrics-grid">
        <MetricCard
          icon={Users}
          label="Active students"
          value={summary.active_students ?? 0}
          detail="Active student profiles"
        />
        <MetricCard
          icon={ClipboardList}
          label="Assessment records"
          value={summary.assessment_count ?? 0}
          detail="Recorded assessments"
        />
        <MetricCard
          icon={TrendingUp}
          label="Average assessment score"
          value={formatPercentage(summary.average_assessment_percentage)}
          detail="Mean across recorded assessments"
        />
        <MetricCard
          icon={CalendarCheck}
          label="Attendance percentage"
          value={formatPercentage(summary.attendance_percentage)}
          detail="Present ÷ Present and Absent"
        />
      </div>

      <div className="pa-section-grid">
        <section className="pa-panel">
          <div className="pa-panel-heading">
            <div>
              <h2>Subject performance</h2>
              <p>Average percentage across recorded assessments per subject.</p>
            </div>
            <BarChart3 size={21} />
          </div>

          {subjects.length ? (
            <div className="pa-subject-list">
              {subjects.map((subject) => (
                <div className="pa-subject-row" key={subject.subject}>
                  <div className="pa-subject-top">
                    <strong>{subject.subject}</strong>
                    <span>{formatPercentage(subject.average_percentage)}</span>
                  </div>
                  <ProgressBar value={subject.average_percentage} />
                  <small>
                    {subject.assessment_count} assessment
                    {subject.assessment_count === 1 ? '' : 's'}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <p className="pa-empty">No assessment records are available yet.</p>
          )}
        </section>

        <section className="pa-panel">
          <div className="pa-panel-heading">
            <div>
              <h2>Attendance overview</h2>
              <p>Recorded attendance statuses across active students.</p>
            </div>
            <CalendarCheck size={21} />
          </div>
          <div className="pa-attendance-total">
            <span>Total records</span>
            <strong>{summary.attendance_records ?? 0}</strong>
          </div>
          <div className="pa-attendance-row">
            <span><i className="pa-status-dot pa-present-dot" /> Present</span>
            <strong>{summary.present ?? 0}</strong>
          </div>
          <div className="pa-attendance-row">
            <span><i className="pa-status-dot pa-absent-dot" /> Absent</span>
            <strong>{summary.absent ?? 0}</strong>
          </div>
          <div className="pa-attendance-row">
            <span><i className="pa-status-dot pa-leave-dot" /> Leave</span>
            <strong>{summary.leave ?? 0}</strong>
          </div>
          <p className="pa-footnote">
            Leave records are excluded from the attendance percentage denominator.
          </p>
        </section>
      </div>

      <section className="pa-panel pa-students-panel">
        <div className="pa-panel-heading">
          <div>
            <h2>Student performance</h2>
            <p>Individual assessment averages and attendance for active students.</p>
          </div>
          <span className="pa-count-pill">{students.length} {students.length === 1 ? 'student' : 'students'}</span>
        </div>

        {students.length ? (
          <div className="pa-table-wrap">
            <table className="pa-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Assessments</th>
                  <th>Average score</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="pa-student-name">{student.full_name}</div>
                      <div className="pa-student-meta">
                        {student.student_id}
                        {student.department ? ` · ${student.department}` : ''}
                        {student.class_name ? ` · ${student.class_name}` : ''}
                      </div>
                    </td>
                    <td>{student.assessment_count}</td>
                    <td>
                      <span className="pa-score-value">
                        {formatPercentage(student.average_percentage)}
                      </span>
                      {student.average_percentage != null && (
                        <ProgressBar value={student.average_percentage} />
                      )}
                    </td>
                    <td>
                      <span className="pa-score-value">
                        {formatPercentage(student.attendance_percentage)}
                      </span>
                      {student.attendance_percentage != null && (
                        <ProgressBar value={student.attendance_percentage} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pa-empty">No active student profiles are available.</p>
        )}
      </section>

      <div className="pa-disclaimer">
        <AlertCircle size={18} />
        <p>
          These summaries reflect currently recorded data only. Missing records
          are shown as unavailable, not as zero performance. Averages are
          descriptive indicators, not validated predictions or diagnoses.
        </p>
      </div>

      <p className="pa-source">{data?.data_source || 'EduInsight performance records'}</p>
    </section>
  )
}
