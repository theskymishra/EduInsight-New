import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  XCircle,
} from 'lucide-react'
import { getStudentPortalDashboard } from '../services/api'

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

function getScoreBadgeClass(percentage) {
  if (percentage == null) return 'badge-neutral'
  const num = Number(percentage)
  if (num >= 75) return 'badge-high'
  if (num >= 50) return 'badge-mid'
  return 'badge-low'
}

function getStatusBadge(status) {
  switch (status) {
    case 'Present':
      return {
        icon: CheckCircle2,
        className: 'badge-present',
        label: 'Present',
      }
    case 'Absent':
      return {
        icon: XCircle,
        className: 'badge-absent',
        label: 'Absent',
      }
    case 'Leave':
      return {
        icon: Clock3,
        className: 'badge-leave',
        label: 'Approved Leave',
      }
    default:
      return {
        icon: Info,
        className: 'badge-neutral',
        label: status || 'Unknown',
      }
  }
}

function MiniProgressChart({ assessments }) {
  const points = useMemo(() => {
    const valid = assessments
      .filter((item) => Number.isFinite(Number(item.percentage)))
      .slice()
      .sort((a, b) => (a.assessment_date > b.assessment_date ? 1 : -1))

    return valid.map((item, index) => ({
      x: valid.length === 1 ? 50 : 8 + (index / (valid.length - 1)) * 84,
      y: 90 - (Math.max(0, Math.min(100, Number(item.percentage)) / 100) * 78),
      item,
    }))
  }, [assessments])

  if (!points.length) {
    return (
      <div className="student-chart-empty">
        <BarChart3 size={24} />
        <p>No assessment scores available to chart</p>
      </div>
    )
  }

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className="student-chart-container">
      <svg
        className="student-svg-chart"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Student performance trend"
        preserveAspectRatio="none"
      >
        {[18, 36, 54, 72, 90].map((y) => (
          <line
            key={y}
            x1="4"
            x2="96"
            y1={y}
            y2={y}
            className="student-chart-gridline"
          />
        ))}
        {points.length > 1 && <path d={path} className="student-chart-line" />}
        {points.map((point, idx) => (
          <circle
            key={point.item.id || idx}
            cx={point.x}
            cy={point.y}
            r="2.2"
            className="student-chart-dot"
          >
            <title>{`${point.item.subject} - ${point.item.assessment_name}: ${formatPercentage(point.item.percentage)} (${formatDate(point.item.assessment_date)})`}</title>
          </circle>
        ))}
      </svg>
      <div className="student-chart-axis">
        <span>{formatDate(points[0].item.assessment_date)}</span>
        <span>{formatDate(points[points.length - 1].item.assessment_date)}</span>
      </div>
    </div>
  )
}

