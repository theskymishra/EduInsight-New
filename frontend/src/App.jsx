
import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Clock3,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Users,
} from 'lucide-react'
import { getFacultyDashboard, login } from './services/api'
import './App.css'
import StudentManagement from './components/StudentManagement'
import AttendanceManagement from './components/AttendanceManagement'
import StudentDetail from './components/StudentDetail'
import AssessmentManagement from './components/AssessmentManagement'
import PerformanceAnalytics from './components/PerformanceAnalytics'
import StudentInterventions from './components/StudentInterventions'

function Brand({ light = false }) {
  return (
    <div className={light ? 'brand' : 'mobile-brand'}>
      <div className={light ? 'brand-mark' : 'mobile-brand-mark'}>
        <GraduationCap size={23} />
      </div>
      <span>
        Edu<span className={light ? 'brand-light' : ''}>Insight</span>
      </span>
    </div>
  )
}

function LoginPage({ onLogin, sessionMessage }) {
  const [role, setRole] = useState('faculty')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(sessionMessage || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login({ email: email.trim(), password })

      if (result.user.role !== role) {
        throw new Error(
          `This account is registered as ${result.user.role}. Select the matching account type.`,
        )
      }

      onLogin(result)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="visual-panel">
        <Brand light />

        <div className="visual-content">
          <div className="eyebrow">
            <Sparkles size={14} />
            THE FUTURE OF ACADEMIC INSIGHT
          </div>

          <h1>
            Every student.
            <br />
            Every possibility.
            <br />
            <span>Clearly understood.</span>
          </h1>

          <p className="visual-description">
            Turn academic data into meaningful insights. Understand progress,
            discover opportunities, and help every learner move forward.
          </p>

          <div className="insight-card">
            <div className="insight-heading">
              <div>
                <span className="mini-label">THE EDUINSIGHT APPROACH</span>
                <h3>See beyond the grades.</h3>
              </div>
              <div className="insight-icon">
                <Activity size={20} />
              </div>
            </div>

            <div className="feature-row">
              <div className="feature-icon blue">
                <BarChart3 size={18} />
              </div>
              <div>
                <strong>Meaningful analytics</strong>
                <span>Understand performance patterns</span>
              </div>
              <CheckCircle2 size={17} className="feature-check" />
            </div>

            <div className="feature-row">
              <div className="feature-icon violet">
                <Users size={18} />
              </div>
              <div>
                <strong>Student-centred insights</strong>
                <span>Make progress easier to understand</span>
              </div>
              <CheckCircle2 size={17} className="feature-check" />
            </div>

            <div className="feature-row">
              <div className="feature-icon green">
                <ShieldCheck size={18} />
              </div>
              <div>
                <strong>Responsible data access</strong>
                <span>Respect every student's privacy</span>
              </div>
              <CheckCircle2 size={17} className="feature-check" />
            </div>
          </div>
        </div>

        <footer className="visual-footer">
          <span>INSIGHT THAT INSPIRES PROGRESS</span>
          <span>EDUINSIGHT © 2026</span>
        </footer>
      </section>

      <section className="form-panel">
        <div className="form-topline">
          <Brand />
          <span className="secure-label">
            <LockKeyhole size={13} /> SECURE ACCESS
          </span>
        </div>

        <div className="login-content">
          <div className="welcome-icon">
            <BookOpen size={25} />
          </div>
          <p className="form-kicker">YOUR ACADEMIC WORKSPACE</p>
          <h2>
            Welcome back<span>.</span>
          </h2>
          <p className="form-description">
            Sign in to continue to your EduInsight workspace.
          </p>

          <div className="role-switch" aria-label="Choose account type">
            <button
              type="button"
              className={
                role === 'faculty' ? 'role-option active' : 'role-option'
              }
              onClick={() => {
                setRole('faculty')
                setError('')
              }}
              aria-pressed={role === 'faculty'}
            >
              <Users size={17} /> Faculty
            </button>
            <button
              type="button"
              className={
                role === 'student' ? 'role-option active' : 'role-option'
              }
              onClick={() => {
                setRole('student')
                setError('')
              }}
              aria-pressed={role === 'student'}
            >
              <GraduationCap size={18} /> Student
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <div className="input-wrap">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@university.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <LockKeyhole size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="visibility-button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              className="submit-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Signing in…'
                : `Sign in as ${role === 'faculty' ? 'Faculty' : 'Student'}`}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {error && (
            <div className="status-message error-message" role="alert">
              {error}
            </div>
          )}

          <div className="login-note">
            <ShieldCheck size={17} />
            <span>
              Your academic workspace is designed with privacy in mind.
            </span>
          </div>
        </div>

        <footer className="form-footer">
          <span>EDUINSIGHT</span>
          <span>Learn more. See clearly. Do better.</span>
        </footer>
      </section>
    </main>
  )
}

