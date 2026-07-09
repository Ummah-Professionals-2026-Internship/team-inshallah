import { useState } from 'react';
import './forms.css';
import logo from './assets/Brand Kit/Logos/PNGs/horizontal blue.png';
import bg from './assets/Brand Kit/careerprep-bg.png';

const REGIONS = ['+1', '+44', '+92', '+971', '+966', '+20', '+234'];

export default function StudentForm() {
  const [form, setForm] = useState({
    name: '',
    phoneRegion: '+1',
    phone: '',
    gender: '',
    industry: '',
    major: '',
    desiredCareer: '',
    currentJob: '',
    academicStanding: '',
    hearAbout: '',
    resume: null,
    otherInfoText: '',
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Name is required.'
    }
    else if (!/^[a-zA-Z\s'-]+$/.test(form.name.trim())) {
      errors.name = 'Name can only contain letters, spaces, hyphens, and apostrophes.';
    }
    if (!form.phone.trim()) {
      errors.phone = 'Phone number is required.';
    }
    else if (!/^\d{7,15}$/.test(form.phone.replace(/[\s\-()]/g, ''))) {
      errors.phone = 'Please enter a valid phone number (digits only).';
    }
    if (!form.gender) errors.gender = 'Please select a gender.';
    if (!form.industry) errors.industry = 'Please select an industry.';
    if (!form.major.trim()) errors.major = 'Major is required.';
    if (!form.desiredCareer.trim()) errors.desiredCareer = 'Desired career is required.';
    if (!form.academicStanding) errors.academicStanding = 'Please select your academic standing.';
    if (!form.resume) {
      errors.resume = 'Please upload your résumé.';
    }
    else {
      const okTypes = ['.pdf', '.doc', '.docx'];
      const name = form.resume.name.toLowerCase();
      if (!okTypes.some(ext => name.endsWith(ext))) {
        errors.resume = 'Résumé must be a PDF or Word document.';
      }
    }
    if (!form.hearAbout) errors.hearAbout = 'Please select how you heard about us.';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setStatus('submitting');

    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phoneRegion + form.phone);
      fd.append('gender', form.gender);
      fd.append('industry', form.industry);
      fd.append('major', form.major);
      fd.append('desiredFutureCareer', form.desiredCareer);
      fd.append('currentJob', form.currentJob);
      fd.append('academicStanding', form.academicStanding);
      fd.append('hearAboutService', form.hearAbout);
      fd.append('otherInformation', form.otherInfoText);
      fd.append('resume', form.resume);

      const res = await fetch('/api/student', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: fd,
      });


      if (!res.ok) throw new Error('Submission failed.');

      setStatus('success');
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <div className="page-background" style={{ backgroundImage: `url(${bg})` }}>
      <div className="form-container">
        <form onSubmit={handleSubmit}>

          <img src={logo} alt="Ummah Professionals" style={{ width: '150px' }} />
          <h1>Career Prep Services</h1>
          <h2>Student Form</h2>

          {/* Name */}
          <label>Name <span className="required">*</span></label>
          <input name="name" value={form.name} onChange={handleChange} />
          {errors.name && <p className="error-msg">{errors.name}</p>}

          {/* Phone */}
          <label>Phone Number <span className="required">*</span></label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select name="phoneRegion" value={form.phoneRegion} onChange={handleChange}>
              {REGIONS.map(r => <option key={r}>{r}</option>)}
            </select>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          {errors.phone && <p className="error-msg">{errors.phone}</p>}

          {/* Gender */}
          <label>Gender <span className="required">*</span></label>
          <div className="gender-toggle">
            <button
              type="button"
              className={form.gender === 'Brother' ? 'active' : ''}
              onClick={() => setForm({ ...form, gender: 'Brother' })}
            >
              Brother
            </button>
            <button
              type="button"
              className={form.gender === 'Sister' ? 'active' : ''}
              onClick={() => setForm({ ...form, gender: 'Sister' })}
            >
              Sister
            </button>
          </div>
          {errors.gender && <p className="error-msg">{errors.gender}</p>}

          {/* Industry */}
          <label>Industry <span className="required">*</span></label>
          <select name="industry" value={form.industry} onChange={handleChange}>
            <option value="">Select industry</option>
            <option>Technology</option>
            <option>Finance</option>
            <option>Healthcare</option>
            <option>Law</option>
            <option>Engineering</option>
            <option>Education</option>
            <option>Business</option>
            <option>Other</option>
          </select>
          {errors.industry && <p className="error-msg">{errors.industry}</p>}

          {/* Major */}
          <label>Major <span className="required">*</span></label>
          <input name="major" value={form.major} onChange={handleChange} />
          {errors.major && <p className="error-msg">{errors.major}</p>}

          {/* Desired Career */}
          <label>Desired Future Career <span className="required">*</span></label>
          <input name="desiredCareer" value={form.desiredCareer} onChange={handleChange} />
          {errors.desiredCareer && <p className="error-msg">{errors.desiredCareer}</p>}

          {/* Current Job */}
          <label>Current Job (if applicable)</label>
          <input name="currentJob" value={form.currentJob} onChange={handleChange} />

          {/* Academic Standing */}
          <label>Academic Standing <span className="required">*</span></label>
          <select name="academicStanding" value={form.academicStanding} onChange={handleChange}>
            <option value="">Select</option>
            <option>Freshman</option>
            <option>Sophomore</option>
            <option>Junior</option>
            <option>Senior</option>
            <option>Graduate Student</option>
            <option>Recent Graduate</option>
          </select>
          {errors.academicStanding && <p className="error-msg">{errors.academicStanding}</p>}

          {/* Resume */}
          <label>Résumé <span className="required">*</span></label>
          <div className="resume-drop">
            <input
              type="file"
              name="resume"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setForm({ ...form, resume: e.target.files[0] })}
            />
            {form.resume ? (
              <>
                <p style={{ color: 'green', fontWeight: 'bold' }}>✅ {form.resume.name}</p>
                <p className="resume-hint">Click to change file</p>
              </>
            ) : (
              <>
                <p>Click to upload or drag and drop</p>
                <p className="resume-hint">PDF or Word (.doc, .docx)</p>
              </>
            )}            </div>

          {/* How did you hear */}
          <label>How did you hear about us? <span className="required">*</span></label>
          <select name="hearAbout" value={form.hearAbout} onChange={handleChange}>
            <option value="">Select</option>
            <option>Word of Mouth</option>
            <option>Friend or family member</option>
            <option>My MSA</option>
            <option>Campus flyer or event</option>
            <option>LinkedIn</option>
            <option>Instagram</option>
            <option>Other</option>
          </select>
          {errors.hearAbout && <p className="error-msg">{errors.hearAbout}</p>}

          {/* Other Info */}
          <div className="other-info">
            <div>
              <h3>Other Information</h3>
              <p>Any additional information you'd like to share (optional)</p>
            </div>
          </div>
          <textarea
            name="otherInfoText"
            value={form.otherInfoText}
            onChange={handleChange}
            placeholder="Share any additional information here..."
            rows={4}
          />

          {/* Status messages */}
          {status === 'success' && (
            <p className="success-msg">Your form has been submitted successfully!</p>
          )}
          {status === 'error' && (
            <p className="error-msg">Something went wrong. Please try again.</p>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? 'Submitting...' : 'Submit'}
          </button>

        </form>
      </div>
    </div>
  );
}