export default function StudentPortal({ token, activeTab = 'overview', onTabChange }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Sub-view filtering/sorting states
  const [assessmentSubjectFilter, setAssessmentSubjectFilter] = useState('ALL')
  const [assessmentSortBy, setAssessmentSortBy] = useState('date-desc')
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('ALL')
  const [progressSubjectFilter, setProgressSubjectFilter] = useState('ALL')

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    getStudentPortalDashboard(token)
      .then((result) => {
        if (active) {
          setData(result)
          setError('')
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load your student workspace.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      })

    return () => {
      active = false
    }
  }, [token, refreshKey])

  function handleManualRefresh() {
    setRefreshing(true)
    setRefreshKey((k) => k + 1)
  }

  // Extract subjects for filters
  const subjects = useMemo(() => {
    if (!data?.assessments?.items) return []
    const set = new Set()
    data.assessments.items.forEach((item) => {
      if (item.subject) set.add(item.subject)
    })
    return Array.from(set).sort()
  }, [data])

  // Filtered and sorted assessments
  const filteredAssessments = useMemo(() => {
    if (!data?.assessments?.items) return []
    let list = data.assessments.items.slice()

    if (assessmentSubjectFilter !== 'ALL') {
      list = list.filter((item) => item.subject === assessmentSubjectFilter)
    }

    list.sort((a, b) => {
      if (assessmentSortBy === 'date-desc') {
        return (b.assessment_date || '').localeCompare(a.assessment_date || '')
      }
      if (assessmentSortBy === 'date-asc') {
        return (a.assessment_date || '').localeCompare(b.assessment_date || '')
      }
      if (assessmentSortBy === 'score-desc') {
        return (Number(b.percentage) || 0) - (Number(a.percentage) || 0)
      }
      if (assessmentSortBy === 'score-asc') {
        return (Number(a.percentage) || 0) - (Number(b.percentage) || 0)
      }
      return 0
    })

    return list
  }, [data, assessmentSubjectFilter, assessmentSortBy])

  // Filtered attendance items
  const filteredAttendance = useMemo(() => {
    if (!data?.attendance?.items) return []
    let list = data.attendance.items.slice()

    if (attendanceStatusFilter !== 'ALL') {
      list = list.filter((item) => item.attendance_status === attendanceStatusFilter)
    }

    return list.sort((a, b) =>
      (b.attendance_date || '').localeCompare(a.attendance_date || ''),
    )
  }, [data, attendanceStatusFilter])

  // Chronological progress items
  const progressAssessments = useMemo(() => {
    if (!data?.assessments?.items) return []
    let list = data.assessments.items.slice()

    if (progressSubjectFilter !== 'ALL') {
      list = list.filter((item) => item.subject === progressSubjectFilter)
    }

    return list.sort((a, b) =>
      (a.assessment_date || '').localeCompare(b.assessment_date || ''),
    )
  }, [data, progressSubjectFilter])

  const progressAverage = useMemo(() => {
    if (!progressAssessments.length) return null
    const valid = progressAssessments.filter((item) =>
      Number.isFinite(Number(item.percentage)),
    )
    if (!valid.length) return null
    const sum = valid.reduce((acc, curr) => acc + Number(curr.percentage), 0)
    return roundToTwo(sum / valid.length)
  }, [progressAssessments])

  function roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100
  }

  if (loading && !data) {
    return (
      <section className="student-portal-state" role="status">
        <LoaderCircle className="student-portal-spinner" size={32} />
        <h2>Loading your student workspace</h2>
        <p>Connecting to EduInsight and retrieving your verified academic records.</p>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="student-portal-state student-portal-error" role="alert">
        <AlertCircle size={36} />
        <h2>Unable to load your academic records</h2>
        <p>{error}</p>
        <button
          className="student-primary-button"
          type="button"
          onClick={() => {
            setLoading(true)
            setRefreshKey((k) => k + 1)
          }}
        >
          <RefreshCw size={16} /> Try again
        </button>
      </section>
    )
  }

  const profile = data?.profile || {}
  const assessmentsData = data?.assessments || { total: 0, average_percentage: null, items: [] }
  const attendanceData = data?.attendance || {
    total_records: 0,
    present: 0,
    absent: 0,
    leave: 0,
    attendance_percentage: null,
    percentage_basis: 'Present / (Present + Absent); Leave excluded',
    items: [],
  }

  const recentAssessments = assessmentsData.items.slice(0, 4)

  return (
    <div className="student-portal">
      {/* Student Welcome & Identity Header */}
      <header className="student-portal-header">
        <div className="student-identity">
          <div className="student-portal-avatar">
            {(profile.full_name || profile.student_id || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="student-identity-text">
            <div className="student-portal-badge-row">
              <span className="student-id-pill">
                <GraduationCap size={14} />
                {profile.student_id || 'ID Pending'}
              </span>
              <span className="student-verified-pill">
                <ShieldCheck size={13} /> Active Profile
              </span>
              {profile.class_name && (
                <span className="student-class-pill">
                  {profile.class_name}
                </span>
              )}
            </div>
            <h1>{profile.full_name || 'Student Workspace'}</h1>
            <p className="student-department-line">
              {profile.department || 'Enrolled Student'}
              {profile.enrollment_year ? ` · Class of ${profile.enrollment_year}` : ''}
              {profile.email ? ` · ${profile.email}` : ''}
            </p>
          </div>
        </div>

        <div className="student-portal-header-actions">
          <button
            type="button"
            className="student-refresh-button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            aria-label="Refresh student data"
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'student-spinning-icon' : ''}
            />
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="dashboard-inline-error" role="alert">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Main Tabs Navigation */}
      <nav className="student-tabs-nav" aria-label="Student Portal Sections">
        <button
          type="button"
          className={`student-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('overview')}
        >
          <BarChart3 size={16} />
          Overview
        </button>
        <button
          type="button"
          className={`student-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('profile')}
        >
          <UserRound size={16} />
          My Profile
        </button>
        <button
          type="button"
          className={`student-tab-btn ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('assessments')}
        >
          <FileText size={16} />
          Assessments
          {assessmentsData.total > 0 && (
            <span className="tab-counter-badge">{assessmentsData.total}</span>
          )}
        </button>
        <button
          type="button"
          className={`student-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('attendance')}
        >
          <CalendarDays size={16} />
          Attendance
          {attendanceData.total_records > 0 && (
            <span className="tab-counter-badge">{attendanceData.total_records}</span>
          )}
        </button>
        <button
          type="button"
          className={`student-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => onTabChange && onTabChange('progress')}
        >
          <TrendingUp size={16} />
          Academic Progress
        </button>
      </nav>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="student-tab-pane">
          {/* Top KPI Cards */}
          <div className="student-metric-grid">
            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-blue">
                <BarChart3 size={20} />
              </div>
              <span className="kpi-label">Average Score</span>
              <strong className="kpi-value">
                {formatPercentage(assessmentsData.average_percentage)}
              </strong>
              <span className="kpi-sub">
                {assessmentsData.total === 0
                  ? 'No assessments recorded'
                  : `Across ${assessmentsData.total} recorded assessment${assessmentsData.total === 1 ? '' : 's'}`}
              </span>
            </article>

            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-green">
                <CheckCircle2 size={20} />
              </div>
              <span className="kpi-label">Attendance Rate</span>
              <strong className="kpi-value">
                {formatPercentage(attendanceData.attendance_percentage)}
              </strong>
              <span className="kpi-sub">
                {attendanceData.total_records === 0
                  ? 'No attendance records logged'
                  : `${attendanceData.present} present of ${attendanceData.present + attendanceData.absent} class days`}
              </span>
            </article>

            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-violet">
                <Award size={20} />
              </div>
              <span className="kpi-label">Assessments Completed</span>
              <strong className="kpi-value">{assessmentsData.total}</strong>
              <span className="kpi-sub">
                {subjects.length > 0
                  ? `In ${subjects.length} subject${subjects.length === 1 ? '' : 's'}`
                  : 'Awaiting faculty evaluation'}
              </span>
            </article>

            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-amber">
                <Clock3 size={20} />
              </div>
              <span className="kpi-label">Approved Leave</span>
              <strong className="kpi-value">{attendanceData.leave}</strong>
              <span className="kpi-sub">
                Excluded from attendance percentage
              </span>
            </article>
          </div>

          {/* Two-column overview layout */}
          <div className="student-overview-layout">
            {/* Left: Recent Assessments */}
            <div className="student-overview-card">
              <div className="overview-card-header">
                <div>
                  <h3>Recent Assessments</h3>
                  <p>Latest performance evaluations recorded by faculty</p>
                </div>
                {assessmentsData.total > 0 && (
                  <button
                    type="button"
                    className="overview-link-btn"
                    onClick={() => onTabChange && onTabChange('assessments')}
                  >
                    View all ({assessmentsData.total})
                  </button>
                )}
              </div>

              {recentAssessments.length === 0 ? (
                <div className="student-empty-card-content">
                  <BookOpen size={28} />
                  <h4>No assessments on record</h4>
                  <p>
                    Your instructors have not recorded any assessments yet.
                    New grades will appear here as soon as they are submitted.
                  </p>
                </div>
              ) : (
                <div className="student-recent-list">
                  {recentAssessments.map((item) => (
                    <div className="student-recent-row" key={item.id}>
                      <div className="recent-meta">
                        <span className="recent-subject">{item.subject}</span>
                        <strong className="recent-name">{item.assessment_name}</strong>
                        <span className="recent-date">
                          {formatDate(item.assessment_date)}
                        </span>
                      </div>
                      <div className="recent-score-wrap">
                        <span className={`recent-badge ${getScoreBadgeClass(item.percentage)}`}>
                          {formatPercentage(item.percentage)}
                        </span>
                        <small className="recent-raw">
                          {item.score} / {item.max_marks} marks
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Performance Trend & Attendance Snapshot */}
            <div className="student-overview-card">
              <div className="overview-card-header">
                <div>
                  <h3>Performance Trend</h3>
                  <p>Chronological assessment trajectory</p>
                </div>
                {assessmentsData.total > 1 && (
                  <button
                    type="button"
                    className="overview-link-btn"
                    onClick={() => onTabChange && onTabChange('progress')}
                  >
                    Explore
                  </button>
                )}
              </div>

              <div className="overview-chart-preview">
                <MiniProgressChart assessments={assessmentsData.items} />
              </div>

              <div className="overview-attendance-summary">
                <div className="attendance-bar-label">
                  <span>Attendance Distribution</span>
                  <small>
                    {attendanceData.total_records} Total Session
                    {attendanceData.total_records === 1 ? '' : 's'}
                  </small>
                </div>
                <div className="attendance-multi-bar">
                  {attendanceData.total_records > 0 ? (
                    <>
                      <div
                        className="bar-segment bar-present"
                        style={{
                          width: `${(attendanceData.present / attendanceData.total_records) * 100}%`,
                        }}
                        title={`Present: ${attendanceData.present}`}
                      />
                      <div
                        className="bar-segment bar-absent"
                        style={{
                          width: `${(attendanceData.absent / attendanceData.total_records) * 100}%`,
                        }}
                        title={`Absent: ${attendanceData.absent}`}
                      />
                      <div
                        className="bar-segment bar-leave"
                        style={{
                          width: `${(attendanceData.leave / attendanceData.total_records) * 100}%`,
                        }}
                        title={`Leave: ${attendanceData.leave}`}
                      />
                    </>
                  ) : (
                    <div className="bar-segment bar-empty" style={{ width: '100%' }} />
                  )}
                </div>
                <div className="attendance-legend">
                  <span>
                    <span className="dot dot-present" /> Present: {attendanceData.present}
                  </span>
                  <span>
                    <span className="dot dot-absent" /> Absent: {attendanceData.absent}
                  </span>
                  <span>
                    <span className="dot dot-leave" /> Leave: {attendanceData.leave}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY PROFILE */}
      {activeTab === 'profile' && (
        <div className="student-tab-pane">
          <div className="student-profile-card">
            <div className="profile-card-header">
              <div className="profile-big-avatar">
                {(profile.full_name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="profile-header-text">
                <h2>{profile.full_name}</h2>
                <span className="profile-role-tag">
                  <ShieldCheck size={14} /> Official Student Record
                </span>
              </div>
            </div>

            <div className="profile-details-grid">
              <div className="profile-field">
                <span className="field-label">Student ID</span>
                <strong className="field-value font-mono">
                  {profile.student_id || '—'}
                </strong>
              </div>

              <div className="profile-field">
                <span className="field-label">Full Name</span>
                <strong className="field-value">{profile.full_name || '—'}</strong>
              </div>

              <div className="profile-field">
                <span className="field-label">University Email</span>
                <strong className="field-value">{profile.email || '—'}</strong>
              </div>

              <div className="profile-field">
                <span className="field-label">Class / Section</span>
                <strong className="field-value">
                  {profile.class_name || 'Not assigned'}
                </strong>
              </div>

              <div className="profile-field">
                <span className="field-label">Academic Department</span>
                <strong className="field-value">
                  {profile.department || 'Not assigned'}
                </strong>
              </div>

              <div className="profile-field">
                <span className="field-label">Enrollment Year</span>
                <strong className="field-value">
                  {profile.enrollment_year || '—'}
                </strong>
              </div>

              <div className="profile-field">
                <span className="field-label">Academic Status</span>
                <strong className="field-value text-green">
                  Active / Good Standing
                </strong>
              </div>

              <div className="profile-field">
                <span className="field-label">Institutional Linkage</span>
                <strong className="field-value text-blue">
                  Verified Institutional Account
                </strong>
              </div>
            </div>

            <div className="profile-notice-box">
              <Info size={18} />
              <div>
                <strong>Official Academic Identity</strong>
                <p>
                  Your student profile is linked to your authenticated EduInsight account and
                  managed directly by university faculty. To update your name, email, or
                  enrolled department, please submit a formal request to the academic registrar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ASSESSMENTS */}
      {activeTab === 'assessments' && (
        <div className="student-tab-pane">
          <div className="student-table-panel">
            <div className="table-panel-header">
              <div>
                <h2>Assessment History</h2>
                <p>Complete record of graded academic evaluations</p>
              </div>

              {/* Filters toolbar */}
              <div className="table-toolbar">
                <div className="filter-group">
                  <label htmlFor="student-subject-filter">Subject:</label>
                  <select
                    id="student-subject-filter"
                    value={assessmentSubjectFilter}
                    onChange={(e) => setAssessmentSubjectFilter(e.target.value)}
                  >
                    <option value="ALL">All Subjects ({assessmentsData.items.length})</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label htmlFor="student-sort-filter">Sort:</label>
                  <select
                    id="student-sort-filter"
                    value={assessmentSortBy}
                    onChange={(e) => setAssessmentSortBy(e.target.value)}
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="score-desc">Highest Score</option>
                    <option value="score-asc">Lowest Score</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredAssessments.length === 0 ? (
              <div className="student-empty-state">
                <FileText size={32} />
                <h3>No assessments match your criteria</h3>
                <p>
                  {assessmentSubjectFilter !== 'ALL'
                    ? `No assessment records found for ${assessmentSubjectFilter}.`
                    : 'No assessment records have been submitted for your profile yet.'}
                </p>
              </div>
            ) : (
              <div className="student-data-table-wrap">
                <table className="student-data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Assessment Name</th>
                      <th>Score / Max</th>
                      <th>Percentage</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssessments.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-muted">
                          {formatDate(item.assessment_date)}
                        </td>
                        <td>
                          <strong className="table-subject-tag">{item.subject}</strong>
                        </td>
                        <td>{item.assessment_name}</td>
                        <td className="font-mono">
                          {item.score} <span className="text-muted">/ {item.max_marks}</span>
                        </td>
                        <td>
                          <span className={`table-badge ${getScoreBadgeClass(item.percentage)}`}>
                            {formatPercentage(item.percentage)}
                          </span>
                        </td>
                        <td className="text-secondary">
                          {item.notes || <span className="text-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="student-tab-pane">
          {/* Attendance KPI Cards */}
          <div className="student-metric-grid">
            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-green">
                <CheckCircle2 size={20} />
              </div>
              <span className="kpi-label">Attendance Percentage</span>
              <strong className="kpi-value">
                {formatPercentage(attendanceData.attendance_percentage)}
              </strong>
              <span className="kpi-sub">Official calculation</span>
            </article>

            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-green">
                <CheckCircle2 size={20} />
              </div>
              <span className="kpi-label">Present</span>
              <strong className="kpi-value">{attendanceData.present}</strong>
              <span className="kpi-sub">Classes attended</span>
            </article>

            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-amber">
                <XCircle size={20} />
              </div>
              <span className="kpi-label">Absent</span>
              <strong className="kpi-value">{attendanceData.absent}</strong>
              <span className="kpi-sub">Unapproved absences</span>
            </article>

            <article className="student-kpi-card">
              <div className="kpi-icon-wrap icon-blue">
                <Clock3 size={20} />
              </div>
              <span className="kpi-label">Approved Leave</span>
              <strong className="kpi-value">{attendanceData.leave}</strong>
              <span className="kpi-sub">Excused absences</span>
            </article>
          </div>

          {/* Mandatory Formula & Policy Explanation Banner */}
          <div className="attendance-formula-banner">
            <div className="formula-icon">
              <Info size={20} />
            </div>
            <div className="formula-text">
              <strong>Institutional Attendance Calculation Policy</strong>
              <p>
                Attendance is calculated as:{' '}
                <code>Present / (Present + Absent) × 100</code>.
                Approved leave records are formally excused and are excluded from the
                denominator so your attendance standing is not penalized.
              </p>
            </div>
          </div>

          <div className="student-table-panel">
            <div className="table-panel-header">
              <div>
                <h2>Attendance History</h2>
                <p>Chronological session logs recorded by faculty</p>
              </div>

              <div className="table-toolbar">
                <div className="filter-group">
                  <label htmlFor="attendance-status-filter">Status:</label>
                  <select
                    id="attendance-status-filter"
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  >
                    <option value="ALL">All Statuses ({attendanceData.items.length})</option>
                    <option value="Present">Present Only ({attendanceData.present})</option>
                    <option value="Absent">Absent Only ({attendanceData.absent})</option>
                    <option value="Leave">Leave Only ({attendanceData.leave})</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredAttendance.length === 0 ? (
              <div className="student-empty-state">
                <CalendarDays size={32} />
                <h3>No attendance records match your filter</h3>
                <p>
                  {attendanceStatusFilter !== 'ALL'
                    ? `No records marked as "${attendanceStatusFilter}".`
                    : 'No attendance records have been logged for your profile yet.'}
                </p>
              </div>
            ) : (
              <div className="student-data-table-wrap">
                <table className="student-data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Notes / Excuses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.map((item) => {
                      const badge = getStatusBadge(item.attendance_status)
                      const Icon = badge.icon
                      return (
                        <tr key={item.id}>
                          <td className="font-mono text-muted">
                            {formatDate(item.attendance_date)}
                          </td>
                          <td>
                            <span className={`attendance-status-badge ${badge.className}`}>
                              <Icon size={14} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="text-secondary">
                            {item.notes || <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ACADEMIC PROGRESS */}
      {activeTab === 'progress' && (
        <div className="student-tab-pane">
          <div className="student-table-panel">
            <div className="table-panel-header">
              <div>
                <h2>Academic Progress Explorer</h2>
                <p>
                  Track your assessment percentages and performance trajectory over time
                </p>
              </div>

              <div className="table-toolbar">
                <div className="filter-group">
                  <label htmlFor="progress-subject-filter">Filter Subject:</label>
                  <select
                    id="progress-subject-filter"
                    value={progressSubjectFilter}
                    onChange={(e) => setProgressSubjectFilter(e.target.value)}
                  >
                    <option value="ALL">All Subjects</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Trajectory Note */}
            {progressAssessments.length > 0 && progressAssessments.length < 3 && (
              <div className="progress-advisory-banner">
                <Info size={18} />
                <div>
                  <strong>Preliminary Trend Note</strong>
                  <p>
                    Two or fewer recorded assessments provide initial feedback, but 3 or
                    more assessments are recommended to discern a reliable academic
                    trajectory.
                  </p>
                </div>
              </div>
            )}

            {progressAssessments.length === 0 ? (
              <div className="student-empty-state">
                <BarChart3 size={36} />
                <h3>No assessment scores recorded</h3>
                <p>
                  Progress charts and chronological timelines will populate once assessments
                  are recorded by your instructors.
                </p>
              </div>
            ) : (
              <>
                <div className="progress-summary-strip">
                  <div className="strip-item">
                    <span>Evaluations</span>
                    <strong>{progressAssessments.length}</strong>
                  </div>
                  <div className="strip-item">
                    <span>Average Performance</span>
                    <strong>{formatPercentage(progressAverage)}</strong>
                  </div>
                  <div className="strip-item">
                    <span>Selected Scope</span>
                    <strong>{progressSubjectFilter === 'ALL' ? 'All Subjects' : progressSubjectFilter}</strong>
                  </div>
                </div>

                <div className="student-full-chart-wrap">
                  <MiniProgressChart assessments={progressAssessments} />
                </div>

                <div className="student-data-table-wrap">
                  <table className="student-data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Assessment</th>
                        <th>Score / Max</th>
                        <th>Percentage</th>
                        <th>Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressAssessments.map((item, index) => {
                        let change = null
                        if (index > 0) {
                          const prev = Number(progressAssessments[index - 1].percentage)
                          const curr = Number(item.percentage)
                          if (Number.isFinite(prev) && Number.isFinite(curr)) {
                            change = roundToTwo(curr - prev)
                          }
                        }

                        return (
                          <tr key={item.id || index}>
                            <td className="font-mono text-muted">{index + 1}</td>
                            <td className="font-mono text-muted">
                              {formatDate(item.assessment_date)}
                            </td>
                            <td>
                              <strong className="table-subject-tag">{item.subject}</strong>
                            </td>
                            <td>{item.assessment_name}</td>
                            <td className="font-mono">
                              {item.score}{' '}
                              <span className="text-muted">/ {item.max_marks}</span>
                            </td>
                            <td>
                              <span className={`table-badge ${getScoreBadgeClass(item.percentage)}`}>
                                {formatPercentage(item.percentage)}
                              </span>
                            </td>
                            <td>
                              {change == null ? (
                                <span className="text-muted">—</span>
                              ) : change > 0 ? (
                                <span className="trend-up">
                                  <TrendingUp size={14} /> +{change.toFixed(1)}%
                                </span>
                              ) : change < 0 ? (
                                <span className="trend-down">
                                  <TrendingDown size={14} /> {change.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted">0.0%</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