function MetricCard({ label, value, detail, icon: Icon, tone }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>
        <Icon size={20} />
      </div>
      <p>{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  )
}

function FacultyDashboard({ token }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const result = await getFacultyDashboard(token, 'mathematics')
        if (active) setData(result)
      } catch (err) {
        if (active) setError(err.message || 'Unable to load analytics.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [token, refreshKey])

  if (loading && !data) {
    return (
      <div className="dashboard-state" role="status">
        <div className="loading-spinner" />
        <h2>Preparing your analytics</h2>
        <p>
          Connecting to EduInsight and retrieving academic statistics.
        </p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="dashboard-state dashboard-error" role="alert">
        <AlertTriangle size={28} />
        <h2>Analytics couldn't be loaded</h2>
        <p>{error}</p>
        <button
          className="dashboard-primary-button"
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    )
  }

  const gradeData = data?.grade_distribution ?? []
  const studyData = data?.study_time_summary ?? []
  const maxGradeCount = Math.max(1, ...gradeData.map((item) => item.count))
  const studyLabels = {
    1: 'Less than 2 hours',
    2: '2–5 hours',
    3: '5–10 hours',
    4: 'More than 10 hours',
  }

  return (
    <div className="faculty-dashboard">
      <div className="dashboard-heading">
        <div>
          <div className="workspace-eyebrow">
            <CheckCircle2 size={15} /> FACULTY ANALYTICS
          </div>
          <h2>Academic overview</h2>
          <p>
            Explore student performance patterns and learning indicators.
          </p>
        </div>
        <button
          className="refresh-button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'refreshing' : ''} />
          Refresh data
        </button>
      </div>

      {error && (
        <div className="dashboard-inline-error" role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="dataset-toolbar">
        <div>
          <span className="toolbar-label">SUBJECT</span>
          <strong>Mathematics</strong>
        </div>
        <span className="dataset-status">
          <span className="status-dot" /> Dataset connected
        </span>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Student records"
          value={data.total_records.toLocaleString()}
          detail="Historical research records"
          icon={Users}
          tone="metric-blue"
        />
        <MetricCard
          label="Average final grade"
          value={`${data.average_grades.G3.toFixed(2)} / 20`}
          detail={`G1: ${data.average_grades.G1.toFixed(2)} · G2: ${data.average_grades.G2.toFixed(2)}`}
          icon={TrendingUp}
          tone="metric-violet"
        />
        <MetricCard
          label="Passing records"
          value={data.passing_count.toLocaleString()}
          detail="Final grade of 10 or higher"
          icon={CheckCircle2}
          tone="metric-green"
        />
        <MetricCard
          label="At-risk records"
          value={data.at_risk_count.toLocaleString()}
          detail="Final grade below 10"
          icon={AlertTriangle}
          tone="metric-amber"
        />
      </div>

      <div className="dashboard-secondary-metrics">
        <div>
          <span>
            <CalendarDays size={16} /> Average absences
          </span>
          <strong>{data.average_absences.toFixed(2)}</strong>
          <small>Absences per record</small>
        </div>
        <div>
          <span>
            <Activity size={16} /> Passing share
          </span>
          <strong>
            {data.total_records
              ? `${((data.passing_count / data.total_records) * 100).toFixed(1)}%`
              : '—'}
          </strong>
          <small>Of all records in this dataset</small>
        </div>
        <div>
          <span>
            <Clock3 size={16} /> Study-time groups
          </span>
          <strong>{studyData.length}</strong>
          <small>Reported weekly study categories</small>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="analytics-panel grade-panel">
          <div className="panel-heading">
            <div>
              <h3>Final-grade distribution</h3>
              <p>Number of records at each G3 grade</p>
            </div>
            <span className="chart-unit">COUNT</span>
          </div>

          <div
            className="grade-chart"
            role="img"
            aria-label="Bar chart showing the count of records at each final grade"
          >
            {gradeData.map((item) => (
              <div className="grade-column" key={item.grade}>
                <span className="grade-count">{item.count}</span>
                <div className="grade-bar-track">
                  <div
                    className={`grade-bar ${item.grade < 10 ? 'grade-bar-risk' : ''}`}
                    style={{
                      height: `${Math.max(2, (item.count / maxGradeCount) * 100)}%`,
                    }}
                    title={`Grade ${item.grade}: ${item.count} records`}
                  />
                </div>
                <span className="grade-label">{item.grade}</span>
              </div>
            ))}
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-swatch legend-risk" /> Below 10
            </span>
            <span>
              <i className="legend-swatch legend-pass" /> 10 and above
            </span>
          </div>
        </section>

        <section className="analytics-panel study-panel">
          <div className="panel-heading">
            <div>
              <h3>Study time and grades</h3>
              <p>Average final grade by weekly study time</p>
            </div>
          </div>

          <div className="study-chart">
            {studyData.map((item) => (
              <div className="study-row" key={item.study_time_category}>
                <div className="study-row-heading">
                  <span>
                    {studyLabels[item.study_time_category] ??
                      `Category ${item.study_time_category}`}
                  </span>
                  <strong>{item.average_final_grade.toFixed(2)}</strong>
                </div>
                <div
                  className="study-bar-track"
                  role="img"
                  aria-label={`${studyLabels[item.study_time_category] ?? 'Study category'}: average grade ${item.average_final_grade.toFixed(2)} out of 20`}
                >
                  <div
                    className="study-bar"
                    style={{
                      width: `${(item.average_final_grade / 20) * 100}%`,
                    }}
                  />
                </div>
                <span className="study-student-count">
                  {item.students} records
                </span>
              </div>
            ))}
          </div>

          <p className="chart-footnote">
            These are observational group averages, not evidence that study
            time alone causes higher grades.
          </p>
        </section>
      </div>

      <div className="dataset-disclaimer">
        <ShieldCheck size={19} />
        <div>
          <strong>About this dataset</strong>
          <p>
            {data.data_note} The at-risk threshold is a project-defined
            indicator, not a formal diagnosis or prediction about an individual.
          </p>
        </div>
      </div>
    </div>
  )
}

function Workspace({ user, token, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview')
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const isFaculty = user?.role === 'faculty'

  function openStudents() {
    setSelectedStudentId(null)
    setActiveSection('students')
  }

  function openStudentDetail(studentId) {
    setSelectedStudentId(studentId)
    setActiveSection('student-detail')
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div className="workspace-brand">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <div>
            <strong>EduInsight</strong>
            <span>Academic Intelligence Platform</span>
          </div>
        </div>

        <div className="workspace-header-actions">
          <div className="workspace-user">
            <div className="workspace-user-avatar">
              {(user?.full_name || user?.name || user?.email || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>
            <div>
              <strong>{user?.full_name || user?.name || 'User'}</strong>
              <span>{user?.role || 'Student'}</span>
            </div>
          </div>

          <button
            className="workspace-logout"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </header>

      {isFaculty && (
        <nav className="workspace-navigation" aria-label="Faculty navigation">
          <button
            type="button"
            className={
              activeSection === 'overview'
                ? 'workspace-nav-link active'
                : 'workspace-nav-link'
            }
            onClick={() => {
              setSelectedStudentId(null)
              setActiveSection('overview')
            }}
          >
            <BarChart3 size={17} />
            Overview
          </button>

          <button
            type="button"
            className={
              activeSection === 'students' ||
              activeSection === 'student-detail'
                ? 'workspace-nav-link active'
                : 'workspace-nav-link'
            }
            onClick={openStudents}
          >
            <Users size={17} />
            Students
          </button>

          <button
            type="button"
            className={
              activeSection === 'attendance'
                ? 'workspace-nav-link active'
                : 'workspace-nav-link'
            }
            onClick={() => {
              setSelectedStudentId(null)
              setActiveSection('attendance')
            }}
          >
            <CalendarDays size={17} />
            Attendance
          </button>

          <button
            type="button"
            className={
              activeSection === 'assessments'
                ? 'workspace-nav-link active'
                : 'workspace-nav-link'
            }
            onClick={() => {
              setSelectedStudentId(null)
              setActiveSection('assessments')
            }}
          >
            <ClipboardList size={17} />
            Assessments
          </button>

          <button
            type="button"
            className={
              activeSection === 'analytics'
                ? 'workspace-nav-link active'
                : 'workspace-nav-link'
            }
            onClick={() => {
              setSelectedStudentId(null)
              setActiveSection('analytics')
            }}
          >
            <TrendingUp size={17} />
            Performance Analytics
          </button>
          <button
            type="button"
            className={
              activeSection === 'interventions'
                ? 'workspace-nav-link active'
                : 'workspace-nav-link'
            }
            onClick={() => {
              setSelectedStudentId(null)
              setActiveSection('interventions')
            }}
          >
            <ClipboardList size={17} />
            Student Interventions
          </button>
        </nav>
      )}

      <main className="workspace-content">
        {isFaculty ? (
          activeSection === 'student-detail' ? (
            selectedStudentId ? (
              <StudentDetail
                token={token}
                studentId={selectedStudentId}
                onBack={openStudents}
              />
            ) : (
              <section className="student-detail-state" role="alert">
                <h2>Student profile could not be opened</h2>
                <p>
                  The selected student did not provide a profile ID. Return to
                  the student list and try again.
                </p>
                <div className="student-detail-state-actions">
                  <button
                    type="button"
                    className="dashboard-primary-button"
                    onClick={openStudents}
                  >
                    Back to students
                  </button>
                </div>
              </section>
            )
          ) : activeSection === 'students' ? (
            <StudentManagement
              token={token}
              onViewStudent={openStudentDetail}
            />
          ) : activeSection === 'attendance' ? (
            <AttendanceManagement token={token} />
          ) : activeSection === 'assessments' ? (
            <AssessmentManagement token={token} />
          ) : activeSection === 'analytics' ? (
            <PerformanceAnalytics token={token} />
          ) : activeSection === 'interventions' ? (
            <StudentInterventions token={token} />
          ) : (
            <FacultyDashboard token={token} />
          )
        ) : (
          <section className="student-welcome">
            <div className="student-eyebrow">STUDENT WORKSPACE</div>
            <h1>Welcome to EduInsight</h1>
            <p>Your personalized academic workspace is being prepared.</p>
          </section>
        )}
      </main>
    </div>
  )
}

export default function App() {
  const [sessionMessage, setSessionMessage] = useState('')
  const [session, setSession] = useState(() => {
    try {
      const token = sessionStorage.getItem('eduinsight_token')
      const user = sessionStorage.getItem('eduinsight_user')
      return token && user ? { token, user: JSON.parse(user) } : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    function handleSessionExpired() {
      sessionStorage.removeItem('eduinsight_token')
      sessionStorage.removeItem('eduinsight_user')
      setSession(null)
      setSessionMessage('Your session has expired. Please sign in again.')
    }

    window.addEventListener('eduinsight:session-expired', handleSessionExpired)

    return () => {
      window.removeEventListener(
        'eduinsight:session-expired',
        handleSessionExpired,
      )
    }
  }, [])

  function handleLogin(result) {
    setSessionMessage('')
    try {
      sessionStorage.setItem('eduinsight_token', result.access_token)
      sessionStorage.setItem('eduinsight_user', JSON.stringify(result.user))
      setSession({ token: result.access_token, user: result.user })
    } catch {
      setSession({ token: result.access_token, user: result.user })
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('eduinsight_token')
    sessionStorage.removeItem('eduinsight_user')
    setSessionMessage('')
    setSession(null)
  }

  if (session) {
    return (
      <Workspace
        user={session.user}
        token={session.token}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      sessionMessage={sessionMessage}
    />
  )
}
