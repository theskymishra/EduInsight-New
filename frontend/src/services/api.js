
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

function expireSession() {
  sessionStorage.removeItem('eduinsight_token')
  sessionStorage.removeItem('eduinsight_user')

  window.dispatchEvent(new Event('eduinsight:session-expired'))
}

async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw new Error(
      'Unable to reach EduInsight. Check that the backend is running.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      const isAuthenticatedRequest =
        Boolean(options.headers?.Authorization)

      if (isAuthenticatedRequest) {
        expireSession()
        throw new Error(
          'Your session has expired. Please sign in again.',
        )
      }

      throw new Error(data.detail || 'Invalid email or password.')
    }

    if (response.status === 403) {
      throw new Error(
        'You do not have permission to access this resource.',
      )
    }

    throw new Error(
      data.detail || 'Unable to load data. Please try again.',
    )
  }

  return data
}

export async function login({ email, password }) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!data.access_token || !data.user?.id || !data.user?.role) {
    throw new Error('The server returned an invalid login response.')
  }

  return data
}

export async function getFacultyDashboard(token, subject = 'mathematics') {
  if (!token) {
    throw new Error('Please sign in to view faculty analytics.')
  }

  return request(
    `/api/faculty/dashboard?subject=${encodeURIComponent(subject)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}

export async function getStudents(
  token,
  { search = '', page = 1, pageSize = 10 } = {},
) {
  if (!token) {
    throw new Error('Please sign in to manage students.')
  }

  const params = new URLSearchParams({
    search,
    page: String(page),
    page_size: String(pageSize),
  })

  return request(`/api/students?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createStudent(token, student) {
  if (!token) {
    throw new Error('Please sign in to manage students.')
  }

  return request('/api/students', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(student),
  })
}

export async function updateStudent(token, id, changes) {
  if (!token) {
    throw new Error('Please sign in to manage students.')
  }

  return request(`/api/students/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(changes),
  })
}

export async function deactivateStudent(token, id) {
  if (!token) {
    throw new Error('Please sign in to manage students.')
  }

  return request(`/api/students/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getStudent(token, id) {
  if (!token) {
    throw new Error('Please sign in to view student details.')
  }

  return request(`/api/students/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}



export async function recordAttendance(token, studentId, attendance) {
  if (!token) {
    throw new Error('Please sign in to record attendance.')
  }

  return request(
    `/api/students/${encodeURIComponent(studentId)}/attendance`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(attendance),
    },
  )
}

export async function getStudentAttendance(
  token,
  studentId,
  { status, startDate, endDate } = {},
) {
  if (!token) {
    throw new Error('Please sign in to view attendance.')
  }

  const params = new URLSearchParams()

  if (status) params.set('status', status)
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const query = params.toString()

  return request(
    `/api/students/${encodeURIComponent(studentId)}/attendance${query ? `?${query}` : ''}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}

export async function getStudentAttendanceSummary(token, studentId) {
  if (!token) {
    throw new Error('Please sign in to view attendance analytics.')
  }

  return request(
    `/api/students/${encodeURIComponent(studentId)}/attendance/summary`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}



export async function recordAssessment(token, studentId, assessment) {
  if (!token) {
    throw new Error('Please sign in to record an assessment.')
  }

  return request(
    `/api/students/${encodeURIComponent(studentId)}/assessments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(assessment),
    },
  )
}

export async function getStudentAssessments(
  token,
  studentId,
  subject = '',
) {
  if (!token) {
    throw new Error('Please sign in to view assessments.')
  }

  const params = new URLSearchParams()

  if (subject.trim()) {
    params.set('subject', subject.trim())
  }

  const query = params.toString()

  return request(
    `/api/students/${encodeURIComponent(studentId)}/assessments${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}


export async function getPerformanceAnalytics(token) {
  if (!token) {
    throw new Error('Please sign in to view performance analytics.')
  }

  return request('/api/analytics/performance', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getInterventions(
  token,
  { studentProfileId = '', status = '' } = {},
) {
  if (!token) {
    throw new Error('Please sign in to manage student interventions.')
  }

  const params = new URLSearchParams()
  if (studentProfileId) {
    params.set('student_profile_id', studentProfileId)
  }
  if (status) {
    params.set('status', status)
  }

  const query = params.toString()

  return request(`/api/interventions${query ? `?${query}` : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function createIntervention(token, intervention) {
  if (!token) {
    throw new Error('Please sign in to manage student interventions.')
  }

  return request('/api/interventions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(intervention),
  })
}

export async function updateIntervention(token, id, changes) {
  if (!token) {
    throw new Error('Please sign in to manage student interventions.')
  }

  return request(`/api/interventions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(changes),
  })
}

export async function getStudentPortalDashboard(token) {
  if (!token) {
    throw new Error('Please sign in to view your student workspace.')
  }

  return request('/api/student-portal/dashboard', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}
