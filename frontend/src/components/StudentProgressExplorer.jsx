import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { getStudents, getStudentAssessments } from '../services/api'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

function formatPercentage(value, digits = 1) {
  return value == null || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(digits).replace(/\.0$/, '')}%`
}

function mean(items) {
  if (!items.length) return null
  return items.reduce((sum, item) => sum + Number(item.percentage), 0) / items.length
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <article className="spe-metric">
      <span className="spe-metric-icon"><Icon size={19} /></span>
      <span className="spe-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function ScoreChart({ assessments }) {
  const points = assessments
    .filter((item) => Number.isFinite(Number(item.percentage)))
    .map((item, index) => ({
      x: assessments.length === 1 ? 50 : 12 + (index / (assessments.length - 1)) * 76,
      y: 88 - (Math.max(0, Math.min(100, Number(item.percentage)) / 100) * 72),
      item,
    }))

  if (!points.length) {
    return (
      <div className="spe-empty">
        <BarChart3 size={24} />
        <strong>No valid scores to chart</strong>
        <p>Recorded assessment percentages will appear here.</p>
      </div>
    )
  }

  const path = points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
  ).join(' ')

  return (
    <div className="spe-chart-wrap">
      <svg
        className="spe-chart"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Assessment percentage trend, oldest to newest"
        preserveAspectRatio="none"
      >
        {[16, 34, 52, 70, 88].map((y) => (
          <line key={y} x1="8" x2="92" y1={y} y2={y} className="spe-grid-line" />
        ))}
        <path d={path} className="spe-chart-line" />
        {points.map((point, index) => (
          <circle
            key={point.item.id || `${point.item.assessment_date}-${index}`}
            cx={point.x}
            cy={point.y}
            r="1.6"
            className="spe-chart-point"
          >
            <title>
              {`${point.item.assessment_name}: ${formatPercentage(point.item.percentage)} on ${formatDate(point.item.assessment_date)}`}
            </title>
          </circle>
        ))}
      </svg>
      <div className="spe-chart-axis">
        <span>{formatDate(points[0].item.assessment_date)}</span>
        <span>{formatDate(points[points.length - 1].item.assessment_date)}</span>
      </div>
      <p className="spe-chart-caption">
        Assessment percentages in chronological order. The line connects recorded assessments;
        it does not estimate missing results.
      </p>
    </div>
  )
}

export default function StudentProgressExplorer({ token }) {
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [assessments, setAssessments] = useState([])
  const [subject, setSubject] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [error, setError] = useState('')
  const [assessmentError, setAssessmentError] = useState('')

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true)
    setError('')
    try {
      const allStudents = []
      let page = 1
      let pages = 1

      do {
        const result = await getStudents(token, { page, pageSize: 100 })
        allStudents.push(...(result.items || []))
        pages = Number(result.pages || 0)
        page += 1
      } while (page <= pages)

      const activeStudents = allStudents.filter((student) => student.active !== false)
      setStudents(activeStudents)
      setStudentId((current) =>
        activeStudents.some((student) => (student._id || student.id) === current)
          ? current
          : activeStudents[0]?._id || activeStudents[0]?.id || '',
      )
    } catch (err) {
      setError(err.message || 'Unable to load active students.')
    } finally {
      setLoadingStudents(false)
    }
  }, [token])

  const loadAssessments = useCallback(async () => {
    if (!studentId) {
      setAssessments([])
      setAssessmentError('')
      setLoadingAssessments(false)
      return
    }

    setLoadingAssessments(true)
    setAssessmentError('')
    try {
      const result = await getStudentAssessments(token, studentId, subject)
      const sorted = [...(result.items || [])].sort((a, b) => {
        const dateOrder = String(a.assessment_date || '').localeCompare(
          String(b.assessment_date || ''),
        )
        return dateOrder || String(a.created_at || '').localeCompare(String(b.created_at || ''))
      })
      setAssessments(sorted)
    } catch (err) {
      setAssessments([])
      setAssessmentError(err.message || 'Unable to load assessment history.')
    } finally {
      setLoadingAssessments(false)
    }
  }, [token, studentId, subject])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  useEffect(() => {
    loadAssessments()
  }, [loadAssessments])

  const selectedStudent = students.find(
    (student) => (student._id || student.id) === studentId,
  )

  const subjects = useMemo(
    () => [...new Set(assessments.map((item) => item.subject).filter(Boolean))].sort(),
    [assessments],
  )

  const average = useMemo(() => mean(assessments), [assessments])
  const earlier = useMemo(
    () => mean(assessments.slice(0, Math.floor(assessments.length / 2))),
    [assessments],
  )
  const later = useMemo(
    () => mean(assessments.slice(Math.ceil(assessments.length / 2))),
    [assessments],
  )
  const change = earlier != null && later != null ? later - earlier : null

  function handleSubjectChange(value) {
    setSubject(value)
  }

  return (
    <section className="spe-page">
      <header className="spe-heading">
        <div>
          <div className="spe-eyebrow">FACULTY WORKSPACE / ACADEMIC INSIGHTS</div>
          <h1>Student Progress Explorer</h1>
          <p>Explore recorded assessment results and how scores change over time.</p>
        </div>
        <button
          className="spe-secondary-button"
          type="button"
          onClick={() => {
            loadStudents()
            loadAssessments()
          }}
          disabled={loadingStudents || loadingAssessments}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="spe-alert" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Unable to load students</strong>
            <p>{error}</p>
            <button type="button" className="spe-inline-button" onClick={loadStudents}>
              Try again
            </button>
          </div>
        </div>
      )}

      <section className="spe-panel spe-controls">
        <div className="spe-panel-heading">
          <div className="spe-panel-icon"><Users size={19} /></div>
          <div>
            <h2>Choose a student</h2>
            <p>Only active student records are available for live assessment queries.</p>
          </div>
        </div>
        <div className="spe-control-grid">
          <label className="spe-field">
            <span>Student</span>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={loadingStudents || students.length === 0}
            >
              {students.length === 0 && <option value="">No active students available</option>}
              {students.map((student) => (
                <option key={student._id || student.id} value={student._id || student.id}>
                  {student.full_name} · {student.student_id || 'No student ID'}
                </option>
              ))}
            </select>
          </label>
          <label className="spe-field">
            <span>Subject</span>
            <select
              value={subject}
              onChange={handleSubjectChange}
              disabled={!studentId || loadingAssessments}
            >
              <option value="">All subjects</option>
              {subjects.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {loadingStudents ? (
        <div className="spe-state">
          <RefreshCw size={25} className="spe-spinner" />
          <h2>Loading active students</h2>
        </div>
      ) : !students.length ? (
        <div className="spe-empty">
          <Users size={26} />
          <strong>No active students found</strong>
          <p>Active student records will be available here when they exist.</p>
        </div>
      ) : (
        <>
          <section className="spe-student-banner">
            <div className="spe-avatar">
              {(selectedStudent?.full_name || 'S').trim().split(/\s+/).slice(0, 2)
                .map((part) => part[0]?.toUpperCase()).join('')}
            </div>
            <div>
              <span>SELECTED STUDENT</span>
              <h2>{selectedStudent?.full_name || 'Student'}</h2>
              <p>
                {selectedStudent?.student_id || 'Student ID not assigned'}
                {selectedStudent?.class_name ? ` · ${selectedStudent.class_name}` : ''}
                {selectedStudent?.department ? ` · ${selectedStudent.department}` : ''}
              </p>
            </div>
          </section>

          {assessmentError && (
            <div className="spe-alert" role="alert">
              <AlertCircle size={19} />
              <div>
                <strong>Unable to load assessments</strong>
                <p>{assessmentError}</p>
                <button type="button" className="spe-inline-button" onClick={loadAssessments}>
                  Try again
                </button>
              </div>
            </div>
          )}

          <section className="spe-metrics">
            <Metric
              icon={ClipboardList}
              label="Recorded assessments"
              value={loadingAssessments ? '…' : assessments.length}
              detail={subject || 'Across all subjects'}
            />
            <Metric
              icon={BarChart3}
              label="Average percentage"
              value={loadingAssessments ? '…' : formatPercentage(average)}
              detail="Unweighted mean of recorded percentages"
            />
            <Metric
              icon={change == null || change >= 0 ? TrendingUp : TrendingDown}
              label="Earlier vs later"
              value={loadingAssessments ? '…' : change == null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)} pp`}
              detail={change == null ? 'More assessments needed for comparison' : 'Later half minus earlier half'}
            />
          </section>

          <section className="spe-panel">
            <div className="spe-panel-heading">
              <div className="spe-panel-icon"><TrendingUp size={19} /></div>
              <div>
                <h2>Assessment trend</h2>
                <p>Actual recorded percentages, ordered from oldest to newest.</p>
              </div>
            </div>
            {loadingAssessments ? (
              <div className="spe-loading-inline"><RefreshCw size={18} className="spe-spinner" /> Loading assessment data…</div>
            ) : assessmentError ? null : assessments.length ? (
              <ScoreChart assessments={assessments} />
            ) : (
              <div className="spe-empty">
                <BookOpen size={24} />
                <strong>No assessments recorded</strong>
                <p>Assessment results will appear after faculty records them for this student.</p>
              </div>
            )}
          </section>

          <section className="spe-panel">
            <div className="spe-panel-heading">
              <div className="spe-panel-icon"><CalendarDays size={19} /></div>
              <div>
                <h2>Assessment history</h2>
                <p>Scores, maximum marks, subject, and recorded date.</p>
              </div>
              <span className="spe-count">{assessments.length} records</span>
            </div>
            {loadingAssessments ? (
              <div className="spe-loading-inline"><RefreshCw size={18} className="spe-spinner" /> Loading assessment history…</div>
            ) : assessmentError ? null : assessments.length ? (
              <div className="spe-table-wrap">
                <table className="spe-table">
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
                    {[...assessments].reverse().map((item, index) => (
                      <tr key={item.id || `${item.assessment_date}-${index}`}>
                        <td>{formatDate(item.assessment_date)}</td>
                        <td>
                          <strong>{item.assessment_name || 'Assessment'}</strong>
                          {item.notes && <small className="spe-notes">{item.notes}</small>}
                        </td>
                        <td>{item.subject || '—'}</td>
                        <td>{item.score} / {item.max_marks}</td>
                        <td>
                          <div className="spe-score-cell">
                            <strong>{formatPercentage(item.percentage, 2)}</strong>
                            <span className="spe-score-track">
                              <span style={{ width: `${Math.max(0, Math.min(100, Number(item.percentage) || 0))}%` }} />
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="spe-empty">
                <ClipboardList size={24} />
                <strong>No assessment history</strong>
                <p>There are no recorded assessments for the current selection.</p>
              </div>
            )}
          </section>

          <p className="spe-disclaimer">
            These summaries describe recorded assessment results only. The earlier-versus-later
            comparison splits the chronological list into two halves and does not establish
            causation, topic mastery, or intervention effectiveness.
          </p>
        </>
      )}
    </section>
  )
}
