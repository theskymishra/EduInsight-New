import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Activity,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Mail,
  RefreshCw,
  UserRound,
  AlertCircle,
  LoaderCircle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import {
  getStudent,
  getStudentAttendanceSummary,
  getStudentAssessments,
} from '../services/api'

function formatDate(value) {
  if (!value) return '—'

  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatPercentage(value) {
  return value == null ? '—' : `${Number(value).toFixed(2).replace(/\.00$/, '')}%`
}

function StudentDetail({ token, studentId, onBack }) {
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attendanceError, setAttendanceError] = useState('')
  const [assessmentError, setAssessmentError] = useState('')

  async function loadStudent() {
    setLoading(true)
    setError('')
    setAttendanceError('')
    setAssessmentError('')
    setAttendance(null)
    setAssessments([])

    try {
      const studentResult = await getStudent(token, studentId)
      setStudent(studentResult)

      if (studentResult.active === false) {
        setAttendanceError('Live attendance records are unavailable for inactive students.')
        setAssessmentError('Live assessment records are unavailable for inactive students.')
        return
      }

      const [attendanceResult, assessmentResult] = await Promise.allSettled([
        getStudentAttendanceSummary(token, studentId),
        getStudentAssessments(token, studentId),
      ])

      if (attendanceResult.status === 'fulfilled') {
        setAttendance(attendanceResult.value)
      } else {
        setAttendanceError(
          attendanceResult.reason?.message || 'Unable to load attendance records.',
        )
      }

      if (assessmentResult.status === 'fulfilled') {
        setAssessments(assessmentResult.value.items || [])
      } else {
        setAssessmentError(
          assessmentResult.reason?.message || 'Unable to load assessment records.',
        )
      }
    } catch (err) {
      setStudent(null)
      setError(err.message || 'Unable to load the student profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudent()
  }, [token, studentId])

  if (loading) {
    return (
      <section className="student-detail-state">
        <LoaderCircle className="student-spinner" size={28} />
        <p>Loading student profile and academic records...</p>
      </section>
    )
  }

  if (error || !student) {
    return (
      <section className="student-detail-state">
        <AlertCircle size={28} />
        <h2>Unable to load student report</h2>
        <p>{error || 'The requested student could not be found.'}</p>
        <div className="student-detail-state-actions">
          <button className="student-secondary-button" type="button" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to students
          </button>
          <button className="student-primary-button" type="button" onClick={loadStudent}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </section>
    )
  }

  const initials = (student.full_name || 'S')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const averagePercentage = assessments.length
    ? assessments.reduce((sum, item) => sum + Number(item.percentage || 0), 0) /
      assessments.length
    : null

  return (
    <section className="student-detail">
      <button className="student-detail-back" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        Back to students
      </button>

      <div className="student-detail-heading">
        <div>
          <div className="student-eyebrow">FACULTY WORKSPACE / STUDENTS</div>
          <h2>Student Profile</h2>
          <p>Enrollment, attendance, and assessment performance in one place.</p>
        </div>
        <button className="student-refresh-button" type="button" onClick={loadStudent}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <article className="student-profile-card">
        <div className="student-profile-banner" />

        <div className="student-profile-main">
          <div className="student-profile-avatar">{initials}</div>
          <div className="student-profile-identity">
            <h1>{student.full_name}</h1>
            <p>{student.student_id || 'Student ID not assigned'}</p>
            <span className={`student-status ${student.active ? 'student-status-active' : 'student-status-inactive'}`}>
              {student.active ? 'Active student' : 'Inactive student'}
            </span>
          </div>
        </div>

        <div className="student-profile-divider" />

        <div className="student-detail-section-heading">
          <div className="student-detail-section-icon"><UserRound size={19} /></div>
          <div>
            <h3>Personal information</h3>
            <p>Contact details associated with this student record.</p>
          </div>
        </div>

        <div className="student-detail-grid">
          <div className="student-detail-field">
            <span><Mail size={15} /> Email address</span>
            <strong>{student.email || 'Not provided'}</strong>
          </div>
          <div className="student-detail-field">
            <span><GraduationCap size={15} /> Student ID</span>
            <strong>{student.student_id || 'Not assigned'}</strong>
          </div>
        </div>

        <div className="student-profile-divider" />

        <div className="student-detail-section-heading">
          <div className="student-detail-section-icon"><BookOpen size={19} /></div>
          <div>
            <h3>Academic information</h3>
            <p>Current enrollment and department details.</p>
          </div>
        </div>

        <div className="student-detail-grid">
          <div className="student-detail-field">
            <span>Class / Section</span>
            <strong>{student.class_name || 'Not provided'}</strong>
          </div>
          <div className="student-detail-field">
            <span>Department</span>
            <strong>{student.department || 'Not provided'}</strong>
          </div>
          <div className="student-detail-field">
            <span><CalendarDays size={15} /> Enrollment year</span>
            <strong>{student.enrollment_year || 'Not provided'}</strong>
          </div>
          <div className="student-detail-field">
            <span><ShieldCheck size={15} /> Account status</span>
            <strong>{student.active ? 'Active' : 'Inactive'}</strong>
          </div>
        </div>
      </article>

      <section className="student-report-section">
        <div className="student-report-heading">
          <div>
            <div className="student-eyebrow">ACADEMIC OVERVIEW</div>
            <h3>Performance summary</h3>
            <p>Calculated from this student's live EduInsight records.</p>
          </div>
        </div>

        <div className="student-report-kpis">
          <article className="student-report-kpi">
            <span className="student-report-kpi-icon"><TrendingUp size={19} /></span>
            <span>Average assessment</span>
            <strong>{assessmentError ? 'Unavailable' : formatPercentage(averagePercentage)}</strong>
            <small>
              {assessmentError
                ? 'Assessment data could not be loaded'
                : `${assessments.length} assessment${assessments.length === 1 ? '' : 's'}`}
            </small>
          </article>

          <article className="student-report-kpi">
            <span className="student-report-kpi-icon"><Activity size={19} /></span>
            <span>Attendance rate</span>
            <strong>{attendanceError ? 'Unavailable' : formatPercentage(attendance?.attendance_percentage)}</strong>
            <small>
              {attendanceError
                ? 'Attendance data could not be loaded'
                : `${attendance?.total_records ?? 0} attendance records`}
            </small>
          </article>

          <article className="student-report-kpi">
            <span className="student-report-kpi-icon"><CalendarDays size={19} /></span>
            <span>Present</span>
            <strong>{attendanceError ? '—' : attendance?.present ?? 0}</strong>
            <small>
              {attendanceError
                ? 'Attendance data unavailable'
                : `${attendance?.absent ?? 0} absent · ${attendance?.leave ?? 0} leave`}
            </small>
          </article>
        </div>
        {attendanceError && (
          <div className="student-report-empty" role="alert">
            <AlertCircle size={22} />
            <strong>Unable to load attendance details</strong>
            <p>{attendanceError}</p>
          </div>
        )}
      </section>

      <section className="student-report-section">
        <div className="student-report-heading">
          <div>
            <h3><ClipboardList size={19} /> Assessment history</h3>
            <p>Most recent assessments appear first.</p>
          </div>
          <span className="student-report-count">
            {assessments.length} {assessments.length === 1 ? 'assessment' : 'assessments'}
          </span>
        </div>

        {assessmentError ? (
          <div className="student-report-empty" role="alert">
            <AlertCircle size={22} />
            <strong>Unable to load assessment history</strong>
            <p>{assessmentError}</p>
          </div>
        ) : assessments.length ? (
          <div className="student-report-table-wrap">
            <table className="student-report-table">
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
                {assessments.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.assessment_date)}</td>
                    <td>{item.assessment_name}</td>
                    <td>{item.subject}</td>
                    <td>{item.score} / {item.max_marks}</td>
                    <td>
                      <span className="student-report-percentage">
                        {formatPercentage(item.percentage)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="student-report-empty">
            <ClipboardList size={22} />
            <strong>No assessments recorded</strong>
            <p>Assessment results will appear here after faculty records them.</p>
          </div>
        )}
      </section>

      <div className="student-detail-note">
        <ShieldCheck size={18} />
        <p>
          Attendance percentage is based on present days divided by present plus absent days;
          leave is excluded. Average assessment percentage is the unweighted mean of recorded
          assessment percentages. Historical research risk scores are not included in this live report.
        </p>
      </div>
    </section>
  )
}

export default StudentDetail
