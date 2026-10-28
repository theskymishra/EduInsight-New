
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Mail,
  RefreshCw,
  UserRound,
  AlertCircle,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { getStudent } from '../services/api'

function StudentDetail({ token, studentId, onBack }) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadStudent() {
    setLoading(true)
    setError('')

    try {
      const result = await getStudent(token, studentId)
      setStudent(result)
    } catch (err) {
      setError(err.message || 'Unable to load this student profile.')
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
        <p>Loading student profile...</p>
      </section>
    )
  }

  if (error || !student) {
    return (
      <section className="student-detail-state">
        <AlertCircle size={28} />
        <h2>Unable to load student</h2>
        <p>{error || 'The requested student could not be found.'}</p>
        <div className="student-detail-state-actions">
          <button
            className="student-secondary-button"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            Back to students
          </button>
          <button
            className="student-primary-button"
            type="button"
            onClick={loadStudent}
          >
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

  return (
    <section className="student-detail">
      <button
        className="student-detail-back"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back to students
      </button>

      <div className="student-detail-heading">
        <div>
          <div className="student-eyebrow">FACULTY WORKSPACE / STUDENTS</div>
          <h2>Student Profile</h2>
          <p>View enrollment information and student account details.</p>
        </div>
        <button
          className="student-refresh-button"
          type="button"
          onClick={loadStudent}
        >
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
            <span
              className={`student-status ${
                student.active
                  ? 'student-status-active'
                  : 'student-status-inactive'
              }`}
            >
              {student.active ? 'Active student' : 'Inactive student'}
            </span>
          </div>
        </div>

        <div className="student-profile-divider" />

        <div className="student-detail-section-heading">
          <div className="student-detail-section-icon">
            <UserRound size={19} />
          </div>
          <div>
            <h3>Personal information</h3>
            <p>Contact details associated with this student record.</p>
          </div>
        </div>

        <div className="student-detail-grid">
          <div className="student-detail-field">
            <span>
              <Mail size={15} />
              Email address
            </span>
            <strong>{student.email || 'Not provided'}</strong>
          </div>

          <div className="student-detail-field">
            <span>
              <GraduationCap size={15} />
              Student ID
            </span>
            <strong>{student.student_id || 'Not assigned'}</strong>
          </div>
        </div>

        <div className="student-profile-divider" />

        <div className="student-detail-section-heading">
          <div className="student-detail-section-icon">
            <BookOpen size={19} />
          </div>
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
            <span>
              <CalendarDays size={15} />
              Enrollment year
            </span>
            <strong>{student.enrollment_year || 'Not provided'}</strong>
          </div>

          <div className="student-detail-field">
            <span>
              <ShieldCheck size={15} />
              Account status
            </span>
            <strong>{student.active ? 'Active' : 'Inactive'}</strong>
          </div>
        </div>
      </article>

      <div className="student-detail-note">
        <ShieldCheck size={18} />
        <p>
          This profile displays information currently stored in EduInsight.
          Attendance, marks, and performance trends can be connected when
          those records are available.
        </p>
      </div>
    </section>
  )
}

export default StudentDetail